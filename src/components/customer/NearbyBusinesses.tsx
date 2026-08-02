import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Store, Scissors, Utensils } from 'lucide-react';
import { getNearbyBusinesses, NearbyBusiness } from '../../utils/nearbyBusinesses';

interface NearbyBusinessesProps {
  onSelectBusiness: (uid: string) => void;
  label: string; // "Nearby" translated
  emptyEnabled?: boolean; // if false, render nothing when there's no data — keeps the whitespace intentional rather than showing a dead section
}

const categoryIcon = (category: string) => {
  if (category === 'salon') return Scissors;
  if (category === 'restaurant') return Utensils;
  return Store;
};

export const NearbyBusinesses: React.FC<NearbyBusinessesProps> = ({ onSelectBusiness, label }) => {
  const [businesses, setBusinesses] = useState<NearbyBusiness[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'denied' | 'error'>('idle');

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const results = await getNearbyBusinesses(pos.coords.latitude, pos.coords.longitude);
          setBusinesses(results.slice(0, 10));
          setStatus('ready');
        } catch (err) {
          console.error('Failed to load nearby businesses:', err);
          setStatus('error');
        }
      },
      () => setStatus('denied'), // permission denied — fail quietly, no nagging banner
      { timeout: 8000 }
    );
  }, []);

  // Intentionally renders nothing while loading, on error, or if permission
  // was denied — a missing section reads as "nothing here yet," not as a
  // broken page. Same for a genuinely empty result set.
  if (status !== 'ready' || businesses.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto px-4 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-50 tracking-tight">
          {label}
        </h3>
        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
          {businesses.length} within 5 km
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        {businesses.map((biz) => {
          const Icon = categoryIcon(biz.category);
          return (
            <motion.button
              key={biz.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectBusiness(biz.vinLink)}
              className="flex-shrink-0 w-[150px] text-left bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-[1.5rem] p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-2.5 overflow-hidden">
                {biz.logo ? (
                  <img src={biz.logo} alt={biz.name} className="w-full h-full object-cover" />
                ) : (
                  <Icon className="w-4.5 h-4.5 text-[#E53935]" />
                )}
              </div>

              <h4 className="text-xs font-black text-neutral-900 dark:text-neutral-50 truncate mb-1">
                {biz.name}
              </h4>

              <div className="flex items-center gap-1 mb-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                  {biz.rating.toFixed(1)}
                </span>
                {biz.isOpenNow && (
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">
                    · Open now
                  </span>
                )}
              </div>

              <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 capitalize truncate">
                {biz.category} · {biz.distanceKm < 1
                  ? `${Math.round(biz.distanceKm * 1000)}m away`
                  : `${biz.distanceKm.toFixed(1)}km away`}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};