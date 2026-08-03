import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Star, Store, Scissors, Utensils, Coffee, ChefHat, Pizza, Sparkles, Wand2, Gem } from 'lucide-react';
import { getNearbyBusinesses, getStatusLabel, NearbyBusiness } from '../../utils/nearbyBusinesses';

interface NearbyBusinessesProps {
  onSelectBusiness: (uid: string) => void;
  label: string; // "Nearby" translated
}

// Four "default" looks per business type — shown until a business has its
// own real photo (biz.logo). These are illustrated gradients + an icon
// rather than stock photography, since real photos aren't something this
// component has access to or the rights to use.
const RESTAURANT_VISUALS = [
  { gradient: 'linear-gradient(135deg, #FF7043, #E53935)', Icon: Utensils },   // food on the table
  { gradient: 'linear-gradient(135deg, #8D6E63, #4E342E)', Icon: Coffee },     // cafe / interior
  { gradient: 'linear-gradient(135deg, #26A69A, #00695C)', Icon: ChefHat },    // kitchen
  { gradient: 'linear-gradient(135deg, #EC407A, #AD1457)', Icon: Pizza },      // casual dining
];

const SALON_VISUALS = [
  { gradient: 'linear-gradient(135deg, #AB47BC, #6A1B9A)', Icon: Scissors },
  { gradient: 'linear-gradient(135deg, #F06292, #C2185B)', Icon: Sparkles },
  { gradient: 'linear-gradient(135deg, #42A5F5, #1565C0)', Icon: Wand2 },
  { gradient: 'linear-gradient(135deg, #7E57C2, #4527A0)', Icon: Gem },
];

const categoryBadgeIcon = (type: string) => (type === 'salon' ? Scissors : Utensils);

function hashToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

interface CardVisual {
  gradient: string;
  Icon: React.ElementType;
}

// Assigns a default visual per business, deterministically (same business
// always gets the same look), while making sure the same visual never
// appears on two consecutive cards in the swipe order.
function assignVisuals(list: NearbyBusiness[]): Array<NearbyBusiness & { visual: CardVisual }> {
  let prevKey = '';
  return list.map((biz) => {
    const palette = biz.type === 'salon' ? SALON_VISUALS : RESTAURANT_VISUALS;
    let idx = hashToInt(biz.id) % palette.length;
    let key = `${biz.type}-${idx}`;
    if (key === prevKey) {
      idx = (idx + 1) % palette.length;
      key = `${biz.type}-${idx}`;
    }
    prevKey = key;
    return { ...biz, visual: palette[idx] };
  });
}

export const NearbyBusinesses: React.FC<NearbyBusinessesProps> = ({ onSelectBusiness, label }) => {
  const [businesses, setBusinesses] = useState<NearbyBusiness[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'denied' | 'error'>('idle');
  const [index, setIndex] = useState(0);

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
      () => setStatus('denied'),
      { timeout: 8000 }
    );
  }, []);

  const cards = useMemo(() => assignVisuals(businesses), [businesses]);

  if (status !== 'ready' || cards.length === 0) return null;

  const current = cards[index];
  const statusInfo = getStatusLabel(current.hours);
  const Icon = current.visual.Icon;
  const BadgeIcon = categoryBadgeIcon(current.type);

  const goTo = (next: number) => {
    if (next < 0 || next >= cards.length) return;
    setIndex(next);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 60;
    if (info.offset.x < -threshold) goTo(index + 1);
    else if (info.offset.x > threshold) goTo(index - 1);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-50 tracking-tight">
          {label}
        </h3>
        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
          {index + 1} / {cards.length}
        </span>
      </div>

      <div className="relative w-full h-[190px]">
        <AnimatePresence initial={false} mode="wait">
          <motion.button
            key={current.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onSelectBusiness(current.vinLink)}
            className="absolute inset-0 w-full h-full text-left rounded-[1.75rem] overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.12)] cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'pan-y' }}
          >
            {/* Background: real logo if the business has one, otherwise the
                assigned default illustrated visual */}
            {current.logo ? (
              <img src={current.logo} alt={current.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div
                className="absolute inset-0 w-full h-full flex items-center justify-center"
                style={{ background: current.visual.gradient }}
              >
                <Icon className="w-16 h-16 text-white/25" strokeWidth={1.5} />
              </div>
            )}

            {/* Darkening gradient so white text stays legible over any image/color */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            {/* Top-right category badge */}
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              <BadgeIcon className="w-4 h-4 text-white" />
            </div>

            {/* Rating */}
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/30 backdrop-blur-md rounded-full px-2 py-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-[10px] font-bold text-white">{current.rating.toFixed(1)}</span>
            </div>

            {/* Name + location */}
            <div className="absolute bottom-9 left-4 right-4">
              <h4 className="text-white font-black text-base leading-tight truncate">{current.name}</h4>
              <p className="text-white/80 text-[11px] font-medium truncate mt-0.5">
                {current.address || `${current.distanceKm.toFixed(1)}km away`}
              </p>
            </div>

            {/* Bottom-left open/closed status */}
            {statusInfo && (
              <div className="absolute bottom-3 left-4">
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md ${
                    statusInfo.open ? 'bg-emerald-500/25 text-emerald-300' : 'bg-rose-500/25 text-rose-300'
                  }`}
                >
                  {statusInfo.label}
                </span>
              </div>
            )}
          </motion.button>
        </AnimatePresence>
      </div>

      {/* Pagination dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {cards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-5 bg-[#E53935]' : 'w-1.5 bg-neutral-300 dark:bg-neutral-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};