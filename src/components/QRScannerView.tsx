import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, Loader2, AlertCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode'; 
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore as db } from '../firebase';
import { auth } from "../firebase";  

interface QRScannerViewProps {
  onClose: () => void;
  onScanSuccess: (businessUid: string) => void;
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({ onClose, onScanSuccess }) => {
  // 🟢 FIX: Access currentUser property directly instead of executing auth()
  const user = auth.currentUser;
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader-target",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    const handleScanSuccess = async (decodedText: string) => {
      const businessUid = decodedText.trim();
      if (!businessUid) return;

      scanner.clear();
      setIsVerifying(true);
      setError(null);

      try {
        const businessRef = doc(db, 'businesses', businessUid);
        const businessSnap = await getDoc(businessRef);

        if (businessSnap.exists()) {
          const bizData = businessSnap.data();
          
          if (user?.uid) {
            const recentRef = doc(db, 'customers', user.uid, 'recentBusinesses', businessUid);
            await setDoc(recentRef, {
              businessUid,
              storeName: bizData.storeName || 'Unnamed Store',
              logoUrl: bizData.logoUrl || '',
              bio: bizData.bio || '',
              address: bizData.address || '',
              lastVisited: serverTimestamp()
            }, { merge: true });
          }

          onScanSuccess(businessUid);
        } else {
          setError('Invalid Malvin node asset key. Business registry match failed.');
          setIsVerifying(false);
        }
      } catch (err) {
        setError('Network mapping error connecting to authentication ledger.');
        setIsVerifying(false);
      }
    };

    scanner.render(handleScanSuccess, (_) => {});

    return () => {
      scanner.clear().catch((e) => console.warn("Scanner resource release skipped:", e));
    };
  }, [user, onScanSuccess]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex flex-col justify-between p-6 text-white font-sans"
    >
      <div className="flex items-center justify-between pt-4">
        <div>
          <h3 className="text-lg font-black tracking-tight">Malvin Lens</h3>
          <p className="text-xs text-neutral-400 font-medium">Align QR matrix sequence inside target frame</p>
        </div>
        <button onClick={onClose} className="p-3 bg-neutral-900 rounded-full text-white/80 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center my-auto gap-6">
        <div className="w-full aspect-square bg-neutral-950 rounded-[2.5rem] border border-neutral-800 relative overflow-hidden flex items-center justify-center shadow-2xl">
          {isVerifying ? (
            <div className="flex flex-col items-center gap-3 text-neutral-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#E53935]" />
              <span className="text-xs font-bold uppercase tracking-widest">Validating Registry...</span>
            </div>
          ) : (
            <div id="qr-reader-target" className="w-full h-full" />
          )}
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-2xl p-4 flex items-center gap-3 text-xs font-semibold max-w-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="w-full text-center pb-6 text-[11px] font-bold text-neutral-500 uppercase tracking-widest flex items-center justify-center gap-2">
        <Camera className="w-3.5 h-3.5" />
        <span>Secure hardware scanner active</span>
      </div>
    </motion.div>
  );
};