import React, { useCallback, useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore as db, auth } from '../../firebase';
import { useQrScanner, scannerStatusMessage } from '../../hooks/useQrScanner';
import { decodeOrderQr, OrderQrPayload } from '../../utils/orderQr';

interface QrScannerViewProps {
  onScanSuccess: (decodedText: string) => void;
  onBack: () => void;
  /** The manager/business this worker is scanning on behalf of — needed to
      file a scanned order under the right business/{uid}/manualOrders. */
  businessUid: string;
}

export const QrScannerView: React.FC<QrScannerViewProps> = ({ onScanSuccess, onBack, businessUid }) => {
  // Set once a scanned code turns out to be a customer order QR (not the
  // one they'd pay for) — pauses the camera and shows the order instead.
  const [scannedOrder, setScannedOrder] = useState<OrderQrPayload | null>(null);
  const [seatStep, setSeatStep] = useState(false);
  const [seatNumber, setSeatNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentUserId = auth.currentUser?.uid;
  const workerName = auth.currentUser?.displayName || auth.currentUser?.email || 'Staff';

  const handleDecode = useCallback((decodedText: string) => {
    const order = decodeOrderQr(decodedText);
    if (order) {
      setScannedOrder(order);
      return;
    }
    onScanSuccess(decodedText);
  }, [onScanSuccess]);

  const { status, retry } = useQrScanner({
    elementId: 'qr-reader-target',
    active: !scannedOrder,
    onDecode: handleDecode,
  });

  const message = scannerStatusMessage(status);
  const failed = status === 'denied' || status === 'unavailable' || status === 'error';

  const orderTotal = scannedOrder ? scannedOrder.total : 0;

  const resetToScanning = () => {
    setScannedOrder(null);
    setSeatStep(false);
    setSeatNumber('');
    setSubmitError(null);
  };

  const sendToAllOrders = async (withSeat: boolean) => {
    if (!scannedOrder || !businessUid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await addDoc(collection(db, 'business', businessUid, 'manualOrders'), {
        source: 'scanned',
        items: scannedOrder.items,
        total: scannedOrder.total,
        seatNumber: withSeat && seatNumber.trim() ? seatNumber.trim() : null,
        workerUid: currentUserId || '',
        workerName,
        createdAt: serverTimestamp(),
        status: 'Pending',
      });
      resetToScanning();
      onBack();
    } catch (error) {
      console.error('Failed to send scanned order:', error);
      setSubmitError("Couldn't send this order. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0b0f19', minHeight: '100vh', color: '#fff' }}>
      <button onClick={onBack} style={{ marginBottom: '20px', background: '#374151', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
        ← Back to Terminal
      </button>

      {!scannedOrder ? (
        <>
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
        </>
      ) : (
        <div style={{ maxWidth: '440px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 4 }}>Customer Order</h2>
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: 0, marginBottom: 20 }}>
            Scanned from the customer's device — nothing has been charged.
          </p>

          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '16px', marginBottom: 20 }}>
            {scannedOrder.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < scannedOrder.items.length - 1 ? '1px solid #1f2937' : 'none' }}>
                <span style={{ fontSize: '13.5px' }}>{item.quantity}x {item.name}</span>
                <span style={{ fontSize: '13.5px', color: '#9ca3af' }}>€{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 8, borderTop: '1px solid #1f2937', fontWeight: 700 }}>
              <span>Total</span>
              <span>€{orderTotal.toFixed(2)}</span>
            </div>
          </div>

          {!seatStep ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={resetToScanning}
                style={{ flex: 1, background: 'transparent', color: '#9ca3af', border: '1px solid #1f2937', padding: '12px 0', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => setSeatStep(true)}
                style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 0', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Continue
              </button>
            </div>
          ) : (
            <>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: 6 }}>Seat / table number (optional)</label>
              <input
                type="text"
                value={seatNumber}
                onChange={(e) => setSeatNumber(e.target.value)}
                placeholder="e.g. 12"
                autoFocus
                style={{ width: '100%', background: '#0b0f19', border: '1px solid #1f2937', borderRadius: '8px', padding: '12px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
              />
              {submitError && <p style={{ color: '#f87171', fontSize: '12.5px', marginBottom: 10 }}>{submitError}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => sendToAllOrders(true)}
                  disabled={submitting}
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 0', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Sending…' : 'Send'}
                </button>
                <button
                  onClick={() => sendToAllOrders(false)}
                  disabled={submitting}
                  style={{ background: 'transparent', color: '#9ca3af', border: '1px solid #1f2937', padding: '12px 0', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Send without seat number
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};