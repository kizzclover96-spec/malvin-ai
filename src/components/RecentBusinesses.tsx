import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { firestore as db } from '../firebase'; // Adjust to match your export path
import { auth } from "../firebase";  
import { MapPin, ArrowRight, Loader2, Store } from 'lucide-react';
import { motion } from 'framer-motion';

interface RecentBusinessItem {
  id: string;
  businessUid: string;
  storeName: string;
  logoUrl: string;
  bio: string;
  address: string;
}

interface RecentBusinessesProps {
  onSelectBusiness: (uid: string) => void;
}

export const RecentBusinesses: React.FC<RecentBusinessesProps> = ({ onSelectBusiness }) => {
  const user = auth.currentUser;
  const [items, setItems] = useState<RecentBusinessItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Realtime connection pipeline ordered by the newest visit timestamp first
    const recentRef = collection(db, 'customers', user.uid, 'recentBusinesses');
    const q = query(recentRef, orderBy('lastVisited', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: RecentBusinessItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        records.push({
          id: doc.id,
          businessUid: data.businessUid,
          storeName: data.storeName || 'Unnamed Store',
          logoUrl: data.logoUrl || '',
          bio: data.bio || '',
          address: data.address || ''
        });
      });
      setItems(records);
      setLoading(false);
    }, (err) => {
      console.error("Live configuration tracking sync interrupted:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="w-full flex justify-center py-6">
        <Loader2 className="w-5 h-5 text-[#E53935] animate-spin" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-8 px-4 text-left">
      <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3.5">
        Recent Businesses
      </h3>
      
      <div className="space-y-3.5">
        {items.map((item) => (
          <motion.div
            key={item.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectBusiness(item.businessUid)}
            className="bg-neutral-50/60 border border-neutral-200/40 rounded-[1.75rem] p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3.5 min-w-[75%]">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white border border-neutral-100 flex-shrink-0 flex items-center justify-center">
                {item.logoUrl ? (
                  <img src={item.logoUrl} alt={item.storeName} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-5 h-5 text-neutral-400" />
                )}
              </div>
              <div className="truncate">
                <h4 className="text-xs font-black text-neutral-900 truncate leading-tight">{item.storeName}</h4>
                <p className="text-[11px] font-semibold text-neutral-400 truncate mt-0.5">{item.bio || 'No status bio catalogued.'}</p>
                <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wide mt-1.5">
                  <MapPin className="w-3 h-3 text-[#E53935]" />
                  <span className="truncate">{item.address || 'Global Location'}</span>
                </div>
              </div>
            </div>

            <div className="p-2 bg-white border border-neutral-100 rounded-full text-neutral-400">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};