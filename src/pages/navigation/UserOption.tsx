import React, { useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { ChevronsLeft, ChevronsRight, Store, User } from "lucide-react";

type PremiumStatus = "checking" | "premium" | "free";

type UserOptionProps = {
  onSelectCustomer: () => void; // Trigger state shift for Front view
  onSelectWorker: () => void;   // Trigger state shift for Category/B-Vin view
  premiumStatus?: PremiumStatus;
};

const ACCENT = "#4F9CF9"; // same blue as the B-Vin dashboard's default accent
const THUMB_SIZE = 64;
const TRACK_HEIGHT = 80;

export const UserOption: React.FC<UserOptionProps> = ({ onSelectCustomer, onSelectWorker, premiumStatus = "free" }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [settled, setSettled] = useState<"business" | "customer" | null>(null);
  const x = useMotionValue(0);

  const maxX = Math.max(trackWidth - THUMB_SIZE - 8, 1);
  const progress = useTransform(x, [0, maxX], [0, 1]); // 0 = far left (Customer), 1 = far right (Business)
  const trackBg = useTransform(
    progress,
    [0, 0.5, 1],
    ["linear-gradient(135deg,#8fc2fb,#4F9CF9)", "linear-gradient(135deg,#4F9CF9,#3b82f6)", "linear-gradient(135deg,#3b82f6,#2f6fe0)"]
  );
  const businessLabelOpacity = useTransform(progress, [0.5, 1], [0.35, 1]);
  const customerLabelOpacity = useTransform(progress, [0, 0.5], [1, 0.35]);

  const measure = (node: HTMLDivElement | null) => {
    trackRef.current = node;
    if (node) setTrackWidth(node.getBoundingClientRect().width);
  };

  const finish = (choice: "business" | "customer", target: number) => {
    setSettled(choice);
    animate(x, target, { type: "spring", stiffness: 420, damping: 34 });
    setTimeout(() => (choice === "business" ? onSelectWorker() : onSelectCustomer()), 420);
  };

  const handleDragEnd = () => {
    if (settled) return; // already mid-transition, ignore further drags
    const current = x.get();
    const ratio = maxX > 0 ? current / maxX : 0;
    if (ratio > 0.62) {
      finish("business", maxX);
    } else if (ratio < 0.38) {
      finish("customer", 0);
    } else {
      animate(x, maxX / 2, { type: "spring", stiffness: 380, damping: 30 });
    }
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#ffffff", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "48px 24px", position: "relative", overflow: "hidden", fontFamily: "Inter, sans-serif" }}>
      {/* soft ambient blue glows, subtle on white rather than the old dark neon look */}
      <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, background: `${ACCENT}14`, borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 320, height: 320, background: `${ACCENT}0d`, borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none" }} />

      {/* Status pill — top right, unchanged behavior, just retextured for white */}
      <AnimatePresence>
        {premiumStatus === "checking" && (
          <motion.div
            key="checking"
            layoutId="statusPill"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", top: 20, right: 20, zIndex: 20, width: 24, height: 24, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.span
              style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(0,0,0,0.3)" }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
        {premiumStatus === "premium" && (
          <motion.div
            key="premium"
            layoutId="statusPill"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", top: 20, right: 20, zIndex: 20, display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, border: "1px solid rgba(212,160,23,0.3)", background: "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(184,134,11,0.12))", boxShadow: "0 4px 14px rgba(212,160,23,0.15)" }}
          >
            <svg width={12} height={12} fill="#b8860b" viewBox="0 0 20 20"><path d="M10 1.5l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.77l-4.77 2.44.91-5.32-3.87-3.77 5.34-.78L10 1.5z" /></svg>
            <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, color: "#b8860b" }}>Premium</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ textAlign: "center", marginTop: 24, zIndex: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: ACCENT, background: `${ACCENT}12`, border: `1px solid ${ACCENT}2a`, padding: "5px 12px", borderRadius: 999 }}>
          Malvin AI (BETA)
        </span>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0f1115", letterSpacing: -0.5, marginTop: 18 }}>
          Slide to continue
        </h1>
        <p style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(15,17,21,0.45)", marginTop: 8, maxWidth: 260, marginLeft: "auto", marginRight: "auto" }}>
          You can always switch later.
        </p>
      </div>

      {/* The slider */}
      <div style={{ width: "100%", maxWidth: 380, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 22px", marginBottom: 10 }}>
          <motion.span style={{ opacity: customerLabelOpacity, fontSize: 12, fontStyle: "italic", fontWeight: 700, color: "#0f1115" }}>Customer</motion.span>
          <motion.span style={{ opacity: businessLabelOpacity, fontSize: 12, fontStyle: "italic", fontWeight: 700, color: "#0f1115" }}>Business</motion.span>
        </div>

        <motion.div
          ref={measure}
          style={{
            position: "relative",
            width: "100%",
            height: TRACK_HEIGHT,
            borderRadius: 999,
            background: trackBg as any,
            boxShadow: "0 20px 46px rgba(79,156,249,0.32), inset 0 2px 4px rgba(255,255,255,0.35)",
            display: "flex",
            alignItems: "center",
            padding: 8,
            overflow: "hidden",
          }}
        >
          {/* icon hints at each end, faintly visible like the sun/moon reference */}
          <User size={20} color="rgba(255,255,255,0.55)" style={{ position: "absolute", left: 22, top: "50%", transform: "translateY(-50%)" }} />
          <Store size={20} color="rgba(255,255,255,0.55)" style={{ position: "absolute", right: 22, top: "50%", transform: "translateY(-50%)" }} />

          {trackWidth > 0 && (
            <motion.div
              drag={settled ? false : "x"}
              dragConstraints={{ left: 0, right: maxX }}
              dragElastic={0.06}
              dragMomentum={false}
              onDragEnd={handleDragEnd}
              style={{
                x,
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: "50%",
                background: "#ffffff",
                boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: settled ? "default" : "grab",
                position: "relative",
                zIndex: 2,
              }}
              whileTap={{ scale: 0.95 }}
              animate={settled ? { scale: [1, 1.08, 1] } : {}}
              transition={settled ? { duration: 0.4 } : {}}
            >
              <AnimatePresence mode="wait">
                {settled === "business" ? (
                  <motion.div key="biz" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}>
                    <Store size={24} color={ACCENT} />
                  </motion.div>
                ) : settled === "customer" ? (
                  <motion.div key="cust" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}>
                    <User size={24} color={ACCENT} />
                  </motion.div>
                ) : (
                  <motion.div key="idle" animate={{ x: [0, 3, 0, -3, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} style={{ display: "flex" }}>
                    <ChevronsLeft size={14} color={ACCENT} style={{ marginRight: -4 }} />
                    <ChevronsRight size={14} color={ACCENT} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <div style={{ zIndex: 10, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(15,17,21,0.28)" }}>
        Malvin business to customer system vBeta
      </div>
    </div>
  );
};