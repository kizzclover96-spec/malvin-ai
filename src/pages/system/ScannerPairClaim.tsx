import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, onValue, update, remove, onDisconnect, serverTimestamp } from "firebase/database";
import { db as rtdb, auth } from "../../firebase";
import { signInAnonymously } from "firebase/auth";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CheckCircle2, XCircle, ScanLine } from "lucide-react";

/* ============================================================================
   ScannerPairClaim
   Opened when a guest device scans the "connect a camera" QR code shown in
   B-Vin's top pill. Claims temporary confirm-scanner access to a single
   business for the lifetime of this tab: the session is torn down
   automatically the moment the tab closes or loses connection
   (onDisconnect), so there's nothing to manually revoke.
============================================================================ */

type SessionStatus = "checking" | "expired" | "ready" | "scanning";

const ScannerPairClaim: React.FC = () => {
  const { businessId, sessionId } = useParams<{ businessId: string; sessionId: string }>();
  const [status, setStatus] = useState<SessionStatus>("checking");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = "bvin-scanner-claim-viewport";

  const sessionPath = businessId && sessionId ? `scannerSessions/${businessId}/${sessionId}` : null;

  // Verify the session still exists (hasn't expired / been revoked) before
  // offering to claim it. A guest arriving here has no prior relationship
  // with this app at all, so this signs them in anonymously first — same
  // convention as VinBackScan.tsx for the same reason: the RTDB rules for
  // this path require *some* signed-in session (anonymous is fine) before
  // allowing read/write, since a stranger reading/writing here is exactly
  // the point of a temporary scanner-pairing link.
  useEffect(() => {
    if (!sessionPath) {
      setStatus("expired");
      return;
    }
    let unsub = () => {};
    (async () => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Anonymous sign-in failed:", err);
          setStatus("expired");
          return;
        }
      }
      const sRef = ref(rtdb, sessionPath);
      unsub = onValue(
        sRef,
        (snap) => {
          const val = snap.val();
          if (!val || (val.expiresAt && val.expiresAt < Date.now() && val.status !== "claimed")) {
            setStatus((prev) => (prev === "scanning" ? prev : "expired"));
            return;
          }
          setStatus((prev) => (prev === "checking" ? "ready" : prev));
        },
        () => setStatus("expired")
      );
    })();
    return () => unsub();
  }, [sessionPath]);

  const claimAndStartScanning = async () => {
    if (!sessionPath) return;
    setError(null);
    try {
      await update(ref(rtdb, sessionPath), { status: "claimed", claimedAt: serverTimestamp() });
      // Tear the whole session down the instant this tab disconnects —
      // that's what makes the access genuinely temporary.
      onDisconnect(ref(rtdb, sessionPath)).remove();

      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          setLastScanned(decodedText);
          if (sessionPath) {
            update(ref(rtdb, sessionPath), {
              lastScan: { value: decodedText, at: Date.now() },
            }).catch(() => {});
          }
        },
        () => {
          /* per-frame decode misses — expected constantly, ignore */
        }
      );
      setStatus("scanning");
    } catch (err: any) {
      setError(err?.message || "Couldn't access the camera. Check camera permissions and try again.");
    }
  };

  const disconnect = async () => {
    try {
      await scannerRef.current?.stop();
      scannerRef.current?.clear();
    } catch {
      /* already stopped */
    }
    if (sessionPath) remove(ref(rtdb, sessionPath)).catch(() => {});
    setStatus("expired");
  };

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#141414 0%,#0c0c0c 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
      }}
    >
      {status === "checking" && <p style={{ opacity: 0.6, fontSize: 13 }}>Checking invite…</p>}

      {status === "expired" && (
        <div>
          <XCircle size={36} color="#ff8a8a" style={{ marginBottom: 10 }} />
          <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>This invite has expired</h2>
          <p style={{ fontSize: 13, opacity: 0.6, maxWidth: 280 }}>
            Ask the business to open the scanner connect popup again and scan a fresh code.
          </p>
        </div>
      )}

      {status === "ready" && (
        <div style={{ maxWidth: 320 }}>
          <Camera size={32} color="#22c55e" style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>Connect this device as a scanner</h2>
          <p style={{ fontSize: 13, opacity: 0.65, marginBottom: 20 }}>
            This gives your camera temporary access to confirm scans for this business. Access ends automatically
            when you close this tab.
          </p>
          {error && <p style={{ fontSize: 12, color: "#ff8a8a", marginBottom: 14 }}>{error}</p>}
          <button
            onClick={claimAndStartScanning}
            style={{
              background: "#22c55e",
              color: "#06210f",
              border: "none",
              borderRadius: 14,
              padding: "13px 24px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Connect camera
          </button>
        </div>
      )}

      {status === "scanning" && (
        <div style={{ width: "100%", maxWidth: 340 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}>
            <CheckCircle2 size={16} color="#22c55e" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>Connected</span>
          </div>
          <div
            id={elementId}
            style={{
              width: "100%",
              borderRadius: 20,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.14)",
              marginBottom: 14,
            }}
          />
          {lastScanned && (
            <div
              style={{
                fontSize: 12,
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(34,197,94,0.14)",
                color: "#22c55e",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
                wordBreak: "break-all",
              }}
            >
              <ScanLine size={14} /> {lastScanned}
            </div>
          )}
          <button
            onClick={disconnect}
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 14,
              padding: "11px 20px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default ScannerPairClaim;