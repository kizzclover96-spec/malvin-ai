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
  Scissors,
  Utensils,
  ShieldCheck,
  Search,
  Clock
} from 'lucide-react';
import { collection, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { firestore as db } from '../../firebase';

// ==========================================\
// TYPES & INTERFACES
// ==========================================\

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
  openingTime?: string; // e.g. "09:00"
  closingTime?: string; // e.g. "21:00"
  offDays?: string[];   // e.g. ["Sunday"]
  radarX?: number; 
  radarY?: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  addressName?: string;
}

type ScanStatus = 'idle' | 'locating' | 'scanning' | 'success' | 'error';

interface VinScannerProps {
  onSelectBusiness?: (business: BusinessProfile) => void;
  onClose?: () => void;
}

// ==========================================\
// HELPER CALCULATIONS
// ==========================================\

const calculateDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
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
};

// Check if current time falls within opening & closing bounds
const checkIsOpen = (openingTime?: string, closingTime?: string, offDays?: string[]): { isOpen: boolean; label: string } => {
  const now = new Date();
  
  if (offDays && offDays.length > 0) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    if (offDays.includes(currentDay)) {
      return { isOpen: false, label: 'Closed Today' };
    }
  }

  if (!openingTime || !closingTime) {
    return { isOpen: true, label: 'Open' };
  }

  const [openHour, openMin] = openingTime.split(':').map(Number);
  const [closeHour, closeMin] = closingTime.split(':').map(Number);

  const openDate = new Date();
  openDate.setHours(openHour, openMin, 0, 0);

  const closeDate = new Date();
  closeDate.setHours(closeHour, closeMin, 0, 0);

  if (now >= openDate && now <= closeDate) {
    return { isOpen: true, label: `Open until ${closingTime}` };
  } else {
    return { isOpen: false, label: `Closed (Opens ${openingTime})` };
  }
};

