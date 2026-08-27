import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ImagePlus, Camera, Loader2, Share2, Download, Trash2, Sparkles } from 'lucide-react';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { firestore as db, auth } from '../../firebase';
import { shareContent, canOpenShareSheet, copyToClipboard } from '../../services/share';
import { extractUid, buildVinLink } from '../../services/vinLink';

// ============================================================================
// VINMOMENT
// ----------------------------------------------------------------------------
// The shareable "I found this" card — MalvinAI's answer to a Snapchat Snap.
// Renders a portrait card (business name, bio, rating, hours, location) onto
// a <canvas>, optionally lets the person drop in 2-5 photos of their own
// (never uploaded or stored anywhere — pure in-memory, gone the moment this
// closes), then shares the finished image via the native share sheet with a
// link that deep-links straight back into the business inside Malvin.
// ============================================================================

const CANVAS_W = 1080;
const CANVAS_H = 1920;
const MAX_PHOTOS = 5;
const MIN_PHOTOS_HINT = 2;

interface VinMomentProps {
  businessUid: string; // may be a raw uid or a full stored link — we normalize it below
  storeName: string;
  logoUrl?: string;
  onClose: () => void;
}

interface MomentProfile {
  name: string;
  bio: string;
  address: string;
  rating: number;
  category: string;
  logoUrl?: string;
  openingTime?: string;
  closingTime?: string;
  vinLink: string; // the real deep-linkable URL we build the share around
}

type Step = 'loading' | 'photos' | 'preview' | 'error';

// --- Category-based abstract art themes (no stock photos = no licensing risk,
// no network fetch = no lag, and it still looks intentional/branded rather
// than like a generic template). Each category has several color variants —
// one is picked at random per card, so sharing the same place twice, or
// sharing four different places, doesn't produce four identical-looking
// cards. If you later add a real cover-photo field to business profiles,
// prefer that over this and fall back to it otherwise. ---
const THEME_VARIANTS: Record<string, { from: string; to: string; accent: string }[]> = {
  restaurant: [
    { from: '#f59e0b', to: '#dc2626', accent: '#fde68a' }, // amber → red
    { from: '#fb923c', to: '#7c2d12', accent: '#fed7aa' }, // orange → deep brown
    { from: '#f43f5e', to: '#7c2d12', accent: '#fecdd3' }, // rose → brown
    { from: '#facc15', to: '#b45309', accent: '#fef3c7' }, // gold → amber
    { from: '#ef4444', to: '#4c0519', accent: '#fecaca' }, // red → deep wine
  ],
  food: [
    { from: '#f59e0b', to: '#dc2626', accent: '#fde68a' },
    { from: '#fb923c', to: '#7c2d12', accent: '#fed7aa' },
    { from: '#f43f5e', to: '#7c2d12', accent: '#fecdd3' },
    { from: '#facc15', to: '#b45309', accent: '#fef3c7' },
    { from: '#ef4444', to: '#4c0519', accent: '#fecaca' },
  ],
  salon: [
    { from: '#ec4899', to: '#7c3aed', accent: '#fbcfe8' }, // pink → violet
    { from: '#f472b6', to: '#4c1d95', accent: '#fce7f3' }, // rose → indigo
    { from: '#d946ef', to: '#581c87', accent: '#f5d0fe' }, // fuchsia → deep purple
    { from: '#fb7185', to: '#701a75', accent: '#fecdd3' }, // coral → plum
    { from: '#c084fc', to: '#1e1b4b', accent: '#e9d5ff' }, // lavender → midnight
  ],
  default: [
    { from: '#06b6d4', to: '#4338ca', accent: '#a5f3fc' }, // cyan → indigo
    { from: '#22d3ee', to: '#312e81', accent: '#cffafe' }, // teal → deep indigo
    { from: '#38bdf8', to: '#5b21b6', accent: '#bae6fd' }, // sky → violet
    { from: '#2dd4bf', to: '#1e3a8a', accent: '#99f6e4' }, // teal → navy
    { from: '#818cf8', to: '#312e81', accent: '#c7d2fe' }, // indigo → deep indigo
  ],
};

function getTheme(category: string) {
  const key = (category || '').toLowerCase();
  const variants = THEME_VARIANTS[key] || THEME_VARIANTS.default;
  return variants[Math.floor(Math.random() * variants.length)];
}

