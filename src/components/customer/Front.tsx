import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Bell, HardDrive, Tag, QrCode, Link2, X, Check, Camera, ChevronRight, Trash2, ScanLine, Sparkles, LogOut } from "lucide-react";
import { doc, setDoc, addDoc, deleteDoc, collection, onSnapshot, serverTimestamp, orderBy, query } from "firebase/firestore";
import { firestore as db, auth } from "../../firebase";
import { signOut, onAuthStateChanged, type User } from "firebase/auth";
import { Html5Qrcode } from "html5-qrcode";
import { NotificationBell } from "./Notification";
import VinBackTagCreate from "../vinback/VinBackTagCreate";
import VinBackTagList from "../vinback/VinBackTagList";

/* ============================================================================
   Front.tsx — drastically simplified per request. The only two things a
   customer actually does here: create a VinBack lost-and-found tag, or
   scan/save a QR code or link into their own private vault. Everything
   else the old 2600-line version carried (wallet, business discovery,
   settings, nearby/recent businesses, receipts, etc.) is gone.

   Free tier: 5 saved links/QR codes total (shared pool, not separate).
   Past that: pay-as-you-go (\u20ac0.35/item, billing NOT actually wired yet —
   see the note on ACCENT/billing writes below) or a \u20ac10.99/mo plan for up
   to 25. Every popup in the save flow is written to actually build desire
   for those upgrades, not just gate the feature.
============================================================================ */

const ACCENT = "#4F9CF9";
const FREE_LIMIT = 5;
const PLAN_LIMIT = 25;
const OVERAGE_PRICE = "€0.35";
const PLAN_PRICE = "€10.99";

interface SavedLink {
  id: string;
  type: "qr" | "link";
  value: string;
  createdAt?: any;
}

interface BillingStatus {
  payAsYouGo?: boolean;
  monthlyPlan?: boolean;
}

