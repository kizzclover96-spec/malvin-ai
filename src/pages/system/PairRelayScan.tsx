import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, onValue, onDisconnect } from "firebase/database";
import { db as rtdb, auth } from "../../firebase";
import { signInAnonymously } from "firebase/auth";
import { Camera, CheckCircle2, XCircle } from "lucide-react";
import { submitRelayScan } from "../../utils/devicePairing";
import { useQrScanner, scannerStatusMessage } from "../../hooks/useQrScanner";

/* ============================================================================
   PairRelayScan — opened when a phone scans the "use my phone as an
   external camera" QR from DeviceConnectPanel. This phone's camera scans
   the ORIGINAL device's pairing QR (point it at that screen), and the
   decoded value is relayed back over RTDB so the original device can
   finish the connection exactly as if it had scanned it directly.
   Same disposable-session convention as ScannerPairClaim.tsx.

   Camera lifecycle is owned by useQrScanner — the same hook the rest of
   the app's scanners use, which correctly guards against calling
   html5-qrcode's stop() on an already-stopped instance (the bug that
   used to crash this exact flow when hand-rolled here directly).
============================================================================ */

type Status = "checking" | "expired" | "ready" | "scanning" | "done";

const PairRelayScan: React.FC = () => {
  const { relayId } = useParams<{ relayId: string }>();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const elementId = "pair-relay-scan-viewport";
  const relayPath = relayId ? `pairRelay/${relayId}` : null;

  useEffect(() => {
    if (!relayPath) { setStatus("expired"); return; }
    let unsub = () => {};
    (async () => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch {
          setStatus("expired");
          return;
        }
      }
      const rRef = ref(rtdb, relayPath);
      unsub = onValue(
        rRef,
        (snap) => {
          const val = snap.val();
          if (!val || (val.expiresAt && val.expiresAt < Date.now() && val.status !== "done")) {
            setStatus((p) => (p === "scanning" || p === "done" ? p : "expired"));
            return;
          }
          setStatus((p) => (p === "checking" ? "ready" : p));
        },
        () => setStatus("expired")
      );
    })();
    return () => unsub();
  }, [relayPath]);

  const onDecode = async (decodedText: string) => {
    if (!relayId) return;
    try {
      await submitRelayScan(relayId, decodedText);
      setStatus("done");
    } catch (err: any) {
      setError(err?.message || "Couldn't relay the scan. Check your connection and try again.");
    }
  };

  const { status: scanStatus } = useQrScanner({
    elementId,
    active: status === "scanning",
    onDecode,
  });

  const startScanning = () => {
    if (!relayPath) return;
    setError(null);
    onDisconnect(ref(rtdb, relayPath)).remove();
    setStatus("scanning");
  };

  const shellStyle: React.CSSProperties = {
    minHeight: "100dvh", background: "linear-gradient(180deg,#F7F9FC,#EEF2F8)", color: "#0F172A",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", textAlign: "center",
  };

  if (status === "checking") return <div style={shellStyle}><p style={{ opacity: 0.5, fontSize: 13 }}>Checking…</p></div>;

  if (status === "expired") {
    return (
      <div style={shellStyle}>
        <XCircle size={32} color="#EF4444" style={{ marginBottom: 10 }} />
        <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>This link has expired</h2>
        <p style={{ fontSize: 13, color: "#64748B", maxWidth: 280 }}>Go back to the other device and try again.</p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div style={shellStyle}>
        <CheckCircle2 size={34} color="#16A34A" style={{ marginBottom: 10 }} />
        <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>Scanned</h2>
        <p style={{ fontSize: 13, color: "#64748B", maxWidth: 280 }}>Head back to the other device — it'll pick this up automatically.</p>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div style={shellStyle}>
        <div style={{ maxWidth: 300 }}>
          <Camera size={30} color="#2563EB" style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>Use this phone as a camera</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 18 }}>
            Point your camera at the QR code on the other device's screen.
          </p>
          {error && <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{error}</p>}
          <button onClick={startScanning} style={{ width: "100%", background: "#2563EB", color: "#fff", border: "none", borderRadius: 14, padding: "13px 20px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            Open Camera
          </button>
        </div>
      </div>
    );
  }

  // scanning
  return (
    <div style={shellStyle}>
      <div style={{ width: "100%", maxWidth: 340 }}>
        <div id={elementId} style={{ width: "100%", borderRadius: 20, overflow: "hidden", border: "1px solid #DCE3ED", marginBottom: 14 }} />
        {error && <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 8 }}>{error}</p>}
        {scannerStatusMessage(scanStatus) && <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 8 }}>{scannerStatusMessage(scanStatus)}</p>}
        <p style={{ fontSize: 12, color: "#64748B" }}>Point at the other device's QR code…</p>
      </div>
    </div>
  );
};

export default PairRelayScan;