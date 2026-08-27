import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Image as ImageIcon, Euro, Type, Clock, FileText, Percent, Tag, Package, Layers } from "lucide-react";

/* ============================================================================
   CatalogueSetupWizard
   Runs once, the moment the business enables "Online Catalogue" or
   "Products / Services". Four steps: pick which fields each listing should
   have -> pick a display layout -> a ~30s "building it" moment -> an
   Apple-Pay-style success check. The chosen field set + layout are handed
   back via onComplete so B-Vin can store them at
   b-vin/{businessId}.catalogueConfig (or .offeringsConfig) and the customer
   store can render listings accordingly.

   withPicture=false (used for Products/Services) drops the Picture field
   and the two photo-led layout options, since services have nothing to
   photograph the way products do.
============================================================================ */

export interface CatalogueFieldOption {
  key: string;
  label: string;
  icon: React.ElementType;
}

const ALL_FIELDS: CatalogueFieldOption[] = [
  { key: "picture", label: "Picture", icon: ImageIcon },
  { key: "price", label: "Price", icon: Euro },
  { key: "name", label: "Name", icon: Type },
  { key: "duration", label: "Duration", icon: Clock },
  { key: "description", label: "Description", icon: FileText },
  { key: "discount", label: "Discount", icon: Percent },
  { key: "category", label: "Category", icon: Tag },
  { key: "stock", label: "Stock level", icon: Package },
  { key: "variants", label: "Variants / Sizes", icon: Layers },
];

export interface CatalogueLayoutOption {
  key: string;
  label: string;
  /** Which existing store screen this mimics, shown as a small caption. */
  inspiredBy: string;
  needsPicture: boolean;
}

const ALL_LAYOUTS: CatalogueLayoutOption[] = [
  { key: "gridCards", label: "Grid Cards", inspiredBy: "Food store", needsPicture: true },
  { key: "gallery", label: "Gallery Carousel", inspiredBy: "Hotel store", needsPicture: true },
  { key: "listRows", label: "List Rows", inspiredBy: "Mechanic / Service store", needsPicture: false },
  { key: "menuList", label: "Menu List", inspiredBy: "Salon store", needsPicture: false },
];

export interface CatalogueSetupResult {
  fields: string[];
  layout: string;
}

interface Props {
  open: boolean;
  title: string; // "catalogue" | "services"
  withPicture: boolean;
  onClose: () => void;
  onComplete: (result: CatalogueSetupResult) => void;
  accent: string;
}

type Step = "fields" | "layout" | "building" | "done";

const CatalogueSetupWizard: React.FC<Props> = ({ open, title, withPicture, onClose, onComplete, accent }) => {
  const [step, setStep] = useState<Step>("fields");
  const [selectedFields, setSelectedFields] = useState<string[]>(withPicture ? ["picture", "price", "name"] : ["price", "name"]);
  const [selectedLayout, setSelectedLayout] = useState<string>(withPicture ? "gridCards" : "listRows");
  const [buildProgress, setBuildProgress] = useState(0);

  const fields = withPicture ? ALL_FIELDS : ALL_FIELDS.filter((f) => f.key !== "picture");
  const layouts = withPicture ? ALL_LAYOUTS : ALL_LAYOUTS.filter((l) => !l.needsPicture);

  useEffect(() => {
    if (!open) {
      setStep("fields");
      setBuildProgress(0);
    }
  }, [open]);

  useEffect(() => {
    if (step !== "building") return;
    const totalMs = 30000;
    const stepMs = 200;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += stepMs;
      setBuildProgress(Math.min(100, Math.round((elapsed / totalMs) * 100)));
      if (elapsed >= totalMs) {
        clearInterval(interval);
        setStep("done");
      }
    }, stepMs);
    return () => clearInterval(interval);
  }, [step]);

  const toggleField = (key: string) => {
    setSelectedFields((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  };

  const finishFields = () => setStep("layout");
  const finishLayout = () => setStep("building");
  const finishAll = () => {
    onComplete({ fields: selectedFields, layout: selectedLayout });
    onClose();
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(20,20,22,0.35)",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        style={{
          width: "100%", maxWidth: 460, maxHeight: "86vh", overflowY: "auto",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(34px) saturate(180%)", WebkitBackdropFilter: "blur(34px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.7)",
          borderRadius: 30,
          padding: 28,
          boxShadow: "0 30px 80px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.9)",
          color: "#1d1d1f",
        }}
      >
        <AnimatePresence mode="wait">
          {step === "fields" && (
            <motion.div key="fields" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>
                What do you want in your {title}?
              </h2>
              <p style={{ fontSize: 13, color: "rgba(29,29,31,0.6)", margin: "0 0 18px" }}>Tap everything you'd like shown for each listing.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 22 }}>
                {fields.map((f) => {
                  const on = selectedFields.includes(f.key);
                  return (
                    <button
                      key={f.key}
                      onClick={() => toggleField(f.key)}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        padding: "14px 8px", borderRadius: 16, cursor: "pointer",
                        border: on ? `1.5px solid ${accent}` : "1px solid rgba(0,0,0,0.08)",
                        background: on ? `${accent}14` : "linear-gradient(145deg, #ffffff, #f4f4f6)",
                        boxShadow: on ? `0 2px 10px ${accent}22` : "0 2px 6px rgba(0,0,0,0.06)",
                      }}
                    >
                      <f.icon size={17} color={on ? accent : "#555"} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: on ? accent : "#333" }}>{f.label}</span>
                    </button>
                  );
                })}
              </div>
              <WizardButton accent={accent} onClick={finishFields} disabled={selectedFields.length === 0}>Finish</WizardButton>
            </motion.div>
          )}

          {step === "layout" && (
            <motion.div key="layout" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>Choose a layout</h2>
              <p style={{ fontSize: 13, color: "rgba(29,29,31,0.6)", margin: "0 0 18px" }}>How should this look for customers?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 22 }}>
                {layouts.map((l) => (
                  <button
                    key={l.key}
                    onClick={() => setSelectedLayout(l.key)}
                    style={{
                      textAlign: "left", cursor: "pointer", borderRadius: 18, padding: 10,
                      border: selectedLayout === l.key ? `1.5px solid ${accent}` : "1px solid rgba(0,0,0,0.08)",
                      background: selectedLayout === l.key ? `${accent}10` : "linear-gradient(145deg, #ffffff, #f4f4f6)",
                      boxShadow: selectedLayout === l.key ? `0 2px 10px ${accent}22` : "0 2px 6px rgba(0,0,0,0.06)",
                    }}
                  >
                    <LayoutPreview layoutKey={l.key} accent={accent} />
                    <div style={{ fontSize: 12, fontWeight: 800, marginTop: 8 }}>{l.label}</div>
                    <div style={{ fontSize: 10.5, color: "rgba(29,29,31,0.5)" }}>Inspired by: {l.inspiredBy}</div>
                  </button>
                ))}
              </div>
              <WizardButton accent={accent} onClick={finishLayout}>Finish</WizardButton>
            </motion.div>
          )}

          {step === "building" && (
            <motion.div key="building" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ width: 68, height: 68, margin: "0 auto 20px", position: "relative" }}>
                <svg width="68" height="68" viewBox="0 0 68 68">
                  <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="5" />
                  <motion.circle
                    cx="34" cy="34" r="28" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 28}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                    style={{ transformOrigin: "34px 34px", strokeDashoffset: 2 * Math.PI * 28 * 0.7 }}
                  />
                </svg>
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 6px" }}>Malvin is creating your {title}</h2>
              <p style={{ fontSize: 13, color: "rgba(29,29,31,0.6)", margin: 0 }}>This will take a few minutes.</p>
              <div style={{ marginTop: 18, height: 4, borderRadius: 4, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
                <motion.div animate={{ width: `${buildProgress}%` }} style={{ height: "100%", background: accent, borderRadius: 4 }} />
              </div>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: "center", padding: "16px 0" }}>
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
                style={{ width: 72, height: 72, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}
              >
                <motion.div initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
                  <Check size={32} color="#fff" strokeWidth={3.2} />
                </motion.div>
              </motion.div>
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 8px", textTransform: "capitalize" }}>{title} created!</h2>
              <p style={{ fontSize: 13, color: "rgba(29,29,31,0.6)", margin: "0 0 22px" }}>
                Go to the dashboard to add your {withPicture ? "products" : "services"} — you can change any of this anytime.
              </p>
              <WizardButton accent={accent} onClick={finishAll}>Go to dashboard</WizardButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

const WizardButton: React.FC<{ accent: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ accent, onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: "100%", border: "none", borderRadius: 15, padding: "14px 20px",
      fontSize: 14, fontWeight: 800, color: "#fff", cursor: disabled ? "default" : "pointer",
      background: accent, opacity: disabled ? 0.4 : 1,
      boxShadow: disabled ? "none" : `0 8px 20px ${accent}44`,
    }}
  >
    {children}
  </button>
);

/* Small CSS-only mockups standing in for each store type's real listing
   layout, so the picker is visual rather than just a label. */
const LayoutPreview: React.FC<{ layoutKey: string; accent: string }> = ({ layoutKey, accent }) => {
  const box = (w: string | number, h: number, r = 6) => ({ width: w, height: h, borderRadius: r, background: "rgba(0,0,0,0.08)" });
  if (layoutKey === "gridCards") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, height: 60 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ borderRadius: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.06)", padding: 4 }}>
            <div style={{ ...box("100%", 22, 6), background: `${accent}33` }} />
            <div style={{ ...box("70%", 5), marginTop: 4 }} />
          </div>
        ))}
      </div>
    );
  }
  if (layoutKey === "gallery") {
    return (
      <div style={{ display: "flex", gap: 5, height: 60, overflow: "hidden" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ ...box(48, 60, 10), background: `${accent}2e`, flexShrink: 0 }} />
        ))}
      </div>
    );
  }
  if (layoutKey === "listRows") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, height: 60, justifyContent: "center" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ ...box(18, 18, 5), background: `${accent}33`, flexShrink: 0 }} />
            <div style={{ ...box("100%", 6) }} />
          </div>
        ))}
      </div>
    );
  }
  // menuList
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: 60, justifyContent: "center" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ ...box(70, 6) }} />
          <div style={{ ...box(18, 6), background: `${accent}44` }} />
        </div>
      ))}
    </div>
  );
};

export default CatalogueSetupWizard;