export const Front: React.FC = () => {
  // Reactive, not a synchronous auth.currentUser read — Firebase Auth
  // restores a persisted session asynchronously, so reading
  // auth.currentUser directly at render time can momentarily return
  // null-then-real-user (or vice versa on sign-out) without this
  // component re-rendering to pick it up. That race is what was firing
  // "Missing or insufficient permissions" on the notifications/savedLinks/
  // billing listeners below: they'd occasionally spin up with a uid
  // before request.auth was actually attached server-side. Subscribing
  // via onAuthStateChanged guarantees `user` only ever reflects a
  // confirmed auth state, and updates (tearing down old listeners via the
  // [user?.uid] deps below) the instant it changes.
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const [tagCreateOpen, setTagCreateOpen] = useState(false);
  const [tagListOpen, setTagListOpen] = useState(false);
  const [linksListOpen, setLinksListOpen] = useState(false);
  const [storageMenuOpen, setStorageMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [saveFlowOpen, setSaveFlowOpen] = useState(false);

  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
  const [billing, setBilling] = useState<BillingStatus>({});

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "customers", user.uid, "savedLinks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => setSavedLinks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "customers", user.uid, "billing", "status"), (snap) => setBilling(snap.exists() ? (snap.data() as BillingStatus) : {}));
    return () => unsub();
  }, [user?.uid]);

  const slotsUsed = savedLinks.length;
  const planActive = billing.monthlyPlan;
  const limit = planActive ? PLAN_LIMIT : FREE_LIMIT;
  const overFreeLimit = slotsUsed >= FREE_LIMIT && !billing.payAsYouGo && !billing.monthlyPlan;

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", position: "relative", overflowX: "hidden", fontFamily: "Inter, sans-serif", color: "#0f172a" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes frontDrift { 0%,100%{ transform: translate(0,0) scale(1); } 50%{ transform: translate(3%,4%) scale(1.08); } }
        .front-drift { animation: frontDrift 15s ease-in-out infinite; }
        .front-glass-pill {
          display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 999px;
          background: rgba(255,255,255,0.65); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.85); box-shadow: 0 10px 26px rgba(15,23,42,0.08);
        }
        .front-icon-btn {
          width: 34px; height: 34px; border-radius: 50%; border: none; background: transparent;
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: #0f172a; position: relative;
        }
        .front-icon-btn:hover { background: rgba(15,23,42,0.05); }
        .front-main-btn {
          width: 100%; display: flex; align-items: center; gap: 14px; padding: 18px; border-radius: 20px;
          border: 1px solid rgba(15,23,42,0.08); background: #fff; cursor: pointer; text-align: left;
          transition: transform 0.18s ease, box-shadow 0.2s ease;
        }
        .front-main-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(15,23,42,0.1); }
        .front-main-btn:active { transform: scale(0.98); }
      `}</style>

      {/* Ambient background */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div className="front-drift" style={{ position: "absolute", top: "-10%", right: "-8%", width: "55vw", height: "55vw", maxWidth: 460, maxHeight: 460, background: `radial-gradient(circle, ${ACCENT}1c 0%, transparent 70%)`, filter: "blur(70px)" }} />
        <div className="front-drift" style={{ position: "absolute", bottom: "0%", left: "-12%", width: "48vw", height: "48vw", maxWidth: 400, maxHeight: 400, background: `radial-gradient(circle, ${ACCENT}14 0%, transparent 70%)`, filter: "blur(70px)", animationDelay: "4s" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "24px 20px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 60, flexWrap: "wrap" }}>
          <div style={{ width: 90 }} />
          <div className="front-glass-pill">
            <Mail size={14} color={ACCENT} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{user?.email || "Signed in"}</span>
          </div>
          <div className="front-glass-pill" style={{ position: "relative", padding: "6px 8px" }}>
            {user?.uid && <NotificationBell userId={user.uid} />}
            <button className="front-icon-btn" onClick={() => setStorageMenuOpen((v) => !v)} title="My storage">
              <HardDrive size={16} />
            </button>

            <AnimatePresence>
              {storageMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  style={{ position: "absolute", top: 46, right: 0, zIndex: 50, width: 220, background: "#fff", borderRadius: 16, padding: 8, boxShadow: "0 20px 50px rgba(0,0,0,0.16)" }}
                >
                  <button onClick={() => { setStorageMenuOpen(false); setTagListOpen(true); }} style={storageMenuItemStyle}>
                    <Tag size={15} color={ACCENT} /> All my tags
                  </button>
                  <button onClick={() => { setStorageMenuOpen(false); setLinksListOpen(true); }} style={storageMenuItemStyle}>
                    <Link2 size={15} color={ACCENT} /> Saved links & QR codes
                  </button>
                  <div style={{ height: 1, background: "rgba(15,23,42,0.06)", margin: "4px 4px" }} />
                  <button onClick={() => { setStorageMenuOpen(false); setLogoutConfirmOpen(true); }} style={{ ...storageMenuItemStyle, color: "#c23a3a" }}>
                    <LogOut size={15} color="#c23a3a" /> Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center card */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{
              width: "100%", maxWidth: 420, background: "rgba(255,255,255,0.7)", backdropFilter: "blur(26px) saturate(180%)", WebkitBackdropFilter: "blur(26px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.9)", borderRadius: 28, padding: 26, boxShadow: `0 30px 70px ${ACCENT}1c`,
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: `${ACCENT}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Sparkles size={20} color={ACCENT} />
              </div>
              <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>What would you like to do?</h1>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <TagCreateEntry onClick={() => setTagCreateOpen(true)} />
              <SaveLinkEntry slotsUsed={slotsUsed} limit={limit} onOpen={() => setSaveFlowOpen(true)} />
            </div>
          </motion.div>
        </div>
      </div>

      {tagCreateOpen && <VinBackTagCreate onClose={() => setTagCreateOpen(false)} />}
      {tagListOpen && <VinBackTagList onClose={() => setTagListOpen(false)} />}

      <AnimatePresence>
        {linksListOpen && (
          <SavedLinksList links={savedLinks} onClose={() => setLinksListOpen(false)} userId={user?.uid || ""} />
        )}
      </AnimatePresence>

      <SaveLinkFlow
        open={saveFlowOpen}
        onOpenChange={setSaveFlowOpen}
        userId={user?.uid || ""}
        slotsUsed={slotsUsed}
        overFreeLimit={overFreeLimit}
      />

      <AnimatePresence>
        {logoutConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLogoutConfirmOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(20,20,22,0.45)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 320, background: "#fff", borderRadius: 24, padding: 24, boxShadow: "0 30px 80px rgba(0,0,0,0.25)", textAlign: "center" }}
            >
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>Log out?</h3>
              <p style={{ fontSize: 12.5, color: "rgba(15,23,42,0.55)", margin: "0 0 20px" }}>
                You'll need to sign in again to get back to your tags and saved links.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setLogoutConfirmOpen(false)} style={ghostBtnStyle}>Cancel</button>
                <button onClick={() => signOut(auth)} style={{ ...primaryBtnStyle, flex: 1, background: "#c23a3a" }}>Log out</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const storageMenuItemStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 11,
  border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#0f172a", textAlign: "left",
};

