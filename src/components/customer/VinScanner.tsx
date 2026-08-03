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
  SlidersHorizontal,
  Radar as RadarIcon,
  List as ListIcon,
  Heart,
  Receipt,
  Bell,
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

interface VinScannerProps {
  onClose?: () => void;
  onOpenFavorites?: () => void;
  onOpenReceipts?: () => void;
}

export const VinScanner: React.FC<VinScannerProps> = ({ onClose, onOpenFavorites, onOpenReceipts }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [taglineIndex, setTaglineIndex] = useState(0);
  // Category chips now filter independently from free-text search, rather
  // than the old approach of typing "restaurant"/"salon" INTO the search
  // box as a hack. "services" is a catch-all for any category string a
  // business has set that isn't food/salon — there's no dedicated
  // "services" collection in Firestore yet, so this bucket exists for
  // forward-compatibility rather than a real current business type.
  const [activeCategory, setActiveCategory] = useState<'all' | 'restaurant' | 'salon' | 'services'>('all');
  const [sortByRating, setSortByRating] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<'radar' | 'list'>('radar');

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

  // Delayed on purpose: the radar modal's own opening animation and
  // getCurrentPosition({enableHighAccuracy: true}) were competing for the
  // main thread at the same instant, which is what made opening feel
  // slow/janky. Letting the modal finish opening first, THEN starting the
  // scan, fixes that. Bonus: if someone opens and closes the radar within
  // this window, the scan (and the Firestore read it triggers via
  // fetchNearbyBusinesses) never happens at all — one less read every time
  // that occurs, instead of firing immediately on every open regardless.
  const SCAN_START_DELAY_MS = 4000;
  useEffect(() => {
    const timer = setTimeout(() => {
      startScan();
    }, SCAN_START_DELAY_MS);
    return () => clearTimeout(timer);
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

  // Combines the category chip, free-text search, and optional sort into
  // one pipeline — each is independent now instead of overloading the
  // search box with category keywords.
  const filteredBusinesses = useMemo(() => {
    let list = businesses;

    if (activeCategory === 'restaurant') {
      list = list.filter((b) => ['restaurant', 'food'].includes(b.category.toLowerCase()));
    } else if (activeCategory === 'salon') {
      list = list.filter((b) => b.category.toLowerCase() === 'salon');
    } else if (activeCategory === 'services') {
      list = list.filter((b) => !['restaurant', 'food', 'salon'].includes(b.category.toLowerCase()));
    }

    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.brandName.toLowerCase().includes(term) ||
          b.category.toLowerCase().includes(term) ||
          b.address.toLowerCase().includes(term) ||
          b.bio.toLowerCase().includes(term)
      );
    }

    if (sortByRating) {
      list = [...list].sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [businesses, activeCategory, searchQuery, sortByRating]);

  const restaurantCount = useMemo(
    () => businesses.filter((b) => ['restaurant', 'food'].includes(b.category.toLowerCase())).length,
    [businesses]
  );
  const salonCount = useMemo(
    () => businesses.filter((b) => b.category.toLowerCase() === 'salon').length,
    [businesses]
  );
  const servicesCount = useMemo(
    () => businesses.filter((b) => !['restaurant', 'food', 'salon'].includes(b.category.toLowerCase())).length,
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

  // Plain inline styles for the bottom tab bar buttons — deliberately not
  // Tailwind classes here. These buttons previously had no explicit
  // background at all, which let a leftover global `button { background:
  // #1a1a1a }` rule in index.css silently paint them solid black. Inline
  // styles can't be overridden by any global CSS, so this can't recur.
  // Shared style for the category chips — each gets its own gradient when
  // active, plain glass-white when not. Inline styles throughout, same
  // reasoning as tabButtonStyle below.
  const chipStyle = (activeGradient: string, active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '9999px',
    fontWeight: 700,
    fontSize: '12px',
    border: active ? 'none' : '1px solid rgba(255,255,255,0.9)',
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'background 0.2s ease, color 0.2s ease',
    background: active ? activeGradient : 'rgba(255,255,255,0.7)',
    color: active ? '#ffffff' : '#737373',
    boxShadow: active ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
  });

  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 0',
    borderRadius: '1rem',
    border: 'none',
    outline: 'none',
    appearance: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: active ? '#14b8a6' : '#a3a3a3',
    transition: 'color 0.2s ease',
  });

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        color: '#171717',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px',
        fontFamily: 'inherit',
        overflow: 'hidden',
        userSelect: 'none',
        backgroundColor: '#FAF8F5',
      }}
    >
      {/* Cream base with a soft, blurred dark hue brushed across it — easy
          on the eyes, replaces the previous cool gray + teal/violet glow */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '560px',
          height: '560px',
          borderRadius: '9999px',
          pointerEvents: 'none',
          background: 'rgba(20,20,20,0.05)',
          filter: 'blur(140px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '320px',
          height: '320px',
          borderRadius: '9999px',
          pointerEvents: 'none',
          background: 'rgba(10,10,10,0.04)',
          filter: 'blur(120px)',
        }}
      />

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '448px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                margin: 0,
                background: 'linear-gradient(to right, #2dd4bf, #3b82f6)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
              }}
            >
              MalvinAI
            </h2>
            <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.3, color: '#404040', margin: '4px 0 0 0' }}>
              Radar
            </h1>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#737373', margin: '4px 0 0 0' }}>
              Discover trusted spots around you.
            </p>
          </div>

          {/* Stacked close + refresh — matches the reference exactly, and
              now lives inside VinScanner itself (via the onClose prop)
              instead of an external overlay button in Front.tsx */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {onClose && (
              <button
                onClick={onClose}
                title="Close Radar"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  border: '1px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#404040',
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none',
                  appearance: 'none',
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            )}
            <button
              onClick={startScan}
              disabled={status === 'scanning' || status === 'locating'}
              title="Rescan Area"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255,255,255,0.8)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                border: '1px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#404040',
                cursor: 'pointer',
                padding: 0,
                outline: 'none',
                appearance: 'none',
                opacity: status === 'scanning' || status === 'locating' ? 0.5 : 1,
              }}
            >
              <RefreshCw
                style={{
                  width: '16px',
                  height: '16px',
                  animation: status === 'scanning' || status === 'locating' ? 'spin 1s linear infinite' : 'none',
                  color: status === 'scanning' || status === 'locating' ? '#14b8a6' : 'inherit',
                }}
              />
            </button>
          </div>
        </div>

        {/* SEARCH BAR — filter/sort icon added on the right, toggles
            sorting the results by rating instead of default distance */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            style={{ position: 'absolute', left: '16px', width: '16px', height: '16px', color: '#a3a3a3', pointerEvents: 'none' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search a spot, cuisine, or cut…"
            style={{
              width: '100%',
              backgroundColor: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: isSearchFocused ? '1px solid rgba(45,212,191,0.6)' : '1px solid rgba(255,255,255,0.7)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              borderRadius: '9999px',
              padding: '12px 44px 12px 40px',
              fontSize: '14px',
              color: '#262626',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
          />
          <button
            onClick={() => setSortByRating((v) => !v)}
            title={sortByRating ? 'Sorted by rating — tap to sort by distance' : 'Sort by rating'}
            style={{
              position: 'absolute',
              right: '12px',
              padding: '6px',
              borderRadius: '9999px',
              border: 'none',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
              backgroundColor: sortByRating ? 'rgba(45,212,191,0.2)' : 'transparent',
              color: sortByRating ? '#0d9488' : '#a3a3a3',
              transition: 'background-color 0.2s ease, color 0.2s ease',
            }}
          >
            <SlidersHorizontal style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Quick Category Chips — now independent of the search box (see
            activeCategory state) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', fontSize: '12px' }}>
          <button
            onClick={() => setActiveCategory('all')}
            style={chipStyle('linear-gradient(to right, #6366f1, #3b82f6)', activeCategory === 'all')}
          >
            All · {businesses.length}
          </button>
          <button
            onClick={() => setActiveCategory('restaurant')}
            style={chipStyle('linear-gradient(to right, #fbbf24, #f97316)', activeCategory === 'restaurant')}
          >
            <Utensils style={{ width: '14px', height: '14px' }} />
            <span>Eats · {restaurantCount}</span>
          </button>
          <button
            onClick={() => setActiveCategory('salon')}
            style={chipStyle('linear-gradient(to right, #f472b6, #d946ef)', activeCategory === 'salon')}
          >
            <Scissors style={{ width: '14px', height: '14px' }} />
            <span>Beauty · {salonCount}</span>
          </button>
          <button
            onClick={() => setActiveCategory('services')}
            style={chipStyle('linear-gradient(to right, #22d3ee, #14b8a6)', activeCategory === 'services')}
          >
            <Bell style={{ width: '14px', height: '14px' }} />
            <span>Services · {servicesCount}</span>
          </button>
        </div>
      </header>

      {/* Center Radar Scanner Viewport — this stays the one deliberately
          dark element on an otherwise light page, matching the reference:
          a dark navy "porthole" floating on a light frosted background. */}
      <main className="z-10 relative flex-1 flex flex-col items-center justify-center my-4 w-full max-w-md">
        {activeTab === 'radar' ? (
          <>
            <div
              style={{
                position: 'relative',
                width: 'clamp(280px, 90vw, 360px)',
                height: 'clamp(280px, 90vw, 360px)',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(30,58,74,0.55) 0%, rgba(18,34,46,0.6) 55%, rgba(11,23,32,0.7) 100%)',
                backdropFilter: 'blur(26px)',
                WebkitBackdropFilter: 'blur(26px)',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              }}
            >
              {/* Glass reflection highlights — bright near the top-left,
                  a softer bounce near the bottom-right, like light hitting
                  a glass sphere. Purely decorative, clipped to the circle
                  by the parent's overflow-hidden. */}
              <div
                className="absolute -top-8 -left-8 w-36 h-36 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)', filter: 'blur(4px)' }}
              />
              <div
                className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)', filter: 'blur(10px)' }}
              />

              {/* Compass letters at the four cardinal points */}
              <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest text-white/40">N</span>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest text-white/40">S</span>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-widest text-white/40">W</span>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-widest text-white/40">E</span>

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
                      'conic-gradient(from 0deg at 50% 50%, rgba(45, 212, 191, 0.45) 0deg, rgba(56, 189, 248, 0.2) 40deg, transparent 90deg, transparent 360deg)',
                  }}
                />
              )}

              {/* Center Pointer (User Position) */}
              <div className="relative z-20 flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-8 h-8 rounded-full bg-teal-400/20 animate-ping" />
                  <div className="w-5 h-5 rounded-full bg-teal-400 border-2 border-[#0b1720] flex items-center justify-center shadow-[0_0_15px_#2dd4bf]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0b1720]" />
                  </div>
                </div>
              </div>

              {/* Discovered Businesses — each a small floating info card
                  (icon + name + distance) positioned at its real
                  bearing/distance, matching the reference's card style
                  instead of a plain dot. Always shows name + distance now,
                  not just on selection. */}
              <AnimatePresence>
                {status === 'success' &&
                  filteredBusinesses.map((biz) => {
                    const isSelected = selectedBusiness?.id === biz.id;
                    const openNow = getOpenStatus(biz.hours).isOpen;
                    const categoryBg =
                      biz.category.toLowerCase() === 'salon'
                        ? 'bg-gradient-to-br from-pink-400 to-fuchsia-500'
                        : ['restaurant', 'food'].includes(biz.category.toLowerCase())
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                        : 'bg-gradient-to-br from-cyan-400 to-teal-500';
                    return (
                      <motion.button
                        key={biz.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setSelectedBusiness(biz)}
                        className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                        style={{
                          left: `calc(50% + ${biz.radarX}%)`,
                          top: `calc(50% + ${biz.radarY}%)`,
                        }}
                      >
                        <div
                          className={`flex flex-col items-center gap-1 bg-white/95 backdrop-blur-md rounded-2xl px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition-all ${
                            isSelected ? 'ring-2 ring-teal-400' : ''
                          }`}
                        >
                          <div className="relative">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${categoryBg}`}>
                              {biz.logo ? (
                                <img src={biz.logo} alt={biz.brandName} className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                getCategoryIconDark(biz.category)
                              )}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                openNow ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                          </div>
                          <div className="text-center leading-tight">
                            <p className="text-[11px] font-bold text-neutral-900 whitespace-nowrap">
                              {biz.brandName.length > 14 ? `${biz.brandName.substring(0, 13)}…` : biz.brandName}
                            </p>
                            <p className="text-[10px] font-medium text-neutral-500">
                              {biz.distanceKm && biz.distanceKm < 1
                                ? `${Math.round(biz.distanceKm * 1000)} m`
                                : `${biz.distanceKm?.toFixed(1)} km`}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
              </AnimatePresence>
            </div>

            {/* Status Banner — light pill, matches the reference */}
            <div className="mt-5 text-center px-4">
              {status === 'locating' && (
                <p className="text-sm font-medium text-neutral-500 animate-pulse">{tagline}</p>
              )}
              {status === 'scanning' && (
                <div>
                  <p className="text-sm font-semibold tracking-wide text-neutral-600 animate-pulse">{tagline}</p>
                  {location && (
                    <p className="text-xs text-neutral-400 mt-1 flex items-center justify-center gap-1">
                      <MapPin className="w-3 h-3 text-teal-500" />
                      Near <span className="text-neutral-600">{location.addressName}</span>
                    </p>
                  )}
                </div>
              )}
              {status === 'success' && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] text-xs font-medium text-neutral-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-neutral-900 font-bold">{filteredBusinesses.length}</span> of {businesses.length} spots within{' '}
                  <span className="text-teal-600 font-bold">{RADIUS_KM}km</span>.
                </span>
              )}
            </div>
          </>
        ) : (
          /* LIST VIEW — same filteredBusinesses data, shown as rows instead
             of plotted on the radar. Tapping opens the same detail modal. */
          <div className="w-full max-h-[420px] overflow-y-auto space-y-2 px-1">
            {status !== 'success' ? (
              <p className="text-center text-sm text-neutral-400 py-10">
                {status === 'locating' || status === 'scanning' ? tagline : 'Scan the area first to see a list.'}
              </p>
            ) : filteredBusinesses.length === 0 ? (
              <p className="text-center text-sm text-neutral-400 py-10">
                {searchQuery ? `Nothing matching "${searchQuery}" nearby.` : "Nothing nearby yet."}
              </p>
            ) : (
              filteredBusinesses.map((biz) => {
                const openNow = getOpenStatus(biz.hours).isOpen;
                return (
                  <button
                    key={biz.id}
                    onClick={() => setSelectedBusiness(biz)}
                    className="w-full flex items-center gap-3 bg-white/80 border border-white rounded-2xl p-3 shadow-[0_4px_16px_rgba(0,0,0,0.04)] text-left hover:bg-white transition-colors"
                  >
                    <div className="relative shrink-0">
                      {biz.logo ? (
                        <img src={biz.logo} alt={biz.brandName} className="w-11 h-11 rounded-xl object-cover" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center">
                          {getCategoryIcon(biz.category)}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          openNow ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 truncate">{biz.brandName}</p>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{biz.rating.toFixed(1)}</span>
                        <span>·</span>
                        <span>
                          {biz.distanceKm && biz.distanceKm < 1
                            ? `${Math.round(biz.distanceKm * 1000)}m`
                            : `${biz.distanceKm?.toFixed(1)}km`}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Permission Denied View */}
      {status === 'denied' && (
        <div className="z-20 w-full max-w-md bg-white/80 border border-white rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] text-center space-y-3 my-auto">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6 animate-bounce" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">Location Access Required</h3>
          <p className="text-xs text-neutral-500">
            MalvinAI Radar needs your location to find verified spots nearby and route you to them.
          </p>
          <button
            onClick={startScan}
            className="w-full py-2.5 rounded-full bg-gradient-to-r from-teal-400 to-violet-500 font-semibold text-xs tracking-wider text-white shadow-lg hover:shadow-teal-500/30 transition-all active:scale-95"
          >
            Grant Location Access
          </button>
        </div>
      )}

      {/* Error View */}
      {status === 'error' && (
        <div className="z-20 w-full max-w-md bg-white/80 border border-white rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] text-center space-y-3 my-auto">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-xs text-rose-500">{errorMessage}</p>
          <button
            onClick={startScan}
            className="px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white transition-colors"
          >
            Try Scanning Again
          </button>
        </div>
      )}

      {/* No Businesses Discovered State — only shown on the radar tab; the
          list tab already has its own empty message inline */}
      {activeTab === 'radar' && status === 'success' && filteredBusinesses.length === 0 && (
        <div className="z-10 text-center py-3 px-4 rounded-2xl bg-white/70 border border-white mb-2">
          <p className="text-xs text-neutral-500">
            {searchQuery ? `Nothing matching "${searchQuery}" on the radar.` : "Radar's quiet here — nothing nearby yet."}
          </p>
        </div>
      )}

      {/* BOTTOM TAB BAR — Radar/List switch real views inside this
          component; Favorites/Receipts close the radar and hand off to the
          equivalent screens that already exist in Front.tsx, rather than
          duplicating those features here. */}
      <footer className="z-10 w-full max-w-md bg-white/80 border border-white rounded-[2rem] shadow-[0_8px_24px_rgba(0,0,0,0.06)] px-2 py-2 flex items-center justify-between mt-2">
        <button
          onClick={() => setActiveTab('radar')}
          style={tabButtonStyle(activeTab === 'radar')}
        >
          <RadarIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold">Radar</span>
        </button>
        <button
          onClick={() => setActiveTab('list')}
          style={tabButtonStyle(activeTab === 'list')}
        >
          <ListIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold">List</span>
        </button>
        <button
          onClick={onOpenFavorites}
          disabled={!onOpenFavorites}
          style={{ ...tabButtonStyle(false), opacity: onOpenFavorites ? 1 : 0.4 }}
        >
          <Heart className="w-5 h-5" />
          <span className="text-[10px] font-bold">Favorites</span>
        </button>
        <button
          onClick={onOpenReceipts}
          disabled={!onOpenReceipts}
          style={{ ...tabButtonStyle(false), opacity: onOpenReceipts ? 1 : 0.4 }}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] font-bold">Receipts</span>
        </button>
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