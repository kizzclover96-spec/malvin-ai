import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageSquare, ShoppingBag, ArrowLeft, Loader2, MapPin, Store } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore as db } from '../firebase'; // Adjust to match your export path
import { auth } from "../firebase"; 

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

interface StoreFrontProps {
  businessUid: string;
  onExit: () => void;
}

export const StoreFront: React.FC<StoreFrontProps> = ({ businessUid, onExit }) => {
  const user = auth.currentUser;
  const [storeData, setStoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const docRef = doc(db, 'businesses', businessUid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setStoreData(snap.data());
        }
      } catch (err) {
        console.error("Error reading storefront node ledger:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, [businessUid]);

  const handleExitPipeline = async () => {
    if (user?.uid && storeData) {
      try {
        // Enforce automatic saving into Recent Businesses profile tracking layer on exit
        const recentRef = doc(db, 'customers', user.uid, 'recentBusinesses', businessUid);
        await setDoc(recentRef, {
          businessUid,
          storeName: storeData.storeName || 'Unnamed Store',
          logoUrl: storeData.logoUrl || '',
          bio: storeData.bio || '',
          address: storeData.address || '',
          lastVisited: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("Failed tracking context state allocation telemetry update on exit:", err);
      }
    }
    onExit();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#E53935] animate-spin" />
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-bold text-neutral-400">Store metadata asset block unavailable.</p>
        <button onClick={onExit} className="mt-4 text-xs font-black text-[#E53935] uppercase tracking-widest">Return Home</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="min-h-screen bg-white text-black font-sans pb-12 overflow-y-auto"
    >
      {/* COVER BANNER HEADER ROW */}
      <div className="w-full relative h-48 bg-neutral-100 overflow-hidden">
        {storeData.bannerUrl && (
          <img src={storeData.bannerUrl} alt="Cover Banner" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        
        <button 
          onClick={handleExitPipeline}
          className="absolute top-6 left-6 p-3 bg-white/90 backdrop-blur-md rounded-full shadow-md text-neutral-800 hover:bg-white active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* CORE IDENTITY HEADER SEGMENT */}
      <div className="px-6 -mt-12 relative z-10 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-[2rem] bg-white border-4 border-white overflow-hidden shadow-xl flex items-center justify-center">
          {storeData.logoUrl ? (
            <img src={storeData.logoUrl} alt={storeData.storeName} className="w-full h-full object-cover" />
          ) : (
            <Store className="w-10 h-10 text-neutral-300" />
          )}
        </div>

        <h1 className="text-2xl font-black text-neutral-900 tracking-tight mt-3">{storeData.storeName}</h1>
        <p className="text-xs font-semibold text-neutral-500 max-w-sm mt-1.5 px-2">{storeData.bio || 'No description bio provided.'}</p>
        
        <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-bold uppercase tracking-wider mt-3">
          <MapPin className="w-3.5 h-3.5 text-[#E53935]" />
          <span>{storeData.address || 'Global Workspace Address'}</span>
        </div>
      </div>

      {/* ACTIONS INTERFACE GRID */}
      <div className="px-6 mt-6 grid grid-cols-3 gap-3 max-w-md mx-auto">
        <motion.button 
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsFollowing(!isFollowing)}
          className={`py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${
            isFollowing ? 'bg-neutral-100 border-neutral-200 text-neutral-700' : 'bg-black border-black text-white shadow-sm'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFollowing ? 'fill-[#E53935] text-[#E53935]' : ''}`} />
          <span>{isFollowing ? 'Following' : 'Follow'}</span>
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.96 }}
          className="py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl font-black text-xs uppercase tracking-widest text-neutral-800 flex items-center justify-center gap-1.5 hover:bg-neutral-100 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
          <span>Contact</span>
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.96 }}
          className="py-3.5 bg-[#E53935] border border-[#E53935] rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-[0_8px_20px_rgba(229,57,53,0.15)] flex items-center justify-center gap-1.5"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Shop</span>
        </motion.button>
      </div>

      {/* PRODUCT PORTFOLIO SHOWCASE */}
      <div className="mt-10 px-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Products Portfolio</h3>
          <span className="text-[10px] font-black text-[#E53935] uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-md">Live Catalogue</span>
        </div>

        {storeData.products && storeData.products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {storeData.products.map((product: Product) => (
              <div key={product.id} className="bg-neutral-50 border border-neutral-200/60 rounded-[1.5rem] p-3 flex flex-col justify-between overflow-hidden shadow-sm">
                <div className="w-full aspect-square bg-white rounded-xl overflow-hidden mb-2.5 border border-neutral-100">
                  <img src={product.imageUrl || 'https://via.placeholder.com/150'} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <h4 className="text-xs font-black text-neutral-800 truncate px-0.5">{product.name}</h4>
                <div className="flex items-center justify-between mt-1 px-0.5">
                  <span className="text-xs font-black text-neutral-900">€{product.price.toFixed(2)}</span>
                  <button className="p-1.5 bg-white border border-neutral-200 text-neutral-600 rounded-lg hover:text-black hover:border-neutral-300 shadow-sm transition-colors">
                    <ShoppingBag className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-neutral-50 rounded-[1.75rem] border border-dashed border-neutral-200">
            <p className="text-xs font-bold text-neutral-400">No active items tracked in current inventory block.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};