// --- MomScore: a small, fun running counter of how many VinMoments someone
// has shared, with a named tier that levels up every 20 shares. Purely for
// delight/engagement — never gates any real feature. ---
export const MOM_TIERS = ['Vin Rookie', 'Vin Regular', 'Vin Insider', 'Vin Legend', 'Vin Icon'];
export const MOM_MILESTONE_STEP = 20;

export function getTierForScore(score: number): string {
  const level = Math.floor(score / MOM_MILESTONE_STEP) - 1;
  if (level < 0) return MOM_TIERS[0];
  if (level < MOM_TIERS.length) return MOM_TIERS[level];
  const cycle = level - MOM_TIERS.length + 2;
  return `${MOM_TIERS[MOM_TIERS.length - 1]} ×${cycle}`;
}

// Lightweight, self-contained open/closed check (deliberately duplicated from
// VinScanner's version rather than imported, so this card never breaks if
// that file changes shape — it only needs opening/closing time strings).
function getOpenLabel(openingTime?: string, closingTime?: string): { label: string; isOpen: boolean } {
  if (!openingTime || !closingTime) return { label: '', isOpen: false };
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = openingTime.split(':').map(Number);
  const [ch, cm] = closingTime.split(':').map(Number);
  const openMinutes = oh * 60 + (om || 0);
  const closeMinutes = ch * 60 + (cm || 0);
  if (nowMinutes < openMinutes) return { label: `Opens ${openingTime}`, isOpen: false };
  if (nowMinutes >= closeMinutes) return { label: 'Closed', isOpen: false };
  return { label: `Open · Until ${closingTime}`, isOpen: true };
}

