import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, onValue, update, remove, onDisconnect, serverTimestamp } from "firebase/database";
import { doc, setDoc } from "firebase/firestore";
import { db as rtdb, auth, firestore } from "../../firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Check, LogOut } from "lucide-react";
import { claimDevicePairing, markDevicePairingConnected, endDevicePairing } from "../../utils/devicePairing";
import PairingDebugPanel from "../../components/business/PairingDebugPanel";

/* ============================================================================
   DevicePairClaim — the page a QR scan (or a relay-scanned phone) lands on.
   Mirrors ScannerPairClaim.tsx's structure/RTDB lifecycle conventions, but
   for linking two real Malvin accounts rather than borrowing a camera —
   so unlike that flow, this requires a REAL signed-in session, not
   anonymous: connecting an account to another account is a meaningful,
   persistent action, not a temporary camera loan.
============================================================================ */

type Phase = "checking" | "expired" | "needsSignIn" | "confirm" | "connecting" | "tip" | "success" | "display";

// Local error boundary — the app-wide Sentry boundary in main.jsx only ever
// shows a generic "Something went wrong. Please reload the page.", which is
// exactly useless for debugging THIS feature. Catching render errors here
// instead means a crash shows the real error text next to the debug panel,
// rather than losing the whole diagnostic picture to the generic fallback.
class PairingErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100dvh", background: "#F7F9FC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", textAlign: "center" }}>
          <h2 style={{ fontSize: 16, margin: "0 0 8px", color: "#0F172A" }}>Pairing screen crashed</h2>
          <p style={{ fontSize: 12.5, color: "#64748B", maxWidth: 320 }}>{this.state.error.message}</p>
          <PairingDebugPanel role="Secondary" paired={false} lastEvent="RENDER_CRASH" error={this.state.error.message} />
        </div>
      );
    }
    return this.props.children;
  }
}

const DevicePairClaim: React.FC = () => (
  <PairingErrorBoundary>
    <DevicePairClaimInner />
  </PairingErrorBoundary>
);

const DevicePairClaimInner: React.FC = () => {
  const { hostUid, token } = useParams<{ hostUid: string; token: string }>();
  const [phase, setPhase] = useState<Phase>("checking");
  const [mirror, setMirror] = useState<{ tab: string; label: string } | null>(null);
  const [hostLabel, setHostLabel] = useState<string>("this account");
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [error, setError] = useState<string | null>(null);
  const sessionPath = hostUid && token ? `devicePairing/${hostUid}/${token}` : null;
  const claimedRef = useRef(false);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  useEffect(() => {
    if (phase !== "display" || !hostUid) return;
    const unsub = onValue(ref(rtdb, `mirror/${hostUid}`), (snap) => setMirror(snap.val()));
    return () => unsub();
  }, [phase, hostUid]);

  useEffect(() => {
    if (!sessionPath) { setPhase("expired"); return; }
    const sRef = ref(rtdb, sessionPath);
    const unsub = onValue(
      sRef,
      (snap) => {
        const val = snap.val();
        if (!val || (val.expiresAt && val.expiresAt < Date.now() && val.status === "pending")) {
          setPhase((p) => (p === "checking" ? "expired" : p));
          return;
        }
        setHostLabel(val.hostLabel || "this account");
        setPhase((p) => {
          if (p !== "checking") return p;
          return user ? "confirm" : "needsSignIn";
        });
      },
      () => setPhase("expired")
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPath, user]);

  const confirmConnect = async () => {
    if (!hostUid || !token || !user || claimedRef.current) return;
    claimedRef.current = true;
    try {
      await claimDevicePairing(hostUid, token, user.uid, user.email || "Connected device");
      onDisconnect(ref(rtdb, sessionPath!)).update({ status: "ended" });
      // Reverse-index so this account's Settings screen can list/disconnect
      // devices it's paired AS, not just devices paired TO it.
      await setDoc(doc(firestore, "users", user.uid, "pairedAsSecondaryOf", token), {
        hostUid, connectedAt: Date.now(),
      });
      setPhase("connecting");
      setTimeout(() => setPhase("tip"), 4000);
      setTimeout(() => setPhase("success"), 4000 + 6000);
      setTimeout(() => setPhase("display"), 4000 + 6000 + 1600);
      // Host is the source of truth for the persisted "connected" state —
      // guest just mirrors the same local timing.
      setTimeout(() => { if (hostUid && token) markDevicePairingConnected(hostUid, token).catch(() => {}); }, 4000);
    } catch (err: any) {
      setError(err?.message || "Couldn't connect. Check your connection and try again.");
      claimedRef.current = false;
    }
  };

  const disconnect = async () => {
    if (hostUid && token) await endDevicePairing(hostUid, token).catch(() => {});
    if (user && token) await setDoc(doc(firestore, "users", user.uid, "pairedAsSecondaryOf", token), { endedAt: Date.now() }, { merge: true }).catch(() => {});
    if (sessionPath) remove(ref(rtdb, sessionPath)).catch(() => {});
    setPhase("expired");
  };

  const shellStyle: React.CSSProperties = {
    minHeight: "100dvh", background: "#F7F9FC", color: "#0F172A", display: "flex",
    flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24,
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", textAlign: "center",
  };

  const debugPanel = (
    <PairingDebugPanel
      role="Secondary"
      paired={phase === "connecting" || phase === "tip" || phase === "success" || phase === "display"}
      displayMode={phase === "display"}
      screenSync={phase === "display" ? !!mirror : undefined}
      lastEvent={`PHASE_${phase.toUpperCase()}`}
      error={error}
    />
  );

  let content: React.ReactNode;

  if (phase === "checking") {
    content = <div style={shellStyle}><p style={{ opacity: 0.5, fontSize: 13 }}>Checking invite…</p></div>;
  } else if (phase === "expired") {
    content = (
      <div style={shellStyle}>
        <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>This invite has ended</h2>
        <p style={{ fontSize: 13, color: "#64748B", maxWidth: 280 }}>Ask for a fresh QR code from Settings → Connect Account.</p>
      </div>
    );
  } else if (phase === "needsSignIn") {
    content = (
      <div style={shellStyle}>
        <Smartphone size={30} color="#2563EB" style={{ marginBottom: 12 }} />
        <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>Sign in to connect this account</h2>
        <p style={{ fontSize: 13, color: "#64748B", maxWidth: 300 }}>
          You need to be signed in to your own Malvin account before linking it to {hostLabel}.
        </p>
      </div>
    );
  } else if (phase === "confirm") {
    content = (
      <div style={shellStyle}>
        <div style={{ maxWidth: 320 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#EFF4FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Smartphone size={22} color="#2563EB" />
          </div>
          <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>Connect to {hostLabel}?</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
            This links your account ({user?.email}) as a connected device. You can disconnect anytime from Settings.
          </p>
          {error && <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{error}</p>}
          <button onClick={confirmConnect} style={{ width: "100%", background: "#2563EB", color: "#fff", border: "none", borderRadius: 14, padding: "13px 20px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            Connect
          </button>
        </div>
      </div>
    );
  } else if (phase === "connecting" || phase === "tip") {
    content = (
      <div style={shellStyle}>
        <motion.div
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ width: 54, height: 54, borderRadius: "50%", border: "3px solid #DBE6FF", borderTopColor: "#2563EB", marginBottom: 18 }}
        />
        <p style={{ fontSize: 14, fontWeight: 700 }}>Connecting…</p>
        <AnimatePresence>
          {phase === "tip" && (
            <motion.p
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ fontSize: 12.5, color: "#64748B", marginTop: 14, maxWidth: 260 }}
            >
              You can always connect more devices in Settings.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  } else if (phase === "success") {
    content = (
      <div style={shellStyle}>
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}
          style={{ width: 68, height: 68, borderRadius: "50%", background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}
        >
          <Check size={30} color="#fff" strokeWidth={3.5} />
        </motion.div>
        <p style={{ fontSize: 15, fontWeight: 800 }}>Connected</p>
      </div>
    );
  } else {
    // phase === "display" — the ongoing secondary "display mode" screen.
    content = (
      <div style={{ minHeight: "100dvh", background: "#fff", color: "#0F172A", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #EEF2F8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={disconnect} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#EF4444", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "6px 4px" }}>
            <LogOut size={13} /> Disconnect
          </button>
          <div style={{ width: 60 }} />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 30, textAlign: "center" }}>
          {mirror ? (
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "#2563EB", marginBottom: 8 }}>Now viewing</p>
              <p style={{ fontSize: 22, fontWeight: 800 }}>{mirror.label}</p>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#94A3B8", maxWidth: 260, lineHeight: 1.6 }}>
              The creator set secondary devices to display mode by default.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      {debugPanel}
    </>
  );
};

export default DevicePairClaim;