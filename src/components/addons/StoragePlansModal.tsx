import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, HardDrive, Check } from "lucide-react";
import { auth } from "../../firebase";

/* ============================================================================
   StoragePlansModal
   Three fixed tiers, same LemonSqueezy checkout pattern as Premium.tsx —
   each plan needs its own variant id set up in LemonSqueezy and wired
   through these env vars. Swap the plan's `href` fallback if a variant id
   isn't configured yet; the button still opens, it just needs a real
   checkout target before going live.
============================================================================ */

const PLANS = [
  {
    id: "storage_20gb_weekly",
    label: "20 GB",
    price: "€6.99",
    cadence: "/week",
    variantEnv: "VITE_LEMONSQUEEZY_STORAGE_20GB_VARIANT_ID",
  },
  {
    id: "storage_50gb_monthly",
    label: "50 GB",
    price: "€20",
    cadence: "/month",
    variantEnv: "VITE_LEMONSQUEEZY_STORAGE_50GB_VARIANT_ID",
    popular: true,
  },
  {
    id: "storage_100gb_yearly",
    label: "100 GB",
    price: "€120",
    cadence: "/year",
    variantEnv: "VITE_LEMONSQUEEZY_STORAGE_100GB_VARIANT_ID",
  },
];

interface StoragePlansModalProps {
  open: boolean;
  onClose: () => void;
  accent?: string;
}

const StoragePlansModal: React.FC<StoragePlansModalProps> = ({ open, onClose, accent = "#0066FF" }) => {
  const userId = auth.currentUser?.uid;

  const checkoutUrlFor = (plan: typeof PLANS[number]) => {
    const variantId = (import.meta as any).env?.[plan.variantEnv];
    if (!variantId) {
      console.error(`CRITICAL: ${plan.variantEnv} is missing from environment variables!`);
      return null;
    }
    return `https://malvin.lemonsqueezy.com/checkout/buy/${variantId}?embed=1&checkout[custom][user_id]=${userId}&checkout[custom][plan]=${plan.id}`;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(20,20,22,0.45)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            style={{ width: "100%", maxWidth: 400, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(34px) saturate(180%)", WebkitBackdropFilter: "blur(34px) saturate(180%)", border: "1px solid rgba(255,255,255,0.85)", borderRadius: 28, padding: 26, boxShadow: "0 34px 80px rgba(0,0,0,0.24)", color: "#1d1d1f" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 12, background: `${accent}1a`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <HardDrive size={16} color={accent} />
                </div>
                <span style={{ fontSize: 17, fontWeight: 800 }}>Storage plans</span>
              </div>
              <button onClick={onClose} style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={13} />
              </button>
            </div>
            <p style={{ fontSize: 12.5, color: "rgba(29,29,31,0.55)", margin: "6px 0 18px", lineHeight: 1.5 }}>
              Every Malvin account includes 10 MB free. Pick more room whenever you need it.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PLANS.map((plan) => {
                const url = checkoutUrlFor(plan);
                return (
                  <div
                    key={plan.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px", borderRadius: 18,
                      border: plan.popular ? `1.5px solid ${accent}` : "1px solid rgba(0,0,0,0.08)",
                      background: plan.popular ? `${accent}0d` : "rgba(0,0,0,0.02)",
                      position: "relative",
                    }}
                  >
                    {plan.popular && (
                      <span style={{ position: "absolute", top: -9, left: 16, background: accent, color: "#fff", fontSize: 9.5, fontWeight: 800, padding: "3px 9px", borderRadius: 999, letterSpacing: 0.3 }}>
                        MOST POPULAR
                      </span>
                    )}
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>{plan.label}</div>
                      <div style={{ fontSize: 11.5, color: "rgba(29,29,31,0.5)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <Check size={11} color={accent} /> Priority upload speed
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>
                        {plan.price} <span style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(29,29,31,0.5)" }}>{plan.cadence}</span>
                      </div>
                      <button
                        onClick={() => url && window.open(url, "_blank")}
                        disabled={!url}
                        style={{
                          marginTop: 6, border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 11.5, fontWeight: 800,
                          color: "#fff", background: accent, cursor: url ? "pointer" : "default", opacity: url ? 1 : 0.4,
                        }}
                      >
                        Choose
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: 10, color: "rgba(29,29,31,0.4)", margin: "16px 0 0", textAlign: "center" }}>
              Cancel anytime from your billing portal. Charges appear as "Malvin".
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StoragePlansModal;
