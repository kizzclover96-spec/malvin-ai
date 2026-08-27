import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Keyboard, PackageSearch, X, Users } from "lucide-react";

/* ============================================================================
   WorkerPermissionsModal
   Shown the moment a manager turns the "Add Workers" tool on in B-Vin. Three
   plain toggles decide what every worker on this business's roster is
   allowed to do from their own worker dashboard. This is a business-wide
   default (not per-worker) — simple on purpose, matching how the rest of
   B-Vin's tool toggles work.
============================================================================ */

export interface WorkerAccess {
  scanCustomerCard: boolean;   // scan a customer's Malvin QR / card
  manualOrderEntry: boolean;   // type up what a customer wants by hand
  scanInventoryLookup: boolean; // scan a product barcode and see stock count
}

export const DEFAULT_WORKER_ACCESS: WorkerAccess = {
  scanCustomerCard: true,
  manualOrderEntry: false,
  scanInventoryLookup: false,
};

interface WorkerPermissionsModalProps {
  open: boolean;
  value: WorkerAccess;
  onChange: (next: WorkerAccess) => void;
  onClose: () => void;
  onOpenTeamHub?: () => void;
  accent: string;
}

const OPTIONS: { key: keyof WorkerAccess; icon: React.ElementType; title: string; sub: string }[] = [
  { key: "scanCustomerCard", icon: ScanLine, title: "Scan customer card", sub: "Scan a customer's Malvin QR to pull up their profile." },
  { key: "manualOrderEntry", icon: Keyboard, title: "Manually type orders", sub: "Type up what a customer wants when there's no QR to scan." },
  { key: "scanInventoryLookup", icon: PackageSearch, title: "Scan & check inventory", sub: "Scan a product barcode and see how many are in stock." },
];

const WorkerPermissionsModal: React.FC<WorkerPermissionsModalProps> = ({ open, value, onChange, onClose, onOpenTeamHub, accent }) => {
  const toggle = (key: keyof WorkerAccess) => onChange({ ...value, [key]: !value[key] });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(20,20,22,0.4)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            style={{ width: "100%", maxWidth: 380, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(30px) saturate(180%)", WebkitBackdropFilter: "blur(30px) saturate(180%)", border: "1px solid rgba(255,255,255,0.85)", borderRadius: 26, padding: 22, boxShadow: "0 30px 70px rgba(0,0,0,0.22)", color: "#1d1d1f" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 12, background: `${accent}1a`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users size={16} color={accent} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 800 }}>What can workers do?</span>
              </div>
              <button onClick={onClose} style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={13} />
              </button>
            </div>
            <p style={{ fontSize: 12.5, color: "rgba(29,29,31,0.55)", margin: "6px 0 16px", lineHeight: 1.5 }}>
              Choose what every worker sees on their dashboard. You can change this anytime.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {OPTIONS.map((opt) => {
                const on = value[opt.key];
                return (
                  <button
                    key={opt.key}
                    onClick={() => toggle(opt.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 12px", borderRadius: 16,
                      border: on ? `1px solid ${accent}55` : "1px solid rgba(0,0,0,0.06)",
                      background: on ? `${accent}12` : "rgba(0,0,0,0.02)", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: on ? `${accent}22` : "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <opt.icon size={15} color={on ? accent : "#8a8f98"} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{opt.title}</div>
                      <div style={{ fontSize: 11, color: "rgba(29,29,31,0.5)", lineHeight: 1.35, marginTop: 1 }}>{opt.sub}</div>
                    </div>
                    <div style={{
                      width: 38, height: 22, borderRadius: 11, background: on ? accent : "rgba(0,0,0,0.14)",
                      display: "flex", alignItems: "center", padding: 2, flexShrink: 0, transition: "background 0.15s",
                    }}>
                      <motion.div animate={{ x: on ? 16 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 32 }} style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {opt_note()}

            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              {onOpenTeamHub && (
                <button
                  onClick={() => { onClose(); onOpenTeamHub(); }}
                  style={{ flex: 1, padding: "12px", borderRadius: 14, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", fontSize: 12.5, fontWeight: 700, color: "#1d1d1f", cursor: "pointer" }}
                >
                  Invite a worker →
                </button>
              )}
              <button
                onClick={onClose}
                style={{ flex: 1, padding: "12px", borderRadius: 14, border: "none", background: accent, fontSize: 12.5, fontWeight: 800, color: "#fff", cursor: "pointer", boxShadow: `0 10px 24px ${accent}44` }}
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function opt_note() {
  return (
    <p style={{ fontSize: 10.5, color: "rgba(29,29,31,0.4)", margin: "12px 0 0", lineHeight: 1.5 }}>
      "Scan &amp; check inventory" only works once System Inventory is connected — turn it on from Apps &amp; Connections → Connect System.
    </p>
  );
}

export default WorkerPermissionsModal;
