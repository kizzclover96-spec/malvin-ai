import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, AlertCircle } from 'lucide-react';
import { useQrScanner, scannerStatusMessage } from '../../hooks/useQrScanner';

interface QRScannerViewProps {
  onClose: () => void;
  onScanSuccess: (businessUid: string) => void;
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({ onClose, onScanSuccess }) => {

  const handleDecode = useCallback((decodedText: string) => {
    let scannedText = decodedText.trim();
    if (!scannedText) return;

    // If it's already just the ID, reconstruct the full URL that your app expects
    if (!scannedText.startsWith('http://') && !scannedText.startsWith('https://')) {
        scannedText = `https://malvinai.com/salon/${scannedText}`;
    }

    console.log("🔍 Full URL passed to app:", scannedText);
    onScanSuccess(scannedText);
  }, [onScanSuccess]);

  const { status, retry } = useQrScanner({
    elementId: 'qr-reader-target',
    active: true,
    onDecode: handleDecode,
  });

  const message = scannerStatusMessage(status);
  const failed = status === 'denied' || status === 'unavailable' || status === 'error';

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
          <p className="text-xs text-neutral-400 font-medium">Please ensure vinqr is in the scanner bracket</p>
        </div>
        <button onClick={onClose} className="p-3 bg-neutral-900 rounded-full text-white/80 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* HARDWARE VIEWPORT FINDER OVERLAY */}
      <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center my-auto gap-6">
        <div className="w-full aspect-square bg-neutral-950 rounded-[2.5rem] border border-neutral-800 relative overflow-hidden flex items-center justify-center shadow-2xl">
          <div id="qr-reader-target" className="w-full h-full" />

          {/* Sits over the (empty) preview whenever the camera isn't running,
              so a denied permission reads as an explanation instead of a
              black square. */}
          {status !== 'scanning' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center bg-neutral-950/90">
              {failed && <AlertCircle className="w-7 h-7 text-red-500" />}
              <p className="text-xs text-neutral-300 leading-relaxed">{message}</p>
              {failed && (
                <button
                  onClick={retry}
                  className="mt-1 px-4 py-2 rounded-full bg-white text-black text-xs font-bold"
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECURE ACTIVE SIGNATURE FOOTER */}
      <div className="w-full text-center pb-6 text-[11px] font-bold text-neutral-500 uppercase tracking-widest flex items-center justify-center gap-2">
        <Camera className="w-3.5 h-3.5" />
        <span>{status === 'scanning' ? 'Scanner is active' : 'Scanner idle'}</span>
      </div>
    </motion.div>
  );
};
