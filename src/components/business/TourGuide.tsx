import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X } from "lucide-react";

/* ============================================================================
   TourGuide
   A short, skippable walkthrough shown ONLY the first time a new business
   opens their dashboard (gated by profile.hasSeenTour === false, set
   explicitly by the onboarding wizard — an existing business that never
   went through onboarding has no such field at all, so it never triggers
   here, matching "only work if the user is new").

   Each step targets a real DOM node via a ref, so the spotlight ring and
   tooltip bubble are positioned against wherever that element actually is
   on screen (recalculated on resize/scroll) rather than guessed fixed
   coordinates.
============================================================================ */

export interface TourStep {
  ref: React.RefObject<HTMLElement | null>;
  title: string;
  body: string;
}

interface Props {
  steps: TourStep[];
  onFinish: () => void;
}

const TourGuide: React.FC<Props> = ({ steps, onFinish }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[index];

  useEffect(() => {
    const measure = () => {
      const el = step?.ref.current;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    // Elements like the top island resize themselves (pill expands/collapses,
    // tool count changes) independent of window resize/scroll — a short
    // re-measure loop keeps the spotlight glued to it without needing a
    // ResizeObserver wired through every possible target.
    const t = setInterval(measure, 250);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      clearInterval(t);
    };
  }, [index, step]);

  if (!step) return null;

  const next = () => {
    if (index < steps.length - 1) setIndex(index + 1);
    else onFinish();
  };

  // Bubble placement: below the target if there's room, otherwise above it.
  const bubbleTop = rect ? (rect.bottom + 160 < window.innerHeight ? rect.bottom + 14 : rect.top - 150) : window.innerHeight / 2;
  const bubbleLeft = rect ? Math.min(Math.max(rect.left, 16), window.innerWidth - 296) : 16;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500 }}>
      {/* Spotlight: a transparent cutout over the target, huge box-shadow
          darkens everything else — no DOM masking needed. */}
      <motion.div
        animate={
          rect
            ? { top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }
            : { top: 0, left: 0, width: 0, height: 0, opacity: 0 }
        }
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          position: "fixed",
          borderRadius: 999,
          boxShadow: "0 0 0 9999px rgba(15,17,21,0.55)",
          border: "2px solid #22c55e",
          pointerEvents: "none",
        }}
      />
      {/* small pulsing green dot right at the target's edge */}
      {rect && (
        <motion.div
          animate={{ top: rect.top - 6, left: rect.right - 2 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ position: "fixed", width: 12, height: 12, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 4px rgba(34,197,94,0.25)", zIndex: 2 }}
        >
          <motion.div
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#22c55e" }}
          />
        </motion.div>
      )}

      {/* dismissible backdrop click (outside the bubble) skips ahead one step */}
      <div style={{ position: "fixed", inset: 0 }} onClick={next} />

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1, top: bubbleTop, left: bubbleLeft }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            width: 280,
            background: "#ffffff",
            border: "1.5px solid #22c55e",
            borderRadius: 20,
            padding: 16,
            boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
            zIndex: 3,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#1d1d1f" }}>{step.title}</span>
            </div>
            <button onClick={onFinish} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.35)", flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
          <p style={{ fontSize: 12, color: "rgba(29,29,31,0.65)", lineHeight: 1.5, margin: "0 0 12px" }}>{step.body}</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(0,0,0,0.35)" }}>{index + 1} / {steps.length}</span>
            <button
              onClick={next}
              style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "#22c55e", color: "#fff", fontSize: 11.5, fontWeight: 800, padding: "7px 12px", borderRadius: 10, cursor: "pointer" }}
            >
              {index < steps.length - 1 ? "Next" : "Done"} <ChevronRight size={12} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TourGuide;