export const VinScanner: React.FC<VinScannerProps> = ({ onSelectBusiness, onClose }) => {
  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Get User Location
  const requestLocation = useCallback(() => {
    setScanStatus('locating');
    setErrorMessage(null);

    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      setScanStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        setScanStatus('scanning');
      },
      (err) => {
        console.error(err);
        setErrorMessage('Unable to retrieve your location. Please enable location permissions.');
        setScanStatus('error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // 2. Fetch Businesses from Firestore & Calculate Distances
  useEffect(() => {
    if (!userLoc || scanStatus !== 'scanning') return;

    const fetchBusinesses = async () => {
      try {
        const querySnap = await getDocs(collection(db, 'businesses'));
        const loaded: BusinessProfile[] = [];

        querySnap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
          const data = docSnap.data();
          if (data.latitude && data.longitude) {
            const dist = calculateDistanceInKm(
              userLoc.latitude,
              userLoc.longitude,
              data.latitude,
              data.longitude
            );

            // Compute radar display offsets
            const angle = Math.random() * Math.PI * 2;
            const distanceFactor = Math.min(dist / 5, 1);
            const radarX = Math.cos(angle) * (distanceFactor * 120);
            const radarY = Math.sin(angle) * (distanceFactor * 120);

            loaded.push({
              id: docSnap.id,
              brandName: data.brandName || data.salonName || 'Store',
              address: data.address || 'Address not listed',
              bio: data.bio || data.brandBio || '',
              rating: data.rating || 5.0,
              category: data.category || (data.salonName ? 'salon' : 'restaurant'),
              latitude: data.latitude,
              longitude: data.longitude,
              logo: data.logo || data.pictureURL || '',
              verified: data.verified || data.isVerified || false,
              distanceKm: dist,
              openingTime: data.openingTime,
              closingTime: data.closingTime,
              offDays: data.offDays || [],
              radarX,
              radarY
            });
          }
        });

        // Sort by distance
        loaded.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

        setBusinesses(loaded);
        setScanStatus('success');
      } catch (err: any) {
        console.error(err);
        setErrorMessage('Failed to load nearby businesses.');
        setScanStatus('error');
      }
    };

    fetchBusinesses();
  }, [userLoc, scanStatus]);

  // Filtered Businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      const matchesCategory = filterCategory === 'all' || b.category.toLowerCase() === filterCategory;
      const matchesQuery = b.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           b.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [businesses, filterCategory, searchQuery]);

  // 🗺️ Launch Maps Route to Selected Destination
  const handleOpenMapRoute = (business: BusinessProfile) => {
    if (!userLoc) return;

    // Direct Google Maps Direction URL from User Lat/Lng to Destination Lat/Lng
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLoc.latitude},${userLoc.longitude}&destination=${business.latitude},${business.longitude}&travelmode=driving`;
    
    window.open(googleMapsUrl, '_blank');

    if (onSelectBusiness) {
      onSelectBusiness(business);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col font-sans text-white overflow-hidden">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-base font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Malvin Radar
            </h2>
            <p className="text-[11px] text-slate-400">Discover & route nearby storefronts</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* CATEGORY & SEARCH FILTER BAR */}
      <div className="p-3 border-b border-slate-800/60 bg-slate-900/20 flex flex-col gap-2 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search nearby places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {['all', 'restaurant', 'salon'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all border ${
                filterCategory === cat
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              {cat === 'restaurant' && <Utensils className="w-3 h-3 inline mr-1" />}
              {cat === 'salon' && <Scissors className="w-3 h-3 inline mr-1" />}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* RADAR VIEWPORT */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-radial-gradient">
        
        {/* Radar Rings Background */}
        <div className="absolute w-[280px] h-[280px] rounded-full border border-cyan-500/10 animate-pulse" />
        <div className="absolute w-[200px] h-[200px] rounded-full border border-cyan-500/20" />
        <div className="absolute w-[120px] h-[120px] rounded-full border border-cyan-500/30" />
        
        {/* User Location Center Dot */}
        <div className="relative z-10 p-3 rounded-full bg-cyan-500/20 border border-cyan-400 shadow-lg shadow-cyan-500/30">
          <Navigation className="w-5 h-5 text-cyan-400" />
        </div>

        {/* Dynamic Business Radar Nodes */}
        {scanStatus === 'success' &&
          filteredBusinesses.map((b) => (
            <motion.button
              key={b.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                x: b.radarX || 0,
                y: b.radarY || 0
              }}
              whileHover={{ scale: 1.25 }}
              onClick={() => setSelectedBusiness(b)}
              className={`absolute z-20 p-2.5 rounded-full border backdrop-blur-md transition-all ${
                selectedBusiness?.id === b.id
                  ? 'bg-cyan-500 text-slate-950 border-white shadow-lg shadow-cyan-500/50 scale-110'
                  : 'bg-slate-900/90 text-cyan-400 border-cyan-500/30 hover:border-cyan-400'
              }`}
            >
              {b.category === 'salon' ? (
                <Scissors className="w-4 h-4" />
              ) : (
                <Utensils className="w-4 h-4" />
              )}
            </motion.button>
          ))}

        {/* SCANNER LOADING OVERLAY */}
        {scanStatus !== 'success' && scanStatus !== 'error' && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-xs font-medium text-slate-300">
              {scanStatus === 'locating' ? 'Locating your GPS...' : 'Scanning nearby storefronts...'}
            </span>
          </div>
        )}

        {/* ERROR STATE */}
        {scanStatus === 'error' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30">
            <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
            <p className="text-sm font-semibold text-slate-200 mb-4">{errorMessage}</p>
            <button
              onClick={requestLocation}
              className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-cyan-400 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* MODERNIZED FLOATING BUSINESS MODAL DETAILED VIEW */}
      <AnimatePresence>
        {selectedBusiness && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="p-4 bg-slate-900/95 border-t border-slate-800/80 backdrop-blur-xl shrink-0 z-40"
          >
            {/* Business Info Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {selectedBusiness.logo ? (
                  <img
                    src={selectedBusiness.logo}
                    alt={selectedBusiness.brandName}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-700/60"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Store className="w-6 h-6" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-white">{selectedBusiness.brandName}</h3>
                    {selectedBusiness.verified && (
                      <ShieldCheck className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
                    )}
                  </div>

                  {/* Star Rating & Distance Meta */}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <div className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{selectedBusiness.rating.toFixed(1)}</span>
                    </div>

                    <span>•</span>

                    <div className="flex items-center gap-1 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        {selectedBusiness.distanceKm! < 1
                          ? `${Math.round(selectedBusiness.distanceKm! * 1000)}m away`
                          : `${selectedBusiness.distanceKm!.toFixed(1)}km away`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dismiss Card Button */}
              <button
                onClick={() => setSelectedBusiness(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Opening / Closing Status Pill */}
            {(() => {
              const status = checkIsOpen(
                selectedBusiness.openingTime,
                selectedBusiness.closingTime,
                selectedBusiness.offDays
              );
              return (
                <div className="flex items-center gap-2 mb-4 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span
                    className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
                      status.isOpen
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {status.label}
                  </span>
                  <span className="text-slate-500 truncate max-w-[180px]">
                    {selectedBusiness.address}
                  </span>
                </div>
              );
            })()}

            {/* CENTRAL CIRCULAR LOCATE BUTTON */}
            <div className="flex justify-center pt-1 pb-2">
              <button
                onClick={() => handleOpenMapRoute(selectedBusiness)}
                className="relative group w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 p-0.5 shadow-xl shadow-cyan-500/25 active:scale-95 transition-transform"
              >
                <div className="w-full h-full rounded-full bg-slate-950 group-hover:bg-slate-950/80 transition-colors flex flex-col items-center justify-center gap-1">
                  <Navigation className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold tracking-wider uppercase text-white">
                    Locate
                  </span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VinScanner;