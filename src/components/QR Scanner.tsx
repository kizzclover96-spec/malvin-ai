import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QrScannerViewProps {
  onScanSuccess: (decodedText: string) => void;
  onBack: () => void;
}

export const QrScannerView: React.FC<QrScannerViewProps> = ({ onScanSuccess, onBack }) => {
  useEffect(() => {
    // Automatically initializes the device camera inside the div element below
    const scanner = new Html5QrcodeScanner(
      "qr-reader-target",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        // Stop the scanner after a successful scan
        scanner.clear();
        onScanSuccess(decodedText);
      },
      (error) => {
        // Optional: handle scan errors silently or log them
        console.warn(error);
      }
    );

    // Clean up and turn off the camera when the component unmounts
    return () => {
      scanner.clear().catch((error) => console.error("Failed to clear scanner", error));
    };
  }, [onScanSuccess]);

  return (
    <div style={{ padding: '24px', backgroundColor: '#0b0f19', minHeight: '100vh', color: '#fff' }}>
      <button onClick={onBack} style={{ marginBottom: '20px', background: '#374151', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
        ← Back to Terminal
      </button>
      <h2 style={{ textAlign: 'center' }}>Scan Client QR Code</h2>
      
      {/* The camera stream will render right inside this container */}
      <div id="qr-reader-target" style={{ maxWidth: '500px', margin: '0 auto', background: '#111827', borderRadius: '12px', overflow: 'hidden' }}></div>
    </div>
  );
};