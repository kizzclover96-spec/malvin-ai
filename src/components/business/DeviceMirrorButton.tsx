import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { ref, set, remove } from "firebase/database";
import { firestore, db as rtdb } from "../../firebase";
import { Cast } from "lucide-react";

/* ============================================================================
   DeviceMirrorButton — the small top-left circle on the primary device.

   Honest scope note: this broadcasts WHICH SECTION of the dashboard is
   active (tab name) to any connected secondary device, which then reflects
   that on its plain "display mode" screen — not a literal pixel-for-pixel
   video mirror. True screen capture (getDisplayMedia) isn't reliably
   available on iOS Safari, and a phone is the most likely secondary device
   in this exact QR-pairing flow, so a real WebRTC video mirror would fail
   silently for a large share of the people using this feature. A state
   mirror works everywhere. If real video mirroring is wanted later, it
   needs a native screen-capture path (e.g. a Capacitor plugin), not a
   browser API.
============================================================================ */

const TAB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  chat: "Team Chat",
  receipts: "Receipts",
  allOrders: "Orders",
  team: "Team Hub",
};

const DeviceMirrorButton: React.FC<{ ownerUid: string; accent: string; activeTab: string }> = ({ ownerUid, accent, activeTab }) => {
  const [hasConnectedDevices, setHasConnectedDevices] = useState(false);
  const [mirroring, setMirroring] = useState(false);

  useEffect(() => {
    if (!ownerUid) return;
    const unsub = onSnapshot(collection(firestore, "users", ownerUid, "connectedDevices"), (snap) => {
      setHasConnectedDevices(!snap.empty);
    });
    return () => unsub();
  }, [ownerUid]);

  useEffect(() => {
    if (!mirroring || !ownerUid) return;
    set(ref(rtdb, `mirror/${ownerUid}`), { tab: activeTab, label: TAB_LABELS[activeTab] || activeTab, updatedAt: Date.now() }).catch(() => {});
  }, [mirroring, activeTab, ownerUid]);

  useEffect(() => {
    return () => {
      if (mirroring && ownerUid) remove(ref(rtdb, `mirror/${ownerUid}`)).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasConnectedDevices) return null;

  const toggle = () => {
    setMirroring((m) => {
      const next = !m;
      if (!next) remove(ref(rtdb, `mirror/${ownerUid}`)).catch(() => {});
      return next;
    });
  };

  return (
    <button
      onClick={toggle}
      title={mirroring ? "Stop mirroring to connected devices" : "Mirror to connected devices"}
      style={{
        position: "fixed", top: 16, left: 16, zIndex: 60,
        width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: mirroring ? accent : "rgba(255,255,255,0.85)",
        boxShadow: "0 6px 18px rgba(15,23,42,0.12)",
        backdropFilter: "blur(12px)",
      }}
    >
      <Cast size={17} color={mirroring ? "#fff" : accent} />
    </button>
  );
};

export default DeviceMirrorButton;
