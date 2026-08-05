import React, { useCallback } from 'react';
import { useQrScanner, scannerStatusMessage } from '../../hooks/useQrScanner';

interface QrScannerViewProps {
  onScanSuccess: (decodedText: string) => void;
  onBack: () => void;
}

export const QrScannerView: React.FC<QrScannerViewProps> = ({ onScanSuccess, onBack }) => {
  const handleDecode = useCallback((decodedText: string) => {
    onScanSuccess(decodedText);
  }, [onScanSuccess]);

  const { status, retry } = useQrScanner({
    elementId: 'qr-reader-target',
    active: true,
    onDecode: handleDecode,
  });

  const message = scannerStatusMessage(status);
  const failed = status === 'denied' || status === 'unavailable' || status === 'error';

  return (
    <div style={{ padding: '24px', backgroundColor: '#0b0f19', minHeight: '100vh', color: '#fff' }}>
      <button onClick={onBack} style={{ marginBottom: '20px', background: '#374151', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
        ← Back to Terminal
      </button>
      <h2 style={{ textAlign: 'center' }}>Scan Client QR Code</h2>

      {/* The camera stream will render right inside this container */}
      <div id="qr-reader-target" style={{ maxWidth: '500px', margin: '0 auto', background: '#111827', borderRadius: '12px', overflow: 'hidden' }}></div>

      {message && (
        <div style={{ maxWidth: '500px', margin: '16px auto 0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: failed ? '#f87171' : '#9ca3af', lineHeight: 1.5, margin: 0 }}>
            {message}
          </p>
          {failed && (
            <button
              onClick={retry}
              style={{ marginTop: '12px', background: '#fff', color: '#000', border: 'none', padding: '8px 20px', borderRadius: '999px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
};
