import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Camera } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode'; 

interface QRScannerViewProps {
  onClose: () => void;
  onScanSuccess: (businessUid: string) => void;
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({ onClose, onScanSuccess }) => {

  useEffect(() => {
    // Initialize the client-side hardware scanner instance
    const scanner = new Html5QrcodeScanner(
      "qr-reader-target",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    const handleScanSuccess = async (decodedText: string) => {
        let scannedText = decodedText.trim();
        if (!scannedText) return;

        // If it's already just the ID, reconstruct the full URL that your app expects
        if (!scannedText.startsWith('http://') && !scannedText.startsWith('https://')) {
            scannedText = `https://malvinai.com/salon/${scannedText}`;
        }

        try {
            // Kill the scanner active stream instantly upon acquiring data matrix string
            await scanner.clear();
        } catch (e) {
            console.warn("Scanner camera instance cleanup skipped:", e);
        }

        // Pass the full URL to change screen states in Front.tsx
        console.log("🔍 Full URL passed to app:", scannedText);
        onScanSuccess(scannedText);
    };

    scanner.render(handleScanSuccess, (_) => {
      // Verbose scanning logging can be passed here if required for console streams
    });

    return () => {
      scanner.clear().catch((e) => console.warn("Scanner resource release skipped:", e));
    };
  }, [onScanSuccess]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex flex-col justify-between p-6 text-white font-sans"
    >
      {/* TOP HEADER STATUS */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h3 className="text-lg font-black tracking-tight">Malvin Lens</h3>
          <p className="text-xs text-neutral-400 font-medium">Align QR matrix sequence inside target frame</p>
        </div>
        <button onClick={onClose} className="p-3 bg-neutral-900 rounded-full text-white/80 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* HARDWARE VIEWPORT FINDER OVERLAY */}
      <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center my-auto gap-6">
        <div className="w-full aspect-square bg-neutral-950 rounded-[2.5rem] border border-neutral-800 relative overflow-hidden flex items-center justify-center shadow-2xl">
          <div id="qr-reader-target" className="w-full h-full" />
        </div>
      </div>

      {/* SECURE ACTIVE SIGNATURE FOOTER */}
      <div className="w-full text-center pb-6 text-[11px] font-bold text-neutral-500 uppercase tracking-widest flex items-center justify-center gap-2">
        <Camera className="w-3.5 h-3.5" />
        <span>Secure hardware scanner active</span>
      </div>
    </motion.div>
  );
};