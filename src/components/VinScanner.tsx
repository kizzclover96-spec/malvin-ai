import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ExternalLink,
  Calendar,
  ShoppingBag,
  Scissors,
  Utensils,
  ShieldCheck,
  Search
} from 'lucide-react';
import { collection, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { firestore as db } from '../firebase'; // Adjust this import to match your Firebase config path

// ==========================================
// TYPES & INTERFACES
// ==========================================

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

// ==========================================
// MAIN COMPONENT
// ==========================================

export const VinScanner: React.FC = () => {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

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

              fetched.push({
                id: docSnap.id,
                brandName: data.brandName || 'Unnamed Business',
                address: data.address || 'Address unavailable',
                bio: data.bio || 'No description available.',
                rating: data.rating || 5.0,
                category: data.category || (colName === 'salons' ? 'salon' : 'restaurant'),
                latitude: data.latitude,
                longitude: data.longitude,
                logo: data.logo,
                verified: data.verified ?? true,
                distanceKm: dist,
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

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 font-sans overflow-hidden select-none">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="z-10 w-full max-w-md flex flex-col space-y-3 py-3 border-b border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <h1 className="text-xl font-black tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              MALVIN<span className="font-light text-slate-300">AI</span> RADAR
            </h1>
          </div>
          <button
            onClick={startScan}
            disabled={status === 'scanning' || status === 'locating'}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/60 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-all active:scale-95 disabled:opacity-50"
            title="Rescan Area"
          >
            <RefreshCw className={`w-4 h-4 ${status === 'scanning' || status === 'locating' ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* SEARCH BAR & QUICK FILTERS */}
        <div className="space-y-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search store name, restaurant, salon..."
              className="w-full bg-slate-900/90 border border-slate-700/70 focus:border-cyan-400/80 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-white rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1 text-[10px]">
            <button
              onClick={() => setSearchQuery('')}
              className={`px-2.5 py-1 rounded-lg border font-mono transition-all shrink-0 ${
                !searchQuery ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSearchQuery('restaurant')}
              className={`px-2.5 py-1 rounded-lg border font-mono flex items-center space-x-1 transition-all shrink-0 ${
                searchQuery.toLowerCase() === 'restaurant' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Utensils className="w-3 h-3 text-amber-400" />
              <span>Restaurants</span>
            </button>
            <button
              onClick={() => setSearchQuery('salon')}
              className={`px-2.5 py-1 rounded-lg border font-mono flex items-center space-x-1 transition-all shrink-0 ${
                searchQuery.toLowerCase() === 'salon' ? 'bg-pink-500/20 text-pink-300 border-pink-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Scissors className="w-3 h-3 text-pink-400" />
              <span>Salons</span>
            </button>
          </div>
        </div>
      </header>

      {/* Center Radar Scanner Viewport */}
      <main className="z-10 relative flex-1 flex flex-col items-center justify-center my-4 w-full max-w-md">
        {/* Radar Canvas Container */}
        <div className="relative w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] rounded-full border border-cyan-500/20 bg-slate-900/40 backdrop-blur-xl shadow-[0_0_50px_rgba(6,182,212,0.15)] flex items-center justify-center overflow-hidden">
          
          {/* Circular Wave Rings */}
          <div className="absolute inset-[15%] rounded-full border border-cyan-500/20 border-dashed" />
          <div className="absolute inset-[35%] rounded-full border border-cyan-500/30" />
          <div className="absolute inset-[60%] rounded-full border border-cyan-500/20 border-dashed" />
          
          {/* Axis Overlay Lines */}
          <div className="absolute w-full h-[1px] bg-cyan-500/10" />
          <div className="absolute h-full w-[1px] bg-cyan-500/10" />

          {/* Expanding Radar Pulse Waves */}
          {(status === 'scanning' || status === 'locating') && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border border-cyan-400/40 bg-cyan-500/5"
                animate={{ scale: [0.1, 1], opacity: [0.8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-cyan-400/30 bg-cyan-500/5"
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
                  'conic-gradient(from 0deg at 50% 50%, rgba(6, 182, 212, 0.35) 0deg, rgba(6, 182, 212, 0) 60deg, transparent 360deg)',
              }}
            />
          )}

          {/* Center Pointer (User Position) */}
          <div className="relative z-20 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-8 h-8 rounded-full bg-cyan-400/20 animate-ping" />
              <div className="w-5 h-5 rounded-full bg-cyan-400 border-2 border-slate-950 flex items-center justify-center shadow-[0_0_15px_#22d3ee]">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
              </div>
            </div>
            <span className="mt-1 px-2 py-0.5 rounded-full bg-slate-900/90 border border-cyan-500/40 text-[10px] font-mono tracking-widest text-cyan-300 shadow-md">
              YOU
            </span>
          </div>

          {/* Discovered Businesses Plotted Markers */}
          <AnimatePresence>
            {status === 'success' &&
              filteredBusinesses.map((biz) => {
                const isSelected = selectedBusiness?.id === biz.id;
                return (
                  <motion.button
                    key={biz.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1.2 }}
                    onClick={() => setSelectedBusiness(biz)}
                    className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
                    style={{
                      left: `calc(50% + ${biz.radarX}%)`,
                      top: `calc(50% + ${biz.radarY}%)`,
                    }}
                  >
                    <div className="relative flex flex-col items-center">
                      <span className="absolute -inset-1 rounded-full bg-cyan-400/30 animate-pulse blur-xs" />
                      <div
                        className={`p-2 rounded-full border transition-all duration-300 shadow-lg ${
                          isSelected
                            ? 'bg-cyan-400 text-slate-950 border-white scale-110 shadow-[0_0_20px_#22d3ee]'
                            : 'bg-slate-900/90 text-cyan-300 border-cyan-500/50 hover:border-cyan-300 hover:text-white'
                        }`}
                      >
                        {biz.logo ? (
                          <img src={biz.logo} alt={biz.brandName} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          getCategoryIcon(biz.category)
                        )}
                      </div>

                      <div className="mt-1 opacity-80 group-hover:opacity-100 transition-opacity bg-slate-950/90 border border-slate-800 rounded px-1.5 py-0.5 text-[9px] font-mono text-cyan-200 whitespace-nowrap shadow-md">
                        {biz.brandName.length > 10 ? `${biz.brandName.substring(0, 9)}…` : biz.brandName}
                        <span className="text-slate-400 ml-1 font-sans">
                          ({Math.round((biz.distanceKm || 0) * 1000)}m)
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
          </AnimatePresence>
        </div>

        {/* Location Status Banner */}
        <div className="mt-4 text-center space-y-1 px-4">
          {status === 'locating' && (
            <p className="text-sm font-mono text-cyan-400/80 animate-pulse">Acquiring GPS Satellite Signals...</p>
          )}
          {status === 'scanning' && (
            <div>
              <p className="text-sm font-semibold tracking-wide text-cyan-300 animate-pulse">
                Scanning for nearby MalvinAI supported businesses...
              </p>
              {location && (
                <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1 font-mono">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  Searching around: <span className="text-slate-200">{location.addressName}</span>
                </p>
              )}
            </div>
          )}
          {status === 'success' && (
            <div className="text-xs text-slate-400">
              <span className="text-cyan-400 font-semibold">{filteredBusinesses.length}</span> of {businesses.length} locations showing within {RADIUS_KM}km.
            </div>
          )}
        </div>
      </main>

      {/* Permission Denied View */}
      {status === 'denied' && (
        <div className="z-20 w-full max-w-md bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 backdrop-blur-xl text-center space-y-3 my-auto">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6 animate-bounce" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Location Access Required</h3>
          <p className="text-xs text-slate-400">
            MalvinAI VinScanner uses real-time radar coordinates to help you discover verified local businesses.
          </p>
          <button
            onClick={startScan}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-medium text-xs tracking-wider text-white shadow-lg hover:shadow-cyan-500/20 transition-all active:scale-98"
          >
            GRANT LOCATION PERMISSION
          </button>
        </div>
      )}

      {/* Error View */}
      {status === 'error' && (
        <div className="z-20 w-full max-w-md bg-slate-900/90 border border-rose-500/30 rounded-2xl p-5 backdrop-blur-xl text-center space-y-3 my-auto">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-300 font-mono">{errorMessage}</p>
          <button
            onClick={startScan}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
          >
            Try Scanning Again
          </button>
        </div>
      )}

      {/* No Businesses Discovered State */}
      {status === 'success' && filteredBusinesses.length === 0 && (
        <div className="z-10 text-center py-2 px-4 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-4">
          <p className="text-xs text-slate-400">
            {searchQuery ? `No store matching "${searchQuery}" found nearby.` : 'No MalvinAI partners found nearby in this area yet.'}
          </p>
        </div>
      )}

      {/* Footer Instructions */}
      <footer className="z-10 text-center pb-2">
        <p className="text-[11px] text-slate-500 font-mono">
          TAP A RADAR BEACON TO INSPECT & INTERACT
        </p>
      </footer>

      {/* ========================================== */}
      {/* BUSINESS DETAILS MODAL / POPUP CARD         */}
      {/* ========================================== */}
      <AnimatePresence>
        {selectedBusiness && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-slate-900/95 border border-cyan-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] backdrop-blur-2xl text-slate-100 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500" />

              <button
                onClick={() => setSelectedBusiness(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4 pr-6">
                <div className="relative">
                  {selectedBusiness.logo ? (
                    <img
                      src={selectedBusiness.logo}
                      alt={selectedBusiness.brandName}
                      className="w-14 h-14 rounded-2xl object-cover border border-cyan-500/40 shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
                      {getCategoryIcon(selectedBusiness.category)}
                    </div>
                  )}
                  {selectedBusiness.verified && (
                    <span className="absolute -bottom-1 -right-1 p-0.5 bg-cyan-400 text-slate-950 rounded-full" title="Verified Business">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    {selectedBusiness.brandName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center text-amber-400 text-xs font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 mr-0.5" />
                      {selectedBusiness.rating.toFixed(1)}
                    </div>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs uppercase font-mono tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                      {selectedBusiness.category}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center text-slate-300">
                  <MapPin className="w-4 h-4 text-cyan-400 mr-2 shrink-0" />
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
              </div>

              <p className="mt-3 text-xs text-slate-400 line-clamp-3 leading-relaxed">
                {selectedBusiness.bio}
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <button className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/50 group">
                  <ExternalLink className="w-4 h-4 text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold">Visit Store</span>
                </button>
                <button className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/50 group">
                  <Calendar className="w-4 h-4 text-violet-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold">Book</span>
                </button>
                <button className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-medium transition-all shadow-lg hover:shadow-cyan-500/25 active:scale-95 group">
                  <ShoppingBag className="w-4 h-4 text-white mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold">Order</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VinScanner;