export const VinMoment: React.FC<VinMomentProps> = ({ businessUid, storeName, logoUrl, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('loading');
  const [profile, setProfile] = useState<MomentProfile | null>(null);
  const [theme, setTheme] = useState<{ from: string; to: string; accent: string } | null>(null);
  // These live ONLY in memory for this session — never uploaded, never
  // written to Firestore/Storage, and their object URLs are revoked the
  // moment this component unmounts or a photo is removed.
  const [userPhotos, setUserPhotos] = useState<{ url: string; img: HTMLImageElement }[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<{ score: number; tier: string } | null>(null);

  // --- 1. Load the live business profile (rating/hours/category aren't kept
  // on the lightweight recentBusinesses copy, so we fetch the real doc) ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uid = extractUid(businessUid);
      try {
        let data: any = null;
        let category = 'restaurant';

        const restaurantSnap = await getDoc(doc(db, 'restaurantprofile', uid));
        if (restaurantSnap.exists()) {
          data = restaurantSnap.data();
          category = data.category || 'restaurant';
        } else {
          const salonSnap = await getDoc(doc(db, 'salons', uid));
          if (salonSnap.exists()) {
            data = salonSnap.data();
            category = 'salon';
          }
        }

        if (cancelled) return;

        if (!data) {
          // Fall back gracefully to whatever we already had from the recent-
          // businesses row, rather than failing the whole share flow.
          setProfile({
            name: storeName,
            bio: '',
            address: '',
            rating: 5,
            category: 'restaurant',
            logoUrl,
            vinLink: buildVinLink(uid, 'restaurant'),
          });
          setTheme(getTheme('restaurant'));
        } else {
          setProfile({
            name: data.brandName || data.salonName || storeName,
            bio: data.bio || data.brandBio || '',
            address: data.address || '',
            rating: typeof data.rating === 'number' ? data.rating : 5,
            category,
            logoUrl: data.logo || logoUrl,
            openingTime: data.openingTime,
            closingTime: data.closingTime,
            vinLink: buildVinLink(uid, category),
          });
          setTheme(getTheme(category));
        }
        setStep('photos');
      } catch (err) {
        console.error('VinMoment: failed to load business profile:', err);
        if (!cancelled) setStep('error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessUid]);

  // --- Guarantees every local photo URL is revoked, no exceptions ---
  // Tracked in a ref (not just component state) so cleanup is correct even
  // if a photo was already individually removed before this runs — nothing
  // the user adds or snaps here is ever kept beyond this one session.
  const createdUrlsRef = useRef<Set<string>>(new Set());

  const revokeAllPhotos = useCallback(() => {
    createdUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    createdUrlsRef.current.clear();
    setUserPhotos([]);
  }, []);

  useEffect(() => {
    return () => { revokeAllPhotos(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every path that leaves this component — the X button, tapping the
  // backdrop, or the error state's Close link — wipes any added photos first.
  const handleClose = useCallback(() => {
    revokeAllPhotos();
    onClose();
  }, [revokeAllPhotos, onClose]);

  const handleAddPhotos = (files: FileList | null) => {
    if (!files || !files.length) return;
    const remaining = MAX_PHOTOS - userPhotos.length;
    if (remaining <= 0) return;

    Array.from(files).slice(0, remaining).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      createdUrlsRef.current.add(url);
      const img = new Image();
      img.onload = () => setUserPhotos(prev => [...prev, { url, img }]);
      img.onerror = () => { URL.revokeObjectURL(url); createdUrlsRef.current.delete(url); };
      img.src = url;
    });
  };

  const handleRemovePhoto = (url: string) => {
    URL.revokeObjectURL(url);
    createdUrlsRef.current.delete(url);
    setUserPhotos(prev => prev.filter(p => p.url !== url));
  };

  // --- 2. Draw the card every time the inputs that affect it change ---
  const drawCard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !profile || !theme) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    bg.addColorStop(0, theme.from);
    bg.addColorStop(1, theme.to);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Abstract soft shapes — a bit of visual texture without any real photo
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(CANVAS_W * 0.85, CANVAS_H * 0.15, 260, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(CANVAS_W * 0.1, CANVAS_H * 0.32, 180, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.10;
    ctx.beginPath(); ctx.arc(CANVAS_W * 0.5, CANVAS_H * 0.05, 340, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Dashed "polaroid/ticket" frame around the whole card
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 12]);
    roundedRectPath(ctx, 28, 28, CANVAS_W - 56, CANVAS_H - 56, 40);
    ctx.stroke();
    ctx.restore();

    // Diagonal "DISCOVERED ON MALVIN" ribbon, top-left corner
    ctx.save();
    ctx.translate(-40, 130);
    ctx.rotate(-Math.PI / 4.2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(-60, -22, 340, 44);
    ctx.font = '800 22px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'center';
    ctx.fillText('DISCOVERED ON MALVIN', 110, 7);
    ctx.restore();

    // "Share this moment" eyebrow pill
    ctx.font = '600 30px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center';
    ctx.fillText('✦ SHARE THIS MOMENT WITH FRIENDS & FAMILY ✦', CANVAS_W / 2, 110);

    // Logo badge (top-left), if it loads cleanly. Skips silently on any
    // CORS/tainted-canvas failure rather than breaking the whole card.
    if (profile.logoUrl) {
      try {
        const logoImg = await loadImage(profile.logoUrl);
        const size = 150;
        const x = 70, y = 170;
        ctx.save();
        ctx.beginPath();
        roundedRectPath(ctx, x, y, size, size, 32);
        ctx.clip();
        ctx.drawImage(logoImg, x, y, size, size);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 4;
        roundedRectPath(ctx, x, y, size, size, 32);
        ctx.stroke();
      } catch {
        // Silently skip — logo may be hosted without permissive CORS headers.
      }
    }

    // Rating sticker — a rotated circular "badge" instead of plain text
    ctx.save();
    ctx.translate(CANVAS_W - 150, 245);
    ctx.rotate(-0.12);
    ctx.beginPath();
    ctx.arc(0, 0, 78, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = theme.accent;
    ctx.stroke();
    ctx.fillStyle = '#111827';
    ctx.font = '900 40px -apple-system, Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(profile.rating.toFixed(1), 0, 8);
    ctx.font = '800 22px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillStyle = theme.to;
    ctx.fillText('★★★★★'.slice(0, Math.round(profile.rating)), 0, 34);
    ctx.restore();

    // Business name — auto-shrinks to fit the width
    ctx.textAlign = 'left';
    let nameSize = 92;
    ctx.font = `900 ${nameSize}px -apple-system, Helvetica, Arial, sans-serif`;
    while (ctx.measureText(profile.name).width > CANVAS_W - 140 && nameSize > 48) {
      nameSize -= 4;
      ctx.font = `900 ${nameSize}px -apple-system, Helvetica, Arial, sans-serif`;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(profile.name, 70, 420);

    // Bio
    if (profile.bio) {
      ctx.font = '500 34px -apple-system, Helvetica, Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      wrapText(ctx, profile.bio, 70, 480, CANVAS_W - 140, 44, 2);
    }

    // Hours
    const { label, isOpen } = getOpenLabel(profile.openingTime, profile.closingTime);
    if (label) {
      ctx.font = '600 34px -apple-system, Helvetica, Arial, sans-serif';
      ctx.fillStyle = isOpen ? '#bbf7d0' : '#fecdd3';
      ctx.textAlign = 'left';
      ctx.fillText(`🕐 ${label}`, 70, 620);
    }

    // Address — small rotated pin "sticker" tag instead of plain text
    if (profile.address) {
      ctx.save();
      ctx.translate(70, 660);
      ctx.rotate(-0.03);
      ctx.font = '600 30px -apple-system, Helvetica, Arial, sans-serif';
      const label = `📍 ${truncate(profile.address, 34)}`;
      const w = ctx.measureText(label).width + 40;
      roundedRectPath(ctx, 0, -34, w, 48, 24);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'left';
      ctx.fillText(label, 20, 0);
      ctx.restore();
    }

    // Fanned photo-stack teaser — an IG-story-style stack, not a flat strip.
    // This is purely decorative on the main card; the actual full-size
    // photos are shared as their own separate images alongside this one.
    if (userPhotos.length > 0) {
      const centerX = CANVAS_W / 2;
      const centerY = CANVAS_H - 560;
      const cardW = 300, cardH = 380;
      const shown = userPhotos.slice(0, 5);
      const mid = (shown.length - 1) / 2;
      const angleStep = shown.length > 1 ? 0.16 : 0;

      shown.forEach((p, i) => {
        const offsetFromCenter = i - mid;
        const angle = offsetFromCenter * angleStep;
        const xOffset = offsetFromCenter * 70;
        ctx.save();
        ctx.translate(centerX + xOffset, centerY);
        ctx.rotate(angle);
        // subtle drop shadow so the stack reads as layered cards
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 14;
        roundedRectPath(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 26);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.save();
        roundedRectPath(ctx, -cardW / 2 + 8, -cardH / 2 + 8, cardW - 16, cardH - 16, 20);
        ctx.clip();
        const scale = Math.max((cardW - 16) / p.img.width, (cardH - 16) / p.img.height);
        const w = p.img.width * scale, h = p.img.height * scale;
        ctx.drawImage(p.img, -w / 2, -h / 2, w, h);
        ctx.restore();
        ctx.restore();
      });

      ctx.textAlign = 'center';
      ctx.font = '700 30px -apple-system, Helvetica, Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const photoWord = shown.length === 1 ? 'photo' : 'photos';
      ctx.fillText(`📸 +${shown.length} full-size ${photoWord} shared alongside`, centerX, centerY + cardH / 2 + 70);
    }

    // Bottom gradient for legibility + CTA bar
    const bottomFade = ctx.createLinearGradient(0, CANVAS_H - 260, 0, CANVAS_H);
    bottomFade.addColorStop(0, 'rgba(0,0,0,0)');
    bottomFade.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = bottomFade;
    ctx.fillRect(0, CANVAS_H - 260, CANVAS_W, 260);

    ctx.textAlign = 'center';
    ctx.font = '800 38px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('>> Tap to also experience it', CANVAS_W / 2, CANVAS_H - 110);
    ctx.font = '600 28px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Shared via Malvin AI', CANVAS_W / 2, CANVAS_H - 60);
  }, [profile, theme, userPhotos]);

  useEffect(() => { drawCard(); }, [drawCard]);

  // Increments the person's MomScore by 1 and returns the milestone info if
  // this share just crossed a multiple of 20 — never blocks the share flow
  // if it fails, since this is a delight feature, not a core one.
  const bumpMomScore = async (): Promise<{ score: number; tier: string } | null> => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    try {
      const custRef = doc(db, 'customers', uid);
      const snap = await getDoc(custRef);
      const current = snap.exists() && typeof snap.data().momScore === 'number' ? snap.data().momScore : 0;
      const newScore = current + 1;
      await setDoc(custRef, { momScore: increment(1) }, { merge: true });
      if (newScore % MOM_MILESTONE_STEP === 0) {
        return { score: newScore, tier: getTierForScore(newScore) };
      }
      return null;
    } catch (err) {
      console.error('VinMoment: failed to update MomScore:', err);
      return null;
    }
  };

  // Called once a share has genuinely gone through (not cancelled). Wipes
  // photos, bumps the score, and either shows a milestone celebration or
  // (if autoClose) just closes shortly after. When autoClose is false, the
  // modal stays open so the person can see the share feedback message.
  const finishShare = async (autoClose: boolean, autoCloseDelay = 700) => {
    revokeAllPhotos();
    const hit = await bumpMomScore();
    if (hit) {
      setMilestone(hit);
      setTimeout(handleClose, 2800);
    } else if (autoClose) {
      setTimeout(handleClose, autoCloseDelay);
    }
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !profile) return;
    setIsSharing(true);
    setShareFeedback(null);

    canvas.toBlob(async (mainBlob) => {
      if (!mainBlob) { setIsSharing(false); return; }

      // Build the full-size, watermarked version of every photo the person
      // added — these are what actually get shared, not the small preview.
      const photoBlobs = await Promise.all(userPhotos.map(p => buildWatermarkedPhotoBlob(p.img)));
      const photoFiles = photoBlobs
        .map((blob, i) => blob ? { blob, name: `vinmoment-photo-${i + 1}.jpg` } : null)
        .filter((f): f is { blob: Blob; name: string } => f !== null);

      const shareText = `Check out ${profile.name} — I found it on Malvin.`;

      // Everything — the card and every full photo — goes out together in one
      // share, so whoever receives it sees the real photos too.
      const shareFiles = [
        { blob: mainBlob, name: 'vinmoment.png' },
        ...photoFiles,
      ];

      // Saves every image and copies the link. Used on desktop, and as a
      // genuine fallback if the OS share sheet refuses to open.
      const saveEverythingLocally = async () => {
        const downloadBlob = (blob: Blob, filename: string) => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          URL.revokeObjectURL(a.href);
        };
        downloadBlob(mainBlob, `${profile.name.replace(/\s+/g, '-').toLowerCase()}-vinmoment.png`);
        for (const file of photoFiles) {
          await new Promise(r => setTimeout(r, 300)); // avoid the browser blocking rapid downloads
          downloadBlob(file.blob, file.name);
        }
        await copyToClipboard(profile.vinLink);
      };

      try {
        if (!canOpenShareSheet()) {
          await saveEverythingLocally();
          setShareFeedback('Images saved and link copied — share them anywhere!');
          await finishShare(false); // wipes photos + bumps score; stays open to show the save/copy feedback
          return;
        }

        const result = await shareContent({
          title: `${profile.name} on Malvin`,
          text: shareText,
          url: profile.vinLink,
          files: shareFiles,
        });

        if (result === 'shared') {
          await finishShare(true, 700);
        } else if (result === 'cancelled') {
          // They backed out of the sheet — keep their photos so they can
          // retry, and don't count it as a share.
        } else {
          await saveEverythingLocally();
          setShareFeedback("Share sheet wouldn't open — images saved and link copied instead.");
          await finishShare(false);
        }
      } catch (err) {
        console.error('VinMoment share failed:', err);
        setShareFeedback('Could not open the share sheet — try again.');
      } finally {
        setIsSharing(false);
      }
    }, 'image/png', 0.95);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-md flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 8 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          className="relative w-full max-w-sm bg-white/75 backdrop-blur-2xl border border-white/60 rounded-[2rem] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] flex flex-col max-h-[92vh]"
        >
          {/* MOMSCORE MILESTONE CELEBRATION — every 20 shares */}
          <AnimatePresence>
            {milestone && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="icon-button absolute inset-0 z-10 rounded-[2rem] bg-gradient-to-br from-cyan-400/95 to-violet-600/95 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8"
              >
                <motion.div
                  initial={{ scale: 0.5, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 220 }}
                  className="text-6xl mb-3"
                >
                  🎉
                </motion.div>
                <p className="text-white/90 text-xs font-bold uppercase tracking-widest mb-1">MomScore Milestone</p>
                <p className="text-white text-4xl font-black mb-2">{milestone.score}</p>
                <p className="text-white text-lg font-black">{milestone.tier}</p>
                <p className="text-white/80 text-xs font-semibold mt-2">Keep sharing moments to level up again!</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-neutral-900 font-black tracking-tight">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span>VinMoment</span>
            </div>
            <button onClick={handleClose} className="p-2 rounded-full bg-neutral-900/5 hover:bg-neutral-900/10 text-neutral-500 hover:text-neutral-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {step === 'loading' && (
            <div className="flex-1 flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          )}

          {step === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center gap-2">
              <p className="text-sm text-rose-500 font-semibold">Couldn't load this business right now.</p>
              <button onClick={handleClose} className="text-xs text-neutral-500 underline">Close</button>
            </div>
          )}

          {(step === 'photos' || step === 'preview') && profile && (
            <>
              <div className="overflow-y-auto rounded-2xl border border-neutral-900/10 mb-4 shadow-inner">
                <canvas ref={canvasRef} className="w-full h-auto block" style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }} />
              </div>

              {step === 'photos' && (
                <div className="mb-4">
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-2">
                    Add {MIN_PHOTOS_HINT}-{MAX_PHOTOS} photos of your own (optional)
                  </p>
                  <p className="text-[10px] text-neutral-400 mb-2.5 leading-relaxed">
                    Shared full-size, watermarked, right alongside your moment card — never uploaded or saved anywhere.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {userPhotos.map(p => (
                      <div key={p.url} className="relative w-14 h-14 rounded-xl overflow-hidden border border-neutral-900/10">
                        <img src={p.url} className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleRemovePhoto(p.url)}
                          className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                    {userPhotos.length < MAX_PHOTOS && (
                      <>
                        <button
                          onClick={() => cameraInputRef.current?.click()}
                          title="Take a photo"
                          className="w-14 h-14 rounded-xl border border-dashed border-neutral-900/15 bg-neutral-900/[0.03] flex items-center justify-center text-neutral-400 hover:text-violet-500 hover:border-violet-400/50 transition-colors"
                        >
                          <Camera className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          title="Choose from gallery"
                          className="w-14 h-14 rounded-xl border border-dashed border-neutral-900/15 bg-neutral-900/[0.03] flex items-center justify-center text-neutral-400 hover:text-violet-500 hover:border-violet-400/50 transition-colors"
                        >
                          <ImagePlus className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => { handleAddPhotos(e.target.files); e.target.value = ''; }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={(e) => { handleAddPhotos(e.target.files); e.target.value = ''; }}
                  />
                </div>
              )}

              {shareFeedback && (
                <p className="text-[11px] text-center text-violet-600 font-semibold mb-2">{shareFeedback}</p>
              )}

              <div className="flex gap-2">
                {step === 'photos' ? (
                  <button
                    onClick={() => setStep('preview')}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 text-white font-black text-sm tracking-wide shadow-lg shadow-violet-500/20"
                  >
                    Continue
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setStep('photos')}
                      className="px-4 py-3 rounded-2xl bg-neutral-900/[0.05] border border-neutral-900/10 text-neutral-600 text-sm font-bold hover:bg-neutral-900/10 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleShare}
                      disabled={isSharing}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 text-white font-black text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-violet-500/20"
                    >
                      {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                      Share Moment
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// --- small canvas helpers ---
function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(' ');
  let line = '';
  let lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines = lines.slice(0, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Builds a full-size version of a user-added photo (capped so file sizes stay
// reasonable to share), stamped with a small "VinMoment" watermark in the
// top-right corner. This — not a tiny thumbnail — is what actually gets
// shared alongside the main card, so whoever receives it can really see
// what was snapped or uploaded.
const MAX_PHOTO_DIMENSION = 1600;

function buildWatermarkedPhotoBlob(img: HTMLImageElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(null); return; }

    ctx.drawImage(img, 0, 0, w, h);

    // Watermark pill, top-right corner
    const pad = Math.max(16, w * 0.03);
    ctx.font = `700 ${Math.max(16, Math.round(w * 0.028))}px -apple-system, Helvetica, Arial, sans-serif`;
    const label = '✦ VinMoment';
    const textW = ctx.measureText(label).width;
    const pillW = textW + pad * 1.6;
    const pillH = pad * 2.1;
    const pillX = w - pillW - pad * 0.8;
    const pillY = pad * 0.8;

    roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pillX + pad * 0.8, pillY + pillH / 2 + 1);
    ctx.textBaseline = 'alphabetic';

    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
}