const TagCreateEntry: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button className="front-main-btn" onClick={onClick}>
    <div style={{ width: 42, height: 42, borderRadius: 13, background: `${ACCENT}16`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Tag size={19} color={ACCENT} />
    </div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 800 }}>Create a VinBack tag</div>
      <div style={{ fontSize: 11.5, color: "rgba(15,23,42,0.55)" }}>Never lose a property again</div>
    </div>
    <ChevronRight size={16} color="rgba(15,23,42,0.3)" style={{ marginLeft: "auto" }} />
  </button>
);

const SaveLinkEntry: React.FC<{ slotsUsed: number; limit: number; onOpen: () => void }> = ({ slotsUsed, limit, onOpen }) => (
  <button className="front-main-btn" onClick={onOpen}>
    <div style={{ width: 42, height: 42, borderRadius: 13, background: `${ACCENT}16`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <QrCode size={19} color={ACCENT} />
    </div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 800 }}>Scan & save QR codes and links</div>
      <div style={{ fontSize: 11.5, color: "rgba(15,23,42,0.55)" }}>{slotsUsed}/{limit} slots used</div>
    </div>
    <ChevronRight size={16} color="rgba(15,23,42,0.3)" style={{ marginLeft: "auto" }} />
  </button>
);

/* ---------------------------------------------------------------------------
   SaveLinkFlow — owns its own "open" state (openSaveFlow custom event) so
   Front.tsx's JSX above doesn't need a dozen more useState hooks wired
   through it. Handles the entire funnel: choose scan-or-type -> confirm ->
   free save OR the pay-as-you-go / monthly-plan upsell sequence.
--------------------------------------------------------------------------- */
type FlowStep = "menu" | "scan" | "typeLink" | "confirm" | "saved" | "payAsYouGo" | "monthlyPlan";

