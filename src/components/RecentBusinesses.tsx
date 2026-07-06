import React, { useState, useEffect, useRef } from 'react';
// 🟢 Fixed typo: replaced 'deleteDo' with 'deleteDoc' and added 'setDoc'
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { firestore as db } from '../firebase'; 
import { auth } from "../firebase";  
import { MapPin, ArrowRight, Loader2, Store, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);

  const handleRenameSave = async (id: string) => {
    if (!user?.uid || !newName.trim()) {
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
    const q = query(recentRef, orderBy('lastVisited', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
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
          businessUid: data.businessUid || docSnapshot.id,
          customName: data.customName || '', 
          storeName: data.customName || data.storeName || 'Unnamed Store', 
          logoUrl: data.logoUrl || '',
          bio: data.bio || 'Hold down to copy link address.',
          address: data.address || 'Saved Location Matrix',
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

  const handleTouchStart = (url: string) => {
    isLongPressActive.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressActive.current = true;
      navigator.clipboard.writeText(url)
        .then(() => alert(`Copied store link to clipboard!\n${url}`))
        .catch((err) => console.error("Clipboard copy failed:", err));
    }, 750); 
  };

  const handleTouchEnd = () => {
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
                    onTouchStart={() => handleTouchStart(item.businessUid)}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={() => handleTouchStart(item.businessUid)}
                    onMouseUp={handleTouchEnd}
                    onClick={() => {
                      if (!isLongPressActive.current && editingId !== item.id) {
                          onSelectBusiness(item.businessUid);
                      }
                    }}
                    className="bg-neutral-50/60 border border-neutral-200/40 rounded-[1.75rem] p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors shadow-sm relative group overflow-hidden select-none"
                >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white border border-neutral-100 flex-shrink-0 flex items-center justify-center">
                          {item.logoUrl ? (
                          <img src={item.logoUrl} alt={item.storeName} className="w-full h-full object-cover" />
                          ) : (
                          <Store className="w-5 h-5 text-neutral-400" />
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
                          <div className="flex items-center gap-2 group/title">
                              <h4 className="text-xs font-black text-neutral-900 truncate leading-tight">
                              {item.storeName}
                              </h4>
                              <span 
                              onClick={(e) => {
                                  e.stopPropagation(); 
                                  setEditingId(item.id);
                                  setNewName(item.customName || item.storeName);
                              }}
                              className="text-[10px] text-[#E53935] font-bold opacity-0 group-hover/title:opacity-100 cursor-pointer px-1 hover:underline"
                              >
                              (Edit)
                              </span>
                          </div>
                          )}
                          
                          <p className="text-[11px] font-semibold text-neutral-400 truncate mt-0.5">{item.bio}</p>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wide mt-1.5">
                            <MapPin className="w-3 h-3 text-[#E53935]" />
                            <span className="truncate">{item.address}</span>
                          </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                          onClick={(e) => {
                          e.stopPropagation();
                          if (!user?.uid) return;
                          const targetDocRef = doc(db, 'customers', user.uid, 'recentBusinesses', item.id);
                          deleteDoc(targetDocRef).catch(err => console.error(err));
                          }}
                          className="p-2 hover:bg-rose-50 text-neutral-400 hover:text-[#E53935] rounded-xl transition-colors md:opacity-0 group-hover:opacity-100"
                      >
                          <Trash2 className="w-4 h-4" />
                      </button>
                      
                      <div className="p-2 bg-white border border-neutral-100 rounded-full text-neutral-400 shadow-sm">
                          <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
};