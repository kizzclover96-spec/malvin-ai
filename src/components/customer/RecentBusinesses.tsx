import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, setDoc, limit, serverTimestamp } from 'firebase/firestore';
import { firestore as db } from '../../firebase'; 
import { auth } from "../../firebase";  
import { Loader2, Store, Trash2, Heart, Share2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VinMoment } from './Vinmoment';

interface RecentBusinessItem {
  id: string;
  businessUid: string;
  customName?: string; 
  storeName: string;
  logoUrl: string;
  bio: string;
  address: string;
}

interface RecentBusinessesProps {
  onSelectBusiness: (uid: string) => void;
  setHasRecentItems: (hasItems: boolean) => void;
}

export const RecentBusinesses: React.FC<RecentBusinessesProps> = ({ onSelectBusiness, setHasRecentItems }) => {
  const user = auth.currentUser;
  const [items, setItems] = useState<RecentBusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Long-press glass action sheet: which item it's open for (if any)
  const [actionSheetItem, setActionSheetItem] = useState<RecentBusinessItem | null>(null);
  // VinMoment share card: which item it's open for (if any)
  const [momentItem, setMomentItem] = useState<RecentBusinessItem | null>(null);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);

  const handleRenameSave = async (id: string) => {
    if (!user?.uid) {
        setEditingId(null);
        return;
    }
    
    try {
        const docRef = doc(db, 'customers', user.uid, 'recentBusinesses', id);
        await setDoc(docRef, { customName: newName.trim() }, { merge: true });
    } catch (err) {
        console.error("Error saving custom nickname:", err);
    } finally {
        setEditingId(null);
        setNewName('');
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const recentRef = collection(db, 'customers', user.uid, 'recentBusinesses');
    const q = query(recentRef, orderBy('lastVisited', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hasRecords = !snapshot.empty;
      setHasRecentItems(hasRecords);

      if (!hasRecords) {
        setItems([]);
        setLoading(false);
        return;
      }

      const resolvedRecords = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          // Fallback directly to document ID to keep tracking keys unique
          businessUid: data.businessUid || docSnapshot.id,
          customName: data.customName || '', 
          storeName: data.storeName || 'Unnamed Store', 
          logoUrl: data.logoUrl || '',
          bio: data.bio || 'Hold down for options.',
          address: data.address || '',
        };
      });

      setItems(resolvedRecords);
      setLoading(false);
    }, (err) => {
      console.error("Live configuration tracking sync interrupted:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, setHasRecentItems]);

  // Track which of these items are already favorited, so the sheet's Like
  // row reflects real saved state instead of just a local click.
  useEffect(() => {
    if (!user?.uid) return;
    const favRef = collection(db, 'customers', user.uid, 'favorites');
    const unsubscribe = onSnapshot(favRef, (snapshot) => {
      setFavoriteIds(new Set(snapshot.docs.map(d => d.id)));
    }, (err) => console.error('Error syncing favorite ids:', err));
    return () => unsubscribe();
  }, [user]);

  const FAVORITES_SOFT_CAP = 50;

  const handleToggleFavorite = async (item: RecentBusinessItem) => {
    if (!user?.uid) return;
    const favRef = doc(db, 'customers', user.uid, 'favorites', item.id);

    if (favoriteIds.has(item.id)) {
      try {
        await deleteDoc(favRef);
      } catch (err) {
        console.error('Error removing favorite:', err);
      }
      return;
    }

    if (favoriteIds.size >= FAVORITES_SOFT_CAP) {
      alert(`You can save up to ${FAVORITES_SOFT_CAP} favorite stores. Remove one first.`);
      return;
    }

    try {
      await setDoc(favRef, {
        businessUid: item.businessUid,
        storeName: item.customName || item.storeName,
        logoUrl: item.logoUrl || '',
        address: item.address || '',
        favoritedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error saving favorite:', err);
    }
  };

  const handleDeleteRecent = async (item: RecentBusinessItem) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, 'customers', user.uid, 'recentBusinesses', item.id));
    } catch (err) {
      console.error(err);
    }
  };

  // --- Long-press detection: opens the glass action sheet instead of a tap ---
  const handlePressStart = (item: RecentBusinessItem) => {
    isLongPressActive.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressActive.current = true;
      if (navigator.vibrate) navigator.vibrate(12);
      setActionSheetItem(item);
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-6">
        <Loader2 className="w-5 h-5 text-[#E53935] animate-spin" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-6 px-4 text-left">
      <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3.5">
        Recent Businesses
      </h3>
      
      <div className="space-y-3.5">
        <AnimatePresence>
            {items.map((item) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    whileTap={{ scale: 0.98 }}
                    onTouchStart={() => handlePressStart(item)}
                    onTouchEnd={handlePressEnd}
                    onMouseDown={() => handlePressStart(item)}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!isLongPressActive.current && editingId !== item.id) {
                          onSelectBusiness(item.businessUid);
                      }
                    }}
                    className="bg-neutral-50/60 border border-neutral-200/40 rounded-[1.75rem] p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors shadow-sm relative group overflow-hidden select-none"
                >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white border border-neutral-100 flex-shrink-0 flex items-center justify-center relative">
                          {item.logoUrl ? (
                          <img src={item.logoUrl} alt={item.customName || item.storeName} className="w-full h-full object-cover" />
                          ) : (
                          <Store className="w-5 h-5 text-neutral-400" />
                          )}
                          {favoriteIds.has(item.id) && (
                            <span className="absolute -bottom-0.5 -right-0.5 bg-[#E53935] rounded-full p-0.5 border-2 border-white">
                              <Heart className="w-2.5 h-2.5 text-white" fill="currentColor" />
                            </span>
                          )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                          {editingId === item.id ? (
                          <input
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              onBlur={() => handleRenameSave(item.id)}
                              onKeyDown={(e) => e.key === 'Enter' && handleRenameSave(item.id)}
                              onClick={(e) => e.stopPropagation()} 
                              className="w-full bg-white border border-[#E53935] text-xs rounded-lg px-2 py-1 focus:outline-none font-bold text-neutral-900"
                              autoFocus
                          />
                          ) : (
                          <div 
                            className="inline-block cursor-text"
                            onClick={(e) => {
                                e.stopPropagation(); 
                                setEditingId(item.id);
                                setNewName(item.customName || item.storeName);
                            }}
                          >
                              <h4 className="text-xs font-black text-neutral-900 truncate leading-tight hover:underline">
                              {item.customName ? item.customName : item.storeName}
                              </h4>
                          </div>
                          )}
                          
                          <p className="text-[11px] font-semibold text-neutral-400 truncate mt-0.5">{item.bio}</p>
                          
                          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">
                            Tap to open • Hold for options
                          </p>
                      </div>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* FLOATING GLASS ACTION CARD — Like, Share, Delete */}
      <AnimatePresence>
        {actionSheetItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActionSheetItem(null)}
            className="fixed inset-0 bg-black/20 backdrop-blur-md z-[70] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[300px] bg-white/75 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-5 overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl overflow-hidden bg-neutral-100 border border-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  {actionSheetItem.logoUrl ? (
                    <img src={actionSheetItem.logoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-5 h-5 text-neutral-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-neutral-900 truncate leading-tight">
                    {actionSheetItem.customName || actionSheetItem.storeName}
                  </h4>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Quick actions</p>
                </div>
                <button
                  onClick={() => setActionSheetItem(null)}
                  className="p-1.5 rounded-full bg-neutral-900/5 text-neutral-500 hover:bg-neutral-900/10 hover:text-neutral-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={() => { handleToggleFavorite(actionSheetItem); setActionSheetItem(null); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-neutral-900/[0.04] transition-colors text-left group"
                >
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    favoriteIds.has(actionSheetItem.id) ? 'bg-[#E53935]/15' : 'bg-neutral-900/[0.06]'
                  }`}>
                    <Heart
                      className={`w-4 h-4 ${favoriteIds.has(actionSheetItem.id) ? 'text-[#E53935]' : 'text-neutral-500'}`}
                      fill={favoriteIds.has(actionSheetItem.id) ? 'currentColor' : 'none'}
                    />
                  </span>
                  <span className="text-[13px] font-bold text-neutral-800">
                    {favoriteIds.has(actionSheetItem.id) ? 'Remove from Favorites' : 'Like this Business'}
                  </span>
                </button>

                <button
                  onClick={() => { setMomentItem(actionSheetItem); setActionSheetItem(null); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-neutral-900/[0.04] transition-colors text-left"
                >
                  <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-cyan-400/25 to-violet-500/25">
                    <Share2 className="w-4 h-4 text-violet-600" />
                  </span>
                  <span className="text-[13px] font-bold text-neutral-800">Share a VinMoment</span>
                </button>

                <div className="h-px bg-neutral-900/[0.06] mx-3 my-1" />

                <button
                  onClick={() => { handleDeleteRecent(actionSheetItem); setActionSheetItem(null); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-rose-500/[0.06] transition-colors text-left"
                >
                  <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-rose-500/10">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </span>
                  <span className="text-[13px] font-bold text-rose-600">Delete Business</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VINMOMENT SHARE CARD */}
      {momentItem && (
        <VinMoment
          businessUid={momentItem.businessUid}
          storeName={momentItem.customName || momentItem.storeName}
          logoUrl={momentItem.logoUrl}
          onClose={() => setMomentItem(null)}
        />
      )}
    </div>
  );
};