const SaveLinkFlow: React.FC<{ open: boolean; onOpenChange: (v: boolean) => void; userId: string; slotsUsed: number; overFreeLimit: boolean }> = ({ open, onOpenChange, userId, slotsUsed, overFreeLimit }) => {
  const [step, setStep] = useState<FlowStep>("menu");
  const [pending, setPending] = useState<{ type: "qr" | "link"; value: string } | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (open) setStep("menu"); // reset to the start each time it's reopened
  }, [open]);

  const close = () => {
    onOpenChange(false);
    setPending(null);
    setLinkInput("");
  };

  const onScanned = (value: string) => {
    setPending({ type: "qr", value });
    setStep("confirm");
  };

  const submitLink = () => {
    if (!linkInput.trim()) return;
    setPending({ type: "link", value: linkInput.trim() });
    setStep("confirm");
  };

  const actuallySave = async () => {
    if (!pending || !userId) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "customers", userId, "savedLinks"), {
        type: pending.type,
        value: pending.value,
        createdAt: serverTimestamp(),
      });
      setSavedCount(slotsUsed + 1);
      setPending(null);
      setStep("saved");
    } finally {
      setSaving(false);
    }
  };

  const confirmYes = () => {
    if (overFreeLimit) {
      setStep("payAsYouGo");
      return;
    }
    actuallySave();
  };

  const activatePayAsYouGo = async () => {
    if (userId) {
      await setDoc(doc(db, "customers", userId, "billing", "status"), { payAsYouGo: true, payAsYouGoActivatedAt: serverTimestamp() }, { merge: true });
    }
    await actuallySave();
  };

  const activateMonthlyPlan = async () => {
    if (userId) {
      await setDoc(doc(db, "customers", userId, "billing", "status"), { monthlyPlan: true, monthlyPlanActivatedAt: serverTimestamp() }, { merge: true });
    }
    await actuallySave();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="save-flow-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={step === "scan" ? undefined : close}
        style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(20,20,22,0.45)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: "100%", maxWidth: 360, background: "#fff", borderRadius: 26, padding: 26, boxShadow: "0 30px 80px rgba(0,0,0,0.25)", position: "relative" }}
        >
          {step !== "scan" && (
            <button onClick={close} style={{ position: "absolute", top: 16, right: 16, background: "rgba(15,23,42,0.05)", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={13} />
            </button>
          )}

          {step === "menu" && (
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Save a QR code or link</h3>
              <p style={{ fontSize: 12.5, color: "rgba(15,23,42,0.55)", margin: "0 0 18px" }}>Keep it somewhere only you can reach.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => setStep("scan")} style={saveOptionStyle}>
                  <ScanLine size={18} color={ACCENT} />
                  <span>Scan a QR code</span>
                </button>
                <button onClick={() => setStep("typeLink")} style={saveOptionStyle}>
                  <Link2 size={18} color={ACCENT} />
                  <span>Input a link / website</span>
                </button>
              </div>
            </div>
          )}

          {step === "scan" && (
            <GenericQrScanner onScanned={onScanned} onCancel={close} />
          )}

          {step === "typeLink" && (
            <div>
              <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>What's the link?</h3>
              <input
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://…"
                autoFocus
                style={{ width: "100%", fontSize: 14, padding: "13px 15px", borderRadius: 14, border: "1px solid rgba(15,23,42,0.1)", marginBottom: 14 }}
              />
              <button onClick={submitLink} disabled={!linkInput.trim()} style={{ ...primaryBtnStyle, opacity: !linkInput.trim() ? 0.5 : 1 }}>
                Continue
              </button>
            </div>
          )}

          {step === "confirm" && pending && (
            <div>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: `${ACCENT}16`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                {pending.type === "qr" ? <QrCode size={20} color={ACCENT} /> : <Link2 size={20} color={ACCENT} />}
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800 }}>Save this for you?</h3>
              <p style={{ fontSize: 12, color: "rgba(15,23,42,0.55)", margin: "0 0 8px", wordBreak: "break-all" }}>{pending.value}</p>
              <p style={{ fontSize: 12, color: "rgba(15,23,42,0.55)", margin: "0 0 18px" }}>
                Do you want us to save this {pending.type === "qr" ? "QR code" : "link"} for you? Only you will be able to access it.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={close} style={ghostBtnStyle}>No</button>
                <button onClick={confirmYes} disabled={saving} style={{ ...primaryBtnStyle, flex: 1, opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving…" : "Yes, save it"}
                </button>
              </div>
            </div>
          )}

          {step === "saved" && (
            <div style={{ textAlign: "center" }}>
              <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} style={{ width: 56, height: 56, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Check size={26} color="#fff" strokeWidth={3} />
              </motion.div>
              <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>Saved!</p>
              <p style={{ fontSize: 12.5, color: "rgba(15,23,42,0.55)", margin: "0 0 18px" }}>
                You've used <b>{savedCount}</b> out of <b>{savedCount <= FREE_LIMIT ? FREE_LIMIT : "your"}</b> slots.
              </p>
              <button onClick={close} style={primaryBtnStyle}>Done</button>
            </div>
          )}

          {step === "payAsYouGo" && (
            <div>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(245,158,11,0.14)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <HardDrive size={20} color="#b45309" />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>Your free slots are full</h3>
              <p style={{ fontSize: 12.5, color: "rgba(15,23,42,0.6)", lineHeight: 1.55, margin: "0 0 18px" }}>
                Don't worry — you'll be set up as pay-as-you-go. Every new link or QR code from here gets charged just <b>{OVERAGE_PRICE}</b>, deducted automatically. Press continue to save this one now, or go back for another option.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep("monthlyPlan")} style={ghostBtnStyle}>Back</button>
                <button onClick={activatePayAsYouGo} disabled={saving} style={{ ...primaryBtnStyle, flex: 1, opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving…" : "Continue"}
                </button>
              </div>
            </div>
          )}

          {step === "monthlyPlan" && (
            <div>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: `${ACCENT}16`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Sparkles size={20} color={ACCENT} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>Did you know?</h3>
              <p style={{ fontSize: 12.5, color: "rgba(15,23,42,0.6)", lineHeight: 1.55, margin: "0 0 18px" }}>
                You can enable a <b>{PLAN_PRICE}/month</b> plan and save up to <b>{PLAN_LIMIT} links</b> — never lose an important link again.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={close} style={ghostBtnStyle}>Not interested</button>
                <button onClick={activateMonthlyPlan} disabled={saving} style={{ ...primaryBtnStyle, flex: 1, opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving…" : "Activate plan"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const saveOptionStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 16,
  border: `1px solid ${ACCENT}33`, background: `${ACCENT}0d`, color: "#0f172a", fontSize: 13.5, fontWeight: 700,
  cursor: "pointer", textAlign: "left",
};
const primaryBtnStyle: React.CSSProperties = {
  width: "100%", border: "none", borderRadius: 14, padding: "13px 16px", fontSize: 14, fontWeight: 800,
  color: "#fff", background: ACCENT, cursor: "pointer",
};
const ghostBtnStyle: React.CSSProperties = {
  flex: 1, border: "1px solid rgba(15,23,42,0.1)", borderRadius: 14, padding: "13px 16px", fontSize: 13.5, fontWeight: 700,
  color: "#0f172a", background: "#fff", cursor: "pointer",
};

/* ---------------------------------------------------------------------------
   GenericQrScanner — a plain camera QR reader that just hands back whatever
   text was encoded. Deliberately NOT VinScanner (that component is tightly
   coupled to resolving Malvin business links, not generic arbitrary QR
   content) — same html5-qrcode approach ScannerPairClaim.tsx already uses.
--------------------------------------------------------------------------- */
const GenericQrScanner: React.FC<{ onScanned: (value: string) => void; onCancel: () => void }> = ({ onScanned, onCancel }) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = "front-generic-qr-scanner";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          (decodedText) => {
            if (cancelled) return;
            cancelled = true;
            scanner.stop().catch(() => {});
            onScanned(decodedText);
          },
          () => { /* per-frame decode misses — expected constantly, ignore */ }
        );
      } catch (err: any) {
        setError(err?.message || "Couldn't access the camera. Check camera permissions and try again.");
      }
    })();
    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => {});
      scannerRef.current?.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, textAlign: "center" }}>Point at a QR code</h3>
      <div id={elementId} style={{ width: "100%", aspectRatio: "1", borderRadius: 18, overflow: "hidden", background: "#000", marginBottom: 14 }} />
      {error && <p style={{ fontSize: 12, color: "#d64545", textAlign: "center", marginBottom: 12 }}>{error}</p>}
      <button onClick={onCancel} style={ghostBtnStyle}>Cancel</button>
    </div>
  );
};

/* ---------------------------------------------------------------------------
   SavedLinksList — the "storage" pill's second menu item.
--------------------------------------------------------------------------- */
const SavedLinksList: React.FC<{ links: SavedLink[]; userId: string; onClose: () => void }> = ({ links, userId, onClose }) => {
  const remove = async (id: string) => {
    await deleteDoc(doc(db, "customers", userId, "savedLinks", id)).catch(() => {});
  };
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(20,20,22,0.45)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 400, maxHeight: "80vh", background: "#fff", borderRadius: 26, padding: 22, boxShadow: "0 30px 80px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Saved links & QR codes</h3>
          <button onClick={onClose} style={{ background: "rgba(15,23,42,0.05)", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {links.length === 0 && <p style={{ fontSize: 12.5, color: "rgba(15,23,42,0.5)", textAlign: "center", padding: "20px 0" }}>Nothing saved yet.</p>}
          {links.map((l) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(15,23,42,0.07)" }}>
              {l.type === "qr" ? <QrCode size={16} color={ACCENT} /> : <Link2 size={16} color={ACCENT} />}
              <span style={{ fontSize: 12.5, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.value}</span>
              <button onClick={() => remove(l.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c23a3a", flexShrink: 0 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Front;