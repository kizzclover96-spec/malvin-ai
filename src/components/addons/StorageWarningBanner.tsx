import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { StorageState, formatBytes } from "../../utils/storage";
import StoragePlansModal from "./StoragePlansModal";

/* ============================================================================
   StorageWarningBanner
   Renders nothing until usage crosses 90%. Amber at 90-99%, red at 100%.
   "See storage plans" opens the Apple-style pricing modal.
============================================================================ */

interface StorageWarningBannerProps {
  state: StorageState;
  accent?: string;
}

const StorageWarningBanner: React.FC<StorageWarningBannerProps> = ({ state, accent = "#0066FF" }) => {
  const [plansOpen, setPlansOpen] = useState(false);

  if (!state.nearLimit) return null;

  const isFull = state.atLimit;
  const color = isFull ? "#c23a3a" : "#b8860b";
  const bg = isFull ? "rgba(194,58,58,0.08)" : "rgba(184,134,11,0.08)";
  const border = isFull ? "rgba(194,58,58,0.25)" : "rgba(184,134,11,0.25)";

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14, background: bg, border: `1px solid ${border}`, marginBottom: 14 }}>
        <AlertTriangle size={16} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color }}>
            {isFull ? "Storage limit reached" : "Your Malvin storage is almost full"}
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(29,29,31,0.6)", marginTop: 2, lineHeight: 1.4 }}>
            {isFull
              ? `Your ${formatBytes(state.limitBytes)} Malvin storage is full. Free up space or upgrade to continue saving new files.`
              : `You're using ${formatBytes(state.usedBytes)} of your ${formatBytes(state.limitBytes)} included storage. Some features may stop saving new files once storage is full.`}
          </div>
          <button
            onClick={() => setPlansOpen(true)}
            style={{ marginTop: 8, background: "none", border: "none", padding: 0, fontSize: 11.5, fontWeight: 800, color, cursor: "pointer", textDecoration: "underline" }}
          >
            See storage plans
          </button>
        </div>
      </div>
      <StoragePlansModal open={plansOpen} onClose={() => setPlansOpen(false)} accent={accent} />
    </>
  );
};

export default StorageWarningBanner;
