import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  MapPin,
  Store,
  Star,
  X,
  Navigation,
  AlertCircle,
  RefreshCw,
  Scissors,
  Utensils,
  ShieldCheck,
  Search,
  Clock,
  LocateFixed,
  ChevronRight,
} from 'lucide-react';
import { collection, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { firestore as db } from '../../firebase'; // Adjust this import to match your Firebase config path

// ==========================================
// TYPES & INTERFACES
// ==========================================

interface DayHours {
  open: string; // "HH:MM" 24-hour format, e.g. "09:00"
  close: string; // "HH:MM" 24-hour format, e.g. "21:30"
}

export interface BusinessHours {
  sun?: DayHours;
  mon?: DayHours;
  tue?: DayHours;
  wed?: DayHours;
  thu?: DayHours;
  fri?: DayHours;
  sat?: DayHours;
}

export interface BusinessProfile {
  id: string;
  brandName: string;
  address: string;
  bio: string;
  rating: number;
  category: 'restaurant' | 'salon' | string;
  latitude: number;
  longitude: number;
  logo?: string;
  verified?: boolean;
  distanceKm?: number;
  hours?: BusinessHours;
  vinLink?: string;
  // Radar visual positioning coordinates
  radarX?: number;
  radarY?: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  addressName?: string;
}

type ScanStatus = 'idle' | 'locating' | 'scanning' | 'success' | 'denied' | 'error';

const RADIUS_KM = 5; // 5 kilometers scanning radius

const DAY_KEYS: (keyof BusinessHours)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const SCANNING_LINES = [
  'Sniffing out nearby spots…',
  'Tuning into local frequencies…',
  'Counting good vibes within 5km…',
  'Waking up the beacons…',
  'Pinging the neighborhood…',
];

const LOCATING_LINES = [
  'Finding you on the map…',
  'Triangulating your snack radius…',
  'Locking onto your coordinates…',
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula.
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Maps geographical coordinates relative to user location onto 2D polar coordinates (-100% to 100%).
 */
function calculateRadarCoordinates(
  userLat: number,
  userLng: number,
  bizLat: number,
  bizLng: number,
  maxRadiusKm: number
): { x: number; y: number } {
  const distance = calculateDistanceKm(userLat, userLng, bizLat, bizLng);
  const normalizedDistance = Math.min(distance / maxRadiusKm, 0.9); // Limit to edge

  // Calculate bearing angle in radians
  const dLng = ((bizLng - userLng) * Math.PI) / 180;
  const userLatRad = (userLat * Math.PI) / 180;
  const bizLatRad = (bizLat * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(bizLatRad);
  const x =
    Math.cos(userLatRad) * Math.sin(bizLatRad) -
    Math.sin(userLatRad) * Math.cos(bizLatRad) * Math.cos(dLng);

  const bearing = Math.atan2(y, x);

  // Return percentage offsets from center (-40% to 40% for visual padding)
  const offsetRadiusPercent = normalizedDistance * 42;
  const radarX = Math.sin(bearing) * offsetRadiusPercent;
  const radarY = -Math.cos(bearing) * offsetRadiusPercent;

  return { x: radarX, y: radarY };
}

/**
 * Formats a "HH:MM" 24-hour string into a friendly 12-hour clock string, e.g. "9:00 AM".
 */
function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = (mStr ?? '00').padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

interface OpenStatus {
  isOpen: boolean;
  label: string;
  hoursText: string;
}

/**
 * Determines whether a business is currently open based on its weekly hours.
 * - No hours data at all -> "Hours not listed"
 * - No entry for today -> "Closed today"
 * - Now is before opening -> "Closed" + "Opens H:MM AM/PM"
 * - Now is at/after closing -> "Closed" + "Closed at H:MM AM/PM"
 * - Otherwise -> "Open now" + "Until H:MM AM/PM"
 * Note: assumes same-day hours (does not handle overnight hours crossing midnight).
 */
function getOpenStatus(hours: BusinessHours | undefined, now: Date = new Date()): OpenStatus {
  if (!hours) {
    return { isOpen: false, label: 'Hours not listed', hoursText: '' };
  }

  const dayKey = DAY_KEYS[now.getDay()];
  const today = hours[dayKey];

  if (!today) {
    return { isOpen: false, label: 'Closed today', hoursText: '' };
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = today.open.split(':').map(Number);
  const [closeH, closeM] = today.close.split(':').map(Number);
  const openMinutes = openH * 60 + (openM || 0);
  const closeMinutes = closeH * 60 + (closeM || 0);

  if (nowMinutes < openMinutes) {
    return { isOpen: false, label: 'Closed', hoursText: `Opens ${formatTime12h(today.open)}` };
  }
  if (nowMinutes >= closeMinutes) {
    return { isOpen: false, label: 'Closed', hoursText: `Closed at ${formatTime12h(today.close)}` };
  }
  return { isOpen: true, label: 'Open now', hoursText: `Until ${formatTime12h(today.close)}` };
}

/** Visual theme (gradient + glow) per business category, used for radar markers. */
function getCategoryTheme(category: string): { gradient: string; glow: string } {
  switch (category.toLowerCase()) {
    case 'salon':
      return {
        gradient: 'bg-gradient-to-br from-pink-400 to-fuchsia-500',
        glow: 'bg-pink-400/40',
      };
    case 'restaurant':
    case 'food':
      return {
        gradient: 'bg-gradient-to-br from-amber-400 to-orange-500',
        glow: 'bg-amber-400/40',
      };
    default:
      return {
        gradient: 'bg-gradient-to-br from-cyan-400 to-teal-500',
        glow: 'bg-cyan-400/40',
      };
  }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export const VinScanner: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [taglineIndex, setTaglineIndex] = useState(0);

  // Cycle a playful tagline while locating / scanning, for a livelier feel.
  useEffect(() => {
    if (status !== 'scanning' && status !== 'locating') return;
    const id = setInterval(() => {
      setTaglineIndex((i) => i + 1);
    }, 1900);
    return () => clearInterval(id);
  }, [status]);

  const tagline =
    status === 'locating'
      ? LOCATING_LINES[taglineIndex % LOCATING_LINES.length]
      : SCANNING_LINES[taglineIndex % SCANNING_LINES.length];

  // Reverse geocoding via OpenStreetMap Nominatim
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    console.log(`[VinScanner] 🌐 Reverse geocoding coordinates: (${lat}, ${lng})...`);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      const area = data.address?.road || data.address?.suburb || data.address?.city || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
      console.log(`[VinScanner] 📍 Reverse Geocoded Address: "${area}"`);
      return area;
    } catch (error) {
      console.warn(`[VinScanner] ⚠️ Reverse geocoding failed or timed out. Falling back to raw coords.`, error);
      return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    }
  };

  // Fetch from Firestore
  const fetchNearbyBusinesses = useCallback(async (userLat: number, userLng: number) => {
    console.log(`[VinScanner] 🔍 Querying Firestore for nearby businesses around user position (${userLat}, ${userLng})...`);
    try {
      const fetched: BusinessProfile[] = [];
      const collections = ['restaurantprofile', 'salons'];

      for (const colName of collections) {
        console.log(`[VinScanner] 📂 Reading collection: '${colName}'`);
        const querySnapshot = await getDocs(collection(db, colName));
        console.log(`[VinScanner] 📦 Found ${querySnapshot.size} total docs in '${colName}'`);

        querySnapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
          const data = docSnap.data();

          if (data.latitude && data.longitude) {
            const dist = calculateDistanceKm(userLat, userLng, data.latitude, data.longitude);
            console.log(`[VinScanner] 🏪 Business "${data.brandName || docSnap.id}" is ${dist.toFixed(2)} km away`);

            if (dist <= RADIUS_KM) {
              const { x, y } = calculateRadarCoordinates(
                userLat,
                userLng,
                data.latitude,
                data.longitude,
                RADIUS_KM
              );

              const category = data.category || (colName === 'salons' ? 'salon' : 'restaurant');
              const fallbackVinLink = colName === 'salons' ? `/salon/${docSnap.id}` : `/food/${docSnap.id}`;

              fetched.push({
                id: docSnap.id,
                // Salon docs store the name under `salonName`, restaurant docs under `brandName`
                brandName: data.brandName || data.salonName || 'Unnamed Business',
                address: data.address || 'Address unavailable',
                bio: data.bio || 'No description available.',
                rating: data.rating || 5.0,
                category,
                latitude: data.latitude,
                longitude: data.longitude,
                logo: data.logo,
                verified: data.verified ?? true,
                distanceKm: dist,
                hours: data.hours || undefined,
                vinLink: data.vinLink || fallbackVinLink,
                radarX: x,
                radarY: y,
              });
            }
          } else {
            console.warn(`[VinScanner] ⚠️ Business "${data.brandName || docSnap.id}" is missing latitude/longitude!`);
          }
        });
      }

      console.log(`[VinScanner] ✅ Radar Scan Complete! Found ${fetched.length} business(es) within ${RADIUS_KM} km radius.`, fetched);
      setBusinesses(fetched);
      setStatus('success');
    } catch (err: any) {
      console.error('[VinScanner] ❌ Firestore Fetch Error:', err);
      const detailedError = err?.message || err?.code || JSON.stringify(err);
      setErrorMessage(`Firestore Error: ${detailedError}`);
      setStatus('error');
    }
  }, []);

  // Location Request & Scanning Initialization
  const startScan = useCallback(() => {
    console.log('[VinScanner] 🚀 Initializing Radar Location Scan...');
    setStatus('locating');
    setErrorMessage(null);
    setSelectedBusiness(null);
    setTaglineIndex(0);

    if (!navigator.geolocation) {
      console.error('[VinScanner] ❌ Navigator Geolocation API is not supported in this browser.');
      setErrorMessage('Geolocation is not supported by your browser.');
      setStatus('error');
      return;
    }

    console.log('[VinScanner] 📡 Requesting GPS Location from browser...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        console.log(`[VinScanner] 🎯 User GPS Location Acquired!`, {
          latitude,
          longitude,
          accuracyMeters: accuracy,
        });

        setStatus('scanning');
        setTaglineIndex(0);

        const addressName = await reverseGeocode(latitude, longitude);
        setLocation({ latitude, longitude, addressName });

        // Radar delay animation simulation
        setTimeout(() => {
          fetchNearbyBusinesses(latitude, longitude);
        }, 2200);
      },
      (error) => {
        console.error(`[VinScanner] ❌ Location Request Failed! Code ${error.code}:`, error.message);
        if (error.code === error.PERMISSION_DENIED) {
          console.warn('[VinScanner] 🚫 Permission denied by user or browser setting.');
          setStatus('denied');
        } else {
          setErrorMessage('Unable to retrieve location accurately. Please check GPS settings.');
          setStatus('error');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [fetchNearbyBusinesses]);

  useEffect(() => {
    startScan();
  }, [startScan]);

  // Opens turn-by-turn directions from the user's current location to the selected business.
  const openDirections = useCallback(
    (biz: BusinessProfile) => {
      if (!location) return;
      const origin = `${location.latitude},${location.longitude}`;
      const destination = `${biz.latitude},${biz.longitude}`;
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
      console.log(`[VinScanner] 🗺️ Opening directions to "${biz.brandName}"`, { origin, destination });
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [location]
  );

  // Instantly loads the selected business's real storefront (Food ordering or Salon
  // booking page) using its stored VinLink — no extra lookup, no page reload.
  const openStorefront = useCallback(
    (biz: BusinessProfile) => {
      const path = biz.vinLink || (biz.category.toLowerCase() === 'salon' ? `/salon/${biz.id}` : `/food/${biz.id}`);
      console.log(`[VinScanner] 🏪 Opening storefront for "${biz.brandName}" at ${path}`);
      navigate(path);
    },
    [navigate]
  );

  // Dynamic filter based on search query
  const filteredBusinesses = useMemo(() => {
    if (!searchQuery.trim()) return businesses;
    const term = searchQuery.toLowerCase().trim();
    return businesses.filter(
      (b) =>
        b.brandName.toLowerCase().includes(term) ||
        b.category.toLowerCase().includes(term) ||
        b.address.toLowerCase().includes(term) ||
        b.bio.toLowerCase().includes(term)
    );
  }, [businesses, searchQuery]);

  const restaurantCount = useMemo(
    () => businesses.filter((b) => ['restaurant', 'food'].includes(b.category.toLowerCase())).length,
    [businesses]
  );
  const salonCount = useMemo(
    () => businesses.filter((b) => b.category.toLowerCase() === 'salon').length,
    [businesses]
  );

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'salon':
        return <Scissors className="w-4 h-4 text-pink-400" />;
      case 'restaurant':
      case 'food':
        return <Utensils className="w-4 h-4 text-amber-400" />;
      default:
        return <Store className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getCategoryIconDark = (category: string) => {
    switch (category.toLowerCase()) {
      case 'salon':
        return <Scissors className="w-4 h-4 text-slate-950" strokeWidth={2.5} />;
      case 'restaurant':
      case 'food':
        return <Utensils className="w-4 h-4 text-slate-950" strokeWidth={2.5} />;
      default:
        return <Store className="w-4 h-4 text-slate-950" strokeWidth={2.5} />;
    }
  };

  const selectedOpenStatus = selectedBusiness ? getOpenStatus(selectedBusiness.hours) : null;

  return (
    <div className="relative min-h-screen bg-[#05070d] text-slate-100 flex flex-col items-center justify-between p-4 font-sans overflow-hidden select-none">
      {/* Dynamic Background Aurora Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-teal-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-600/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="z-10 w-full max-w-md flex flex-col space-y-3 py-3 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-400" />
            </span>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-teal-300 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
              MalvinAI <span className="font-light text-slate-400">Radar</span>
            </h1>
          </div>
          <button
            onClick={startScan}
            disabled={status === 'scanning' || status === 'locating'}
            className="p-2 rounded-full bg-white/5 border border-white/10 hover:border-teal-400/50 hover:bg-white/10 text-slate-300 hover:text-teal-300 transition-all active:scale-95 disabled:opacity-50"
            title="Rescan Area"
          >
            <RefreshCw className={`w-4 h-4 ${status === 'scanning' || status === 'locating' ? 'animate-spin text-teal-300' : ''}`} />
          </button>
        </div>

        {/* SEARCH BAR & QUICK FILTERS */}
        <div className="space-y-2">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search a spot, cuisine, or cut…"
              className="w-full bg-white/5 border border-white/10 focus:border-teal-400/60 rounded-full pl-10 pr-9 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all shadow-inner backdrop-blur-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 text-slate-400 hover:text-white rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1 text-[10px]">
            <button
              onClick={() => setSearchQuery('')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
                !searchQuery
                  ? 'bg-gradient-to-r from-teal-400 to-violet-500 text-slate-950 shadow-lg shadow-teal-500/20'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:text-slate-200'
              }`}
            >
              All · {businesses.length}
            </button>
            <button
              onClick={() => setSearchQuery('restaurant')}
              className={`px-3 py-1.5 rounded-full font-semibold flex items-center gap-1 transition-all shrink-0 ${
                searchQuery.toLowerCase() === 'restaurant'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:text-slate-200'
              }`}
            >
              <Utensils className="w-3 h-3" />
              <span>Eats · {restaurantCount}</span>
            </button>
            <button
              onClick={() => setSearchQuery('salon')}
              className={`px-3 py-1.5 rounded-full font-semibold flex items-center gap-1 transition-all shrink-0 ${
                searchQuery.toLowerCase() === 'salon'
                  ? 'bg-gradient-to-r from-pink-400 to-fuchsia-500 text-slate-950 shadow-lg shadow-pink-500/20'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:text-slate-200'
              }`}
            >
              <Scissors className="w-3 h-3" />
              <span>Beauty · {salonCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Center Radar Scanner Viewport */}
      <main className="z-10 relative flex-1 flex flex-col items-center justify-center my-4 w-full max-w-md">
        {/* Radar Canvas Container */}
        <div className="relative w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_60px_rgba(45,212,191,0.12)] flex items-center justify-center overflow-hidden">

          {/* Circular Wave Rings */}
          <div className="absolute inset-[15%] rounded-full border border-white/10 border-dashed" />
          <div className="absolute inset-[35%] rounded-full border border-white/10" />
          <div className="absolute inset-[60%] rounded-full border border-white/10 border-dashed" />

          {/* Axis Overlay Lines */}
          <div className="absolute w-full h-[1px] bg-white/5" />
          <div className="absolute h-full w-[1px] bg-white/5" />

          {/* Expanding Radar Pulse Waves */}
          {(status === 'scanning' || status === 'locating') && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border border-teal-400/40 bg-teal-500/5"
                animate={{ scale: [0.1, 1], opacity: [0.8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-violet-400/30 bg-violet-500/5"
                animate={{ scale: [0.1, 1], opacity: [0.8, 0] }}
                transition={{ duration: 3, delay: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />
            </>
          )}

          {/* Sweeping Scanner Beam */}
          {(status === 'scanning' || status === 'locating' || status === 'success') && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              style={{
                background:
                  'conic-gradient(from 0deg at 50% 50%, rgba(45, 212, 191, 0.35) 0deg, rgba(167, 139, 250, 0.15) 40deg, transparent 90deg, transparent 360deg)',
              }}
            />
          )}

          {/* Center Pointer (User Position) */}
          <div className="relative z-20 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-8 h-8 rounded-full bg-teal-400/20 animate-ping" />
              <div className="w-5 h-5 rounded-full bg-teal-400 border-2 border-[#05070d] flex items-center justify-center shadow-[0_0_15px_#2dd4bf]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#05070d]" />
              </div>
            </div>
            <span className="mt-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono tracking-widest text-teal-200 shadow-md backdrop-blur-md">
              YOU
            </span>
          </div>

          {/* Discovered Businesses Plotted Markers */}
          <AnimatePresence>
            {status === 'success' &&
              filteredBusinesses.map((biz) => {
                const isSelected = selectedBusiness?.id === biz.id;
                const theme = getCategoryTheme(biz.category);
                const openNow = getOpenStatus(biz.hours).isOpen;
                return (
                  <motion.button
                    key={biz.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1.15 }}
                    onClick={() => setSelectedBusiness(biz)}
                    className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
                    style={{
                      left: `calc(50% + ${biz.radarX}%)`,
                      top: `calc(50% + ${biz.radarY}%)`,
                    }}
                  >
                    <div className="relative flex flex-col items-center">
                      {/* Soft color-coded glow, no boxy border */}
                      <span className={`absolute -inset-2.5 rounded-full blur-md opacity-70 ${theme.glow}`} />

                      <div
                        className={`relative w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl transition-all duration-300 ${theme.gradient} ${
                          isSelected ? 'scale-125 ring-2 ring-white/90 shadow-[0_0_22px_rgba(255,255,255,0.35)]' : 'ring-1 ring-white/20'
                        }`}
                      >
                        {biz.logo ? (
                          <img src={biz.logo} alt={biz.brandName} className="w-4.5 h-4.5 rounded-full object-cover" />
                        ) : (
                          getCategoryIconDark(biz.category)
                        )}

                        {/* Open/closed status dot */}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#05070d] ${
                            openNow ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                      </div>

                      {/* Label only appears on select/hover — no persistent boxy tag */}
                      <AnimatePresence>
                        {(isSelected) && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="mt-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[9px] font-medium text-white whitespace-nowrap shadow-lg"
                          >
                            {biz.brandName.length > 14 ? `${biz.brandName.substring(0, 13)}…` : biz.brandName}
                            <span className="text-slate-300 ml-1 font-mono">
                              · {Math.round((biz.distanceKm || 0) * 1000)}m
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>
                );
              })}
          </AnimatePresence>
        </div>

        {/* Location Status Banner */}
        <div className="mt-4 text-center space-y-1 px-4">
          {status === 'locating' && (
            <p className="text-sm font-medium text-teal-300/90 animate-pulse">{tagline}</p>
          )}
          {status === 'scanning' && (
            <div>
              <p className="text-sm font-semibold tracking-wide text-teal-200 animate-pulse">{tagline}</p>
              {location && (
                <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1 font-mono">
                  <MapPin className="w-3 h-3 text-teal-400" />
                  Near <span className="text-slate-200">{location.addressName}</span>
                </p>
              )}
            </div>
          )}
          {status === 'success' && (
            <div className="text-xs text-slate-400">
              <span className="text-teal-300 font-semibold">{filteredBusinesses.length}</span> of {businesses.length} spots within {RADIUS_KM}km.
            </div>
          )}
        </div>
      </main>

      {/* Permission Denied View */}
      {status === 'denied' && (
        <div className="z-20 w-full max-w-md bg-white/5 border border-amber-500/30 rounded-2xl p-5 backdrop-blur-xl text-center space-y-3 my-auto">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6 animate-bounce" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Location Access Required</h3>
          <p className="text-xs text-slate-400">
            MalvinAI Radar needs your location to find verified spots nearby and route you to them.
          </p>
          <button
            onClick={startScan}
            className="w-full py-2.5 rounded-full bg-gradient-to-r from-teal-400 to-violet-500 font-semibold text-xs tracking-wider text-slate-950 shadow-lg hover:shadow-teal-500/30 transition-all active:scale-95"
          >
            Grant Location Access
          </button>
        </div>
      )}

      {/* Error View */}
      {status === 'error' && (
        <div className="z-20 w-full max-w-md bg-white/5 border border-rose-500/30 rounded-2xl p-5 backdrop-blur-xl text-center space-y-3 my-auto">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-300 font-mono">{errorMessage}</p>
          <button
            onClick={startScan}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200"
          >
            Try Scanning Again
          </button>
        </div>
      )}

      {/* No Businesses Discovered State */}
      {status === 'success' && filteredBusinesses.length === 0 && (
        <div className="z-10 text-center py-3 px-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
          <p className="text-xs text-slate-400">
            {searchQuery ? `Nothing matching "${searchQuery}" on the radar.` : "Radar's quiet here — nothing nearby yet."}
          </p>
        </div>
      )}

      {/* Footer Instructions */}
      <footer className="z-10 text-center pb-2">
        <p className="text-[11px] text-slate-500 font-mono tracking-wide">
          TAP A BEACON TO PEEK INSIDE
        </p>
      </footer>

      {/* ========================================== */}
      {/* BUSINESS DETAILS MODAL / POPUP CARD         */}
      {/* ========================================== */}
      <AnimatePresence>
        {selectedBusiness && selectedOpenStatus && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-[#05070d]/75 backdrop-blur-md">
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-[#0a0d16]/95 border border-white/10 rounded-3xl p-6 shadow-[0_0_60px_rgba(45,212,191,0.15)] backdrop-blur-2xl text-slate-100 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-violet-500" />

              <button
                onClick={() => setSelectedBusiness(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <button
                onClick={() => openStorefront(selectedBusiness)}
                className="w-full flex items-start gap-4 pr-6 text-left group/header active:scale-[0.99] transition-transform"
                title="Open storefront"
              >
                <div className="relative">
                  {selectedBusiness.logo ? (
                    <img
                      src={selectedBusiness.logo}
                      alt={selectedBusiness.brandName}
                      className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-md group-hover/header:border-teal-400/50 transition-colors"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover/header:border-teal-400/50 transition-colors">
                      {getCategoryIcon(selectedBusiness.category)}
                    </div>
                  )}
                  {selectedBusiness.verified && (
                    <span className="absolute -bottom-1 -right-1 p-0.5 bg-teal-400 text-slate-950 rounded-full" title="Verified Business">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
                    <span className="truncate">{selectedBusiness.brandName}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover/header:text-teal-300 group-hover/header:translate-x-0.5 transition-all shrink-0" />
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center text-amber-400 text-xs font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 mr-0.5" />
                      {selectedBusiness.rating.toFixed(1)}
                    </div>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs uppercase font-mono tracking-wider text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                      {selectedBusiness.category}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500 font-mono">Tap to open storefront</p>
                </div>
              </button>

              <div className="mt-4 p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                <div className="flex items-center text-slate-300">
                  <MapPin className="w-4 h-4 text-teal-400 mr-2 shrink-0" />
                  <span className="truncate">{selectedBusiness.address}</span>
                </div>
                <div className="flex items-center text-slate-400 font-mono">
                  <Navigation className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                  <span>
                    {selectedBusiness.distanceKm && selectedBusiness.distanceKm < 1
                      ? `${Math.round(selectedBusiness.distanceKm * 1000)} meters away`
                      : `${selectedBusiness.distanceKm?.toFixed(2)} km away`}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-violet-400 mr-2 shrink-0" />
                  <span className={`font-semibold ${selectedOpenStatus.isOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedOpenStatus.label}
                  </span>
                  {selectedOpenStatus.hoursText && (
                    <span className="ml-1.5 text-slate-400 font-mono">{selectedOpenStatus.hoursText}</span>
                  )}
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400 line-clamp-3 leading-relaxed">
                {selectedBusiness.bio}
              </p>

              {/* Signature center "Locate" beacon — replaces Visit/Book/Order actions */}
              <div className="mt-6 flex flex-col items-center">
                <button
                  onClick={() => openDirections(selectedBusiness)}
                  className="relative group active:scale-95 transition-transform"
                  title="Get directions from your location"
                >
                  <span className="absolute inset-0 rounded-full bg-teal-400/25 animate-ping" />
                  <span className="absolute -inset-3 rounded-full bg-gradient-to-br from-teal-400/20 to-violet-500/20 blur-xl" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-teal-300 via-cyan-400 to-violet-500 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(45,212,191,0.45)] group-hover:shadow-[0_0_45px_rgba(45,212,191,0.65)] transition-shadow">
                    <LocateFixed className="w-6 h-6 text-slate-950" strokeWidth={2.5} />
                    <span className="text-[9px] font-black tracking-wider text-slate-950 mt-0.5">LOCATE</span>
                  </div>
                </button>
                <p className="mt-3 text-[10px] text-slate-500 font-mono text-center">
                  Opens directions from your position
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VinScanner;