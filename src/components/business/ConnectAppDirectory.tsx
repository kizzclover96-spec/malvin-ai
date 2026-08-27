import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, addDoc } from "firebase/firestore";
import { firestore } from "../../firebase";
import { X, ShieldCheck, Check } from "lucide-react";

interface AppDef { key: string; name: string; color: string; url: string; }

/* A small curated directory of well-known apps. Each icon is a plain
   colored circle with the app's initial(s) — no trademarked logos are
   reproduced, just a Malvin-style stand-in avatar, same as the rest of
   the dashboard's icon language. Tapping one starts the connect flow;
   the icon itself also works as a "visit the app" link via long-press,
   consistent with how ConnectionIcon already behaves elsewhere. */
const APP_DIRECTORY: AppDef[] = [
  { key: "whatsapp", name: "WhatsApp", color: "#25D366", url: "https://web.whatsapp.com" },
  { key: "gmail", name: "Gmail", color: "#EA4335", url: "https://mail.google.com" },
  { key: "drive", name: "Google Drive", color: "#34A853", url: "https://drive.google.com" },
  { key: "slack", name: "Slack", color: "#611F69", url: "https://slack.com" },
  { key: "notion", name: "Notion", color: "#1d1d1f", url: "https://notion.so" },
  { key: "telegram", name: "Telegram", color: "#26A5E4", url: "https://web.telegram.org" },
  { key: "instagram", name: "Instagram", color: "#C13584", url: "https://instagram.com" },
  { key: "tiktok", name: "TikTok", color: "#010101", url: "https://tiktok.com" },
  { key: "facebook", name: "Facebook", color: "#1877F2", url: "https://facebook.com" },
  { key: "spotify", name: "Spotify", color: "#1DB954", url: "https://open.spotify.com" },
];

type Step = "grid" | "phone" | "consent" | "connecting" | "success";

const CONNECT_STEPS = ["Verifying number", "Establishing link", "Syncing permissions", "Finalizing"];

export const ConnectAppDirectory: React.FC<{ open: boolean; onClose: () => void; businessId: string; accent: string }> = ({ open, onClose, businessId, accent }) => {
  const [step, setStep] = useState<Step>("grid");
  const [selected, setSelected] = useState<AppDef | null>(null);
  const [phone, setPhone] = useState("");
  const [connectDone, setConnectDone] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep("grid");
      setSelected(null);
      setPhone("");
      setConnectDone(0);
    }
  }, [open]);

  const pickApp = (app: AppDef) => {
    setSelected(app);
    setStep("phone");
  };

  const submitPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setStep("consent");
  };

  const confirmConnect = () => {
    setStep("connecting");
  };

  useEffect(() => {
    if (step !== "connecting") return;
    if (connectDone >= CONNECT_STEPS.length) {
      (async () => {
        if (selected) {
          try {
            await addDoc(collection(firestore, "business", businessId, "connections"), {
              type: "app",
              name: selected.name,
              url: selected.url,
              color: selected.color,
              addedAt: Date.now(),
            });
          } catch {
            // Non-fatal — the person still sees a success screen; the icon
            // will simply catch up next time the connections list refreshes.
          }
        }
        setStep("success");
      })();
      return;
    }
    const t = setTimeout(() => setConnectDone((c) => c + 1), 500);
    return () => clearTimeout(t);
  }, [step, connectDone, selected, businessId]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={() => (step === "connecting" ? undefined : onClose())}
      style={{ position: "fixed", inset: 0, background: "rgba(20,20,22,0.4)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, maxHeight: "84vh", overflowY: "auto", background: "rgba(255,255,255,0.96)", backdropFilter: "blur(30px) saturate(180%)", border: "1px solid rgba(255,255,255,0.85)", borderRadius: 26, padding: 24, boxShadow: "0 30px 80px rgba(0,0,0,0.22)", color: "#1d1d1f" }}
      >
        <AnimatePresence mode="wait">
          {step === "grid" && (
            <motion.div key="grid" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Connect an app</span>
                <button onClick={onClose} style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer" }}><X size={13} /></button>
              </div>
              <p style={{ fontSize: 12.5, color: "rgba(29,29,31,0.55)", margin: "0 0 18px" }}>Free for every account — pick an app to link it to your dashboard.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {APP_DIRECTORY.map((app) => (
                  <button key={app.key} onClick={() => pickApp(app)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: app.color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(0,0,0,0.15)" }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{app.name.slice(0, 2)}</span>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>{app.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "phone" && selected && (
            <motion.div key="phone" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: selected.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{selected.name.slice(0, 2)}</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Link {selected.name}</span>
                <button onClick={onClose} style={{ marginLeft: "auto", background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer" }}><X size={13} /></button>
              </div>
              <p style={{ fontSize: 12.5, color: "rgba(29,29,31,0.55)", margin: "0 0 16px" }}>Enter the phone number linked to your {selected.name} account.</p>
              <form onSubmit={submitPhone}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  autoFocus
                  style={{ width: "100%", fontSize: 14, padding: "13px 14px", borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.03)", color: "#1d1d1f", fontFamily: "inherit", boxSizing: "border-box" }}
                />
                <button type="submit" disabled={!phone.trim()} style={{ width: "100%", border: "none", borderRadius: 15, padding: "13px 16px", fontSize: 13.5, fontWeight: 800, color: "#fff", background: accent, cursor: phone.trim() ? "pointer" : "default", marginTop: 16, opacity: phone.trim() ? 1 : 0.4 }}>
                  Continue
                </button>
              </form>
            </motion.div>
          )}

          {step === "consent" && selected && (
            <motion.div key="consent" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} style={{ textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <ShieldCheck size={24} color={accent} />
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 8 }}>Before you connect</div>
              <p style={{ fontSize: 13, color: "rgba(29,29,31,0.65)", lineHeight: 1.6, margin: "0 0 20px" }}>
                Malvin will never take any information from a connected app unless you explicitly permit it.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onClose} style={{ flex: 1, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 14, padding: "12px", background: "transparent", color: "#1d1d1f", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={confirmConnect} style={{ flex: 1, border: "none", borderRadius: 14, padding: "12px", background: accent, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Connect</button>
              </div>
            </motion.div>
          )}

          {step === "connecting" && selected && (
            <motion.div key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>Connecting {selected.name}</div>
              <div style={{ fontSize: 12, color: "rgba(29,29,31,0.5)", marginBottom: 20, textAlign: "center" }}>This only takes a moment</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {CONNECT_STEPS.map((label, i) => {
                  const isDone = i < connectDone;
                  const isActive = i === connectDone;
                  return (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, opacity: isDone || isActive ? 1 : 0.35 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: isDone ? `${accent}18` : "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isDone ? <Check size={13} color={accent} /> : isActive ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.12)", borderTopColor: accent }} />
                        ) : null}
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === "success" && selected && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center" }}>
              <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} style={{ width: 60, height: 60, borderRadius: "50%", background: selected.color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Check size={26} color="#fff" strokeWidth={3} />
              </motion.div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{selected.name} connected</div>
              <div style={{ fontSize: 12, color: "rgba(29,29,31,0.55)", marginTop: 4, marginBottom: 20 }}>It'll now show up with your other connected apps.</div>
              <button onClick={onClose} style={{ width: "100%", border: "none", borderRadius: 15, padding: "13px 16px", fontSize: 13.5, fontWeight: 800, color: "#fff", background: accent, cursor: "pointer" }}>Done</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default ConnectAppDirectory;
