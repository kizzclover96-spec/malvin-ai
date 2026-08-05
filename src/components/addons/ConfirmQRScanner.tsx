import React, { useState, useCallback } from 'react';
import { ShieldCheck, X, Camera, VideoOff } from 'lucide-react';
import { useQrScanner, scannerStatusMessage } from '../../hooks/useQrScanner';

interface ConfirmQRScannerProps {
  onCrosscheck: (id: string) => void;
  onClose: () => void;
}

export default function ConfirmQRScanner({ onCrosscheck, onClose }: ConfirmQRScannerProps) {
  const [ticketInput, setTicketInput] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleDecode = useCallback((decodedText: string) => {
    onCrosscheck(decodedText);
    setIsCameraActive(false);
  }, [onCrosscheck]);

  const { status, retry } = useQrScanner({
    elementId: 'qr-reader',
    active: isCameraActive,
    onDecode: handleDecode,
  });

  const scannerMessage = scannerStatusMessage(status);
  const scannerFailed = status === 'denied' || status === 'unavailable' || status === 'error';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketInput.trim()) {
      onCrosscheck(ticketInput.trim());
      setTicketInput('');
    }
  };

  return (
    <div style={{
      background: "#0c0c0c",
      borderBottom: "2px solid #E53935",
      padding: "20px 32px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      animation: "slideDown 0.25s ease-out",
      width: "100%",
      boxSizing: "border-box"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={18} color="#4BB543" />
          <span style={{ fontSize: "14px", fontWeight: "bold", color: "#aaa" }}>Anti-Fraud Ticket Verification Panel</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer" }}>
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input 
            type="text" 
            placeholder="Type 4-Digit Code or Scan Receipt ID..." 
            value={ticketInput}
            onChange={(e) => setTicketInput(e.target.value)}
            style={{ 
              background: "#111", 
              border: "1px solid #333", 
              borderRadius: "8px", 
              padding: "10px 16px", 
              paddingRight: "40px",
              color: "#fff", 
              width: "100%", 
              fontSize: "14px",
              boxSizing: "border-box"
            }}
            autoFocus
          />
          <button 
            type="button"
            onClick={() => setIsCameraActive(!isCameraActive)}
            style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: isCameraActive ? "#E53935" : "#555", cursor: "pointer", display: "flex", alignItems: "center", padding: "6px" }}
            title="Toggle Live Camera Stream View"
          >
            {isCameraActive ? <VideoOff size={18} /> : <Camera size={18} />}
          </button>
        </div>
        <button 
          type="submit"
          style={{ 
            background: "#E53935", 
            border: "none", 
            color: "#fff", 
            borderRadius: "8px", 
            padding: "10px 24px", 
            fontWeight: "bold", 
            cursor: "pointer", 
            fontSize: "13px",
            whiteSpace: "nowrap"
          }}
        >
          Crosscheck
        </button>
      </form>

      {/* Helper label indicating double verification support */}
      <p style={{ fontSize: '11px', color: '#666', textAlign: 'center', margin: '0' }}>
        Tip: You can manually type the customer's unique 4-digit code or scan the ticket's QR code.
      </p>

      {/* Camera target mount zone */}
      {isCameraActive && (
        <div style={{ width: "100%", maxWidth: "400px", margin: "12px auto 0 auto", background: "#111", borderRadius: "12px", overflow: "hidden", border: "1px solid #222" }}>
          <div id="qr-reader" style={{ width: "100%" }}></div>

          {scannerMessage && (
            <div style={{ padding: "12px 16px", textAlign: "center" }}>
              <p style={{ fontSize: "12px", color: scannerFailed ? "#f87171" : "#888", lineHeight: 1.5, margin: 0 }}>
                {scannerMessage}
              </p>
              {scannerFailed && (
                <button
                  type="button"
                  onClick={retry}
                  style={{ marginTop: "10px", background: "#E53935", color: "#fff", border: "none", padding: "6px 18px", borderRadius: "999px", fontWeight: "bold", fontSize: "11px", cursor: "pointer" }}
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}