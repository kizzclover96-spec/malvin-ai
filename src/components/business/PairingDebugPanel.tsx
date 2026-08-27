import React, { useEffect, useRef, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db as rtdb } from "../../firebase";
import { Bug, ChevronDown, ChevronUp } from "lucide-react";

/* ============================================================================
   PairingDebugPanel — TEMPORARY. Built specifically to diagnose the device-
   pairing feature without needing Chrome DevTools, since the whole point is
   seeing what MALVIN itself thinks is happening on the secondary device,
   not the raw network trace. Delete this file (and its two call sites in
   DevicePairClaim.tsx and DeviceConnectPanel.tsx) once pairing is confirmed
   solid — it's diagnostic scaffolding, not a permanent feature.

   "Realtime" reflects Firebase's actual `.info/connected` signal — the one
   thing Chrome's Network tab can't summarize cleanly, since RTDB multiplexes
   everything over one long-lived WebSocket. Everything else here just
   surfaces state the pairing components already track locally.
============================================================================ */

function getDeviceId(): string {
  const KEY = "malvinDeviceDebugId";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = Math.random().toString(16).slice(2, 10).toUpperCase();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

export interface PairingDebugProps {
  role: "Primary" | "Secondary";
  paired: boolean;
  displayMode?: boolean;
  screenSync?: boolean;
  lastEvent: string;
  error?: string | null;
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "3px 0" }}>
    <span style={{ opacity: 0.55 }}>{label}:</span>
    <span style={{ textAlign: "right", wordBreak: "break-word", maxWidth: "60%" }}>{value}</span>
  </div>
);

const Bool: React.FC<{ v: boolean | undefined }> = ({ v }) =>
  v === undefined ? <span style={{ opacity: 0.4 }}>—</span> : v ? <span style={{ color: "#4ADE80" }}>✓</span> : <span style={{ color: "#F87171" }}>✗</span>;

const PairingDebugPanel: React.FC<PairingDebugProps> = ({ role, paired, displayMode, screenSync, lastEvent, error }) => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [open, setOpen] = useState(true);
  const deviceId = useRef(getDeviceId()).current;

  useEffect(() => {
    const unsub = onValue(ref(rtdb, ".info/connected"), (snap) => setConnected(snap.val() === true));
    return () => unsub();
  }, []);

  return (
    <div style={{ position: "fixed", bottom: 12, left: 12, right: 12, zIndex: 9999, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div
        style={{
          pointerEvents: "auto", width: "100%", maxWidth: 340,
          background: "rgba(15,23,42,0.94)", color: "#E2E8F0", borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 11.5,
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.06)", border: "none", color: "#fff", padding: "8px 12px", cursor: "pointer", fontFamily: "inherit" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, letterSpacing: 0.5 }}>
            <Bug size={12} /> MALVIN DEBUG
          </span>
          {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>

        {open && (
          <div style={{ padding: "10px 14px 12px" }}>
            <Row label="Connection" value={connected === null ? "Checking…" : connected ? "Connected" : "Disconnected"} />
            <Row label="Device ID" value={deviceId} />
            <Row label="Role" value={role} />
            <Row label="Pairing" value={<Bool v={paired} />} />
            <Row label="Realtime" value={<Bool v={connected === true} />} />
            {displayMode !== undefined && <Row label="Display Mode" value={<Bool v={displayMode} />} />}
            {screenSync !== undefined && <Row label="Screen Sync" value={<Bool v={screenSync} />} />}
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ opacity: 0.55, marginBottom: 2 }}>Last event:</div>
              <div>{lastEvent}</div>
            </div>
            <div style={{ marginTop: 6 }}>
              <div style={{ opacity: 0.55, marginBottom: 2 }}>Error:</div>
              <div style={{ color: error ? "#F87171" : "#64748B" }}>{error || "None"}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PairingDebugPanel;
