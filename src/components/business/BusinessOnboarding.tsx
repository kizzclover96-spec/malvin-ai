import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  Camera,
  Wallet,
  Globe,
  BadgeCheck,
  Store,
  MapPin,
  Clock,
} from "lucide-react";
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "../../firebase";
import { grantOnboardingVerification } from "../../services/bvinConnections";
import { useLanguage } from "../../contexts/LanguageContext";
import { TOOLS, DEFAULT_TOOLS, CATEGORY_ORDER, CATEGORY_TINTS, ToolKey, ToolState } from "../../config/bvinTools";

/* ============================================================================
   BusinessOnboarding
   Shown once, the very first time a uid opens "I'm a business" and no
   business/{uid} document exists yet. Four short setup screens, then a real
   ~30s "setting up" moment where all the collected data actually gets
   written to Firestore, then a success screen. New businesses also get an
   automatic 24-day verification grant as a welcome perk — routed through
   grantOnboardingVerification (a Cloud Function, see
   src/services/bvinConnections.ts) rather than written directly here, so
   it can't be forged by replaying the same RTDB write from devtools. The
   actual 24-day duration lives server-side in that function.
============================================================================ */

const VERIFICATION_GRANT_DAYS = 24; // display copy only — the real grant duration lives in grantOnboardingVerification
const PROCESSING_MS = 30000;

const PROCESSING_MESSAGES = [
  "Setting up your dashboard…",
  "Applying your business details…",
  "Connecting your tools…",
  "Linking a demo website…",
  "Securing your workspace…",
  "Almost there…",
  "Finishing touches…",
];

interface Props {
  businessId: string;
  defaultName?: string;
  accent: string;
  onComplete: (result: { profile: Record<string, any>; enabledTools: ToolState }) => void;
}

type Step = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6;

const BusinessOnboarding: React.FC<Props> = ({ businessId, defaultName, accent, onComplete }) => {
  const { language, languages, setLanguage } = useLanguage();
  const [step, setStep] = useState<Step>(-1);
  const capturedRef = useRef<{ profile: Record<string, any>; enabledTools: ToolState } | null>(null);

  // Collected across the four setup screens
  const [name, setName] = useState(defaultName || "");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [selectedTools, setSelectedTools] = useState<Set<ToolKey>>(new Set(["customerNotice", "vinbackTags"]));
  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean | null>(null);
  const [langSearch, setLangSearch] = useState("");
  const [setupError, setSetupError] = useState(false);

  const pickLogo = (f: File | null) => {
    setLogoFile(f);
    setLogoPreview(f ? URL.createObjectURL(f) : "");
  };

  const toggleTool = (key: ToolKey) => {
    const def = TOOLS.find((t) => t.key === key);
    if (def?.alwaysOn) return;
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const runSetup = async () => {
    setStep(5);
    setSetupError(false);
    const minWait = new Promise((r) => setTimeout(r, PROCESSING_MS));

    const doWrites = async () => {
      let logoUrl: string | undefined;
      if (logoFile) {
        try {
          const fileRef = storageRef(storage, `business/${businessId}/logo.jpg`);
          const snap = await uploadBytes(fileRef, logoFile);
          logoUrl = await getDownloadURL(snap.ref);
        } catch {
          /* logo is optional — a failed upload shouldn't block onboarding */
        }
      }

      const enabledTools: ToolState = { ...DEFAULT_TOOLS };
      selectedTools.forEach((key) => { enabledTools[key] = true; });
      enabledTools.receiveMoney = !!paymentsEnabled;

      const profilePayload = {
        name: name.trim() || "My Business",
        bio: bio.trim(),
        address: address.trim(),
        openingTime,
        closingTime,
        ...(logoUrl ? { logoUrl } : {}),
        preferredLanguage: language,
        // Gates the first-time UI tour (see CoachMarks below) — flips to
        // true the moment the tour finishes or is skipped, so it never
        // shows again for this business.
        hasSeenTour: false,
      };

      await setDoc(
        doc(firestore, "business", businessId),
        {
          businessId,
          profile: profilePayload,
          enabledTools,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      // Handed straight to B-Vin.tsx via onComplete below, so the dashboard
      // can seed its state from what we already know we just wrote instead
      // of waiting on Firestore's onSnapshot round-trip — that listener
      // deliberately ignores its own pending/local echo (see B-Vin.tsx's
      // hasPendingWrites check, added to kill an earlier infinite-write
      // bug), which meant a freshly onboarded business could sit looking
      // at an empty dashboard for a beat, or in a slow/flaky-connection
      // case, no confirmed snapshot ever arrived on this specific page
      // load at all — completely indistinguishable from "it didn't save,"
      // even though the write itself had already succeeded.
      capturedRef.current = { profile: profilePayload, enabledTools };

      // The 24-day welcome verification grant — routed through a Cloud
      // Function rather than written directly here. users/{uid}/isVerified
      // and .../verifiedUntil are locked behind a .validate rule that only
      // the Admin SDK can satisfy (see grantOnboardingVerification in
      // malvinbackend/src/index.ts), specifically so this can't be forged
      // by replaying the same write from devtools. That function is also
      // idempotent per account, so this is safe to call even on a retry.
      await grantOnboardingVerification({ businessId }).catch(() => {
        /* non-fatal — onboarding still completes even if this one call fails */
      });

      // Default demo connection — shows exactly how easy connecting an
      // external site is, per the onboarding copy, without waiting on the
      // real addWebsiteConnection Cloud Function (no need to actually
      // re-fetch malvinai.com's own metadata for a demo entry).
      await addDoc(collection(firestore, "business", businessId, "connections"), {
        type: "website",
        name: "Malvin",
        url: "https://malvinai.com",
        domain: "malvinai.com",
        iconUrl: "https://malvinai.com/favicon.ico",
        addedAt: Date.now(),
      }).catch(() => {});
    };

    try {
      await Promise.all([doWrites(), minWait]);
      setStep(6);
    } catch (err) {
      // The actual fix for "why doesn't it save": previously an error here
      // (permission-denied, offline, whatever) just left runSetup's promise
      // rejected with nothing awaiting it — the screen stayed on the 30s
      // processing spinner forever, and setStep(6)/onComplete never ran,
      // so nothing ever got handed back to the dashboard. Now it's visible
      // and recoverable instead of a silent, permanent hang.
      console.error("Business onboarding failed to save:", err);
      setSetupError(true);
    }
  };

  useEffect(() => {
    if (step !== 6) return;
    const t = setTimeout(() => {
      if (capturedRef.current) onComplete(capturedRef.current);
    }, 10000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#ffffff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {step > 0 && step < 5 && <ProgressBar step={step} accent={accent} />}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          {step === -1 && (
            <motion.div key="lang" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }} style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                <Globe size={22} color={accent} />
              </div>
              <h1 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 8px", color: "#1d1d1f" }}>Choose your language</h1>
              <p style={{ fontSize: 13, color: "rgba(29,29,31,0.55)", margin: "0 0 20px" }}>This sets the language for your whole dashboard — change it anytime later.</p>
              <input
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                placeholder="Search language…"
                style={{ width: "100%", fontSize: 13.5, padding: "11px 14px", borderRadius: 13, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.025)", marginBottom: 10 }}
              />
              <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, marginBottom: 18, textAlign: "left" }}>
                {languages
                  .filter((l) => l.name.toLowerCase().includes(langSearch.trim().toLowerCase()))
                  .map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 12px", borderRadius: 12, border: language === l.code ? `1.5px solid ${accent}` : "1px solid rgba(0,0,0,0.06)", background: language === l.code ? `${accent}10` : "#fff", color: "#1d1d1f", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      {l.name}
                      {language === l.code && <Check size={14} color={accent} />}
                    </button>
                  ))}
              </div>
              <PrimaryButton accent={accent} onClick={() => setStep(0)}>Continue</PrimaryButton>
            </motion.div>
          )}
          {step === 0 && <Welcome key="s0" accent={accent} onContinue={() => setStep(1)} />}
          {step === 1 && (
            <StepShell key="s1" title="Tell customers about your business" icon={Store} accent={accent} note="Almost there — just the basics for now.">
              <Field label="Business name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anna Luxury" style={inputStyle} autoFocus />
              </Field>
              <Field label="Bio">
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="What do you do?" style={{ ...inputStyle, resize: "none" }} />
              </Field>
              <PrimaryButton accent={accent} onClick={() => setStep(2)} disabled={!name.trim()}>Done</PrimaryButton>
            </StepShell>
          )}
          {step === 2 && (
            <StepShell key="s2" title="Where and when can customers find you?" icon={MapPin} accent={accent} note="Step 2 of 4 — halfway there.">
              <Field label="Address"><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city" style={inputStyle} autoFocus /></Field>
              <div style={{ display: "flex", gap: 10 }}>
                <Field label="Opens"><input type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} style={inputStyle} /></Field>
                <Field label="Closes"><input type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} style={inputStyle} /></Field>
              </div>
              <PrimaryButton accent={accent} onClick={() => setStep(3)}>Done</PrimaryButton>
            </StepShell>
          )}
          {step === 3 && (
            <StepShell key="s3" title="Add a logo and pick your tools" icon={Camera} accent={accent} note="Last section before setup — you can change any of this later." wide>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <button onClick={() => document.getElementById("onboarding-logo-file")?.click()} style={{ width: 64, height: 64, borderRadius: "50%", border: "1px dashed rgba(0,0,0,0.15)", background: logoPreview ? `url(${logoPreview}) center/cover` : "rgba(0,0,0,0.03)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {!logoPreview && <Camera size={20} color="#999" />}
                </button>
                <input id="onboarding-logo-file" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => pickLogo(e.target.files?.[0] || null)} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Logo (optional)</div>
                  <div style={{ fontSize: 11.5, color: "rgba(29,29,31,0.5)" }}>Tap to upload — you can skip this for now.</div>
                </div>
              </div>

              <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 6 }}>
                {CATEGORY_ORDER.map((cat) => (
                  <div key={cat} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: CATEGORY_TINTS[cat] }} />
                      <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, color: "rgba(29,29,31,0.5)" }}>{cat}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 7 }}>
                      {TOOLS.filter((t) => t.category === cat).map((t) => {
                        const on = t.alwaysOn || selectedTools.has(t.key);
                        return (
                          <button
                            key={t.key}
                            onClick={() => toggleTool(t.key)}
                            disabled={t.alwaysOn}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 10px", borderRadius: 12, border: on ? `1.5px solid ${accent}` : "1px solid rgba(0,0,0,0.08)", background: on ? `${accent}12` : "#fff", color: on ? accent : "#1d1d1f", cursor: t.alwaysOn ? "default" : "pointer", fontSize: 11.5, fontWeight: 700, opacity: t.alwaysOn ? 0.7 : 1, textAlign: "left" }}
                          >
                            <t.icon size={13} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "rgba(29,29,31,0.5)", margin: "0 0 14px" }}>You can always select more in settings, and change any of this anytime.</p>
              <PrimaryButton accent={accent} onClick={() => setStep(4)}>Done</PrimaryButton>
            </StepShell>
          )}
          {step === 4 && (
            <StepShell key="s4" title="How do you want to get paid?" icon={Wallet} accent={accent} note="Last step — then we'll set everything up." wide>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                <PaymentOption
                  selected={paymentsEnabled === true}
                  accent={accent}
                  title="Enable payments"
                  desc="Malvin takes 2% from every transaction, unless you go Premium."
                  onClick={() => setPaymentsEnabled(true)}
                />
                <PaymentOption
                  selected={paymentsEnabled === false}
                  accent={accent}
                  title="Customers pay in store"
                  desc="Malvin takes no percentage."
                  recommended
                  onClick={() => setPaymentsEnabled(false)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, background: "rgba(0,0,0,0.03)", marginBottom: 18 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Globe size={14} color={accent} />
                </div>
                <p style={{ fontSize: 11.5, color: "rgba(29,29,31,0.6)", margin: 0, lineHeight: 1.5 }}>
                  Malvin auto-connects its own website to your dashboard by default, so you can see exactly how easy it is to connect other websites and external services.
                </p>
              </div>

              <PrimaryButton accent={accent} onClick={runSetup} disabled={paymentsEnabled === null}>Done</PrimaryButton>
            </StepShell>
          )}
          {step === 5 && !setupError && <Processing key="s5" accent={accent} />}
          {step === 5 && setupError && (
            <motion.div key="setupError" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", maxWidth: 320 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(220,60,60,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                <Store size={24} color="#c23a3a" />
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 8px", color: "#1d1d1f" }}>Couldn't save your setup</h2>
              <p style={{ fontSize: 12.5, color: "rgba(29,29,31,0.6)", margin: "0 0 20px" }}>
                Check your connection and try again — nothing's been lost, your answers are still right here.
              </p>
              <PrimaryButton accent={accent} onClick={runSetup}>Try again</PrimaryButton>
            </motion.div>
          )}
          {step === 6 && <Success key="s6" accent={accent} onFinish={() => capturedRef.current && onComplete(capturedRef.current)} />}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* --------------------------------- Screens --------------------------------- */

const Welcome: React.FC<{ accent: string; onContinue: () => void }> = ({ accent, onContinue }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }} style={{ textAlign: "center", maxWidth: 360 }}>
    <MalvinMascot accent={accent} />
    <h1 style={{ fontSize: 22, fontWeight: 800, margin: "18px 0 8px", color: "#1d1d1f" }}>Hello there, welcome to Malvin Business.</h1>
    <p style={{ fontSize: 14.5, color: "rgba(29,29,31,0.62)", lineHeight: 1.6, margin: "0 0 28px" }}>
      My name is Malvin, and let's set up your dashboard in 4 simple steps.
    </p>
    <PrimaryButton accent={accent} onClick={onContinue}>Continue</PrimaryButton>
  </motion.div>
);

/** Original, lightweight mascot — inspired by the reference art (rounded
    headphone-eared head, glowing crescent eyes, blue glow), built as plain
    SVG/CSS since no clean transparent asset exists to embed directly. */
const MalvinMascot: React.FC<{ accent: string }> = ({ accent }) => (
  <div style={{ display: "flex", justifyContent: "center" }}>
    <motion.svg width="120" height="130" viewBox="0 0 120 130" initial={{ y: 0 }} animate={{ y: [0, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
      <defs>
        <radialGradient id="mascotGlow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="55" r="55" fill="url(#mascotGlow)" />
      {/* headphone band */}
      <path d="M30 45 Q60 10 90 45" stroke="#1d1d1f" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="52" r="9" fill="#1d1d1f" />
      <circle cx="92" cy="52" r="9" fill="#1d1d1f" />
      {/* head */}
      <rect x="26" y="34" width="68" height="60" rx="26" fill="#1d1d1f" />
      {/* visor */}
      <rect x="36" y="48" width="48" height="30" rx="14" fill="#0a0e18" />
      {/* crescent eyes */}
      <path d="M46 60 a6 6 0 1 0 0 8 a8 8 0 1 1 0 -8" fill={accent} />
      <path d="M70 60 a6 6 0 1 0 0 8 a8 8 0 1 1 0 -8" fill={accent} />
      {/* body */}
      <rect x="38" y="96" width="44" height="30" rx="14" fill="#1d1d1f" />
      <circle cx="60" cy="108" r="7" fill="#0a0e18" />
      <text x="60" y="112" textAnchor="middle" fontSize="8" fontWeight="800" fill={accent}>M</text>
      {/* waving arm */}
      <motion.g animate={{ rotate: [0, 22, 0, 22, 0] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.6 }} style={{ transformOrigin: "86px 100px" }}>
        <circle cx="86" cy="100" r="9" fill="#1d1d1f" />
        <circle cx="98" cy="86" r="7" fill="#1d1d1f" />
      </motion.g>
      <circle cx="34" cy="100" r="9" fill="#1d1d1f" />
    </motion.svg>
  </div>
);

const StepShell: React.FC<{ title: string; icon: React.ElementType; accent: string; note: string; wide?: boolean; children: React.ReactNode }> = ({ title, icon: Icon, accent, note, wide, children }) => (
  <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }} style={{ width: "100%", maxWidth: wide ? 420 : 360 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={17} color={accent} />
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1d1d1f", margin: 0 }}>{title}</h2>
    </div>
    <p style={{ fontSize: 11.5, color: accent, fontWeight: 700, margin: "0 0 20px 46px" }}>{note}</p>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
  </motion.div>
);

const Processing: React.FC<{ accent: string }> = ({ accent }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepMs = PROCESSING_MS / PROCESSING_MESSAGES.length;
    const msgTimer = setInterval(() => setMsgIndex((i) => Math.min(i + 1, PROCESSING_MESSAGES.length - 1)), stepMs);
    const progressTimer = setInterval(() => setProgress((p) => Math.min(100, p + 100 / (PROCESSING_MS / 200))), 200);
    return () => { clearInterval(msgTimer); clearInterval(progressTimer); };
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: "center", maxWidth: 320 }}>
      <div style={{ width: 90, height: 90, margin: "0 auto 22px", position: "relative" }}>
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="6" />
          <motion.circle
            cx="45" cy="45" r="38" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 38}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "45px 45px", strokeDashoffset: 2 * Math.PI * 38 * 0.7 }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MalvinMascot accent={accent} />
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={msgIndex} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f", margin: "0 0 16px" }}>
          {PROCESSING_MESSAGES[msgIndex]}
        </motion.p>
      </AnimatePresence>
      <div style={{ height: 4, borderRadius: 4, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <motion.div animate={{ width: `${progress}%` }} style={{ height: "100%", background: accent, borderRadius: 4 }} />
      </div>
    </motion.div>
  );
};

const Success: React.FC<{ accent: string; onFinish: () => void }> = ({ accent, onFinish }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: "center", maxWidth: 340 }}>
    <motion.div
      initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}
      style={{ width: 76, height: 76, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}
    >
      <Check size={36} color="#fff" strokeWidth={3.2} />
    </motion.div>
    <h2 style={{ fontSize: 19, fontWeight: 800, color: "#1d1d1f", margin: "0 0 6px" }}>You're all set — enjoy!</h2>
    <p style={{ fontSize: 13, color: "rgba(29,29,31,0.55)", margin: "0 0 22px" }}>Your dashboard is ready to go.</p>

    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, background: "rgba(0,127,255,0.08)", border: "1px solid rgba(0,127,255,0.18)", textAlign: "left" }}
    >
      <BadgeCheck size={22} color="#007fff" style={{ flexShrink: 0 }} />
      <p style={{ fontSize: 12.5, color: "#1d1d1f", margin: 0, lineHeight: 1.5 }}>
        You've been given <b>verification for {VERIFICATION_GRANT_DAYS} days</b> — enjoy the benefits!
      </p>
    </motion.div>

    <button onClick={onFinish} style={{ marginTop: 22, background: "none", border: "none", fontSize: 12, fontWeight: 700, color: accent, cursor: "pointer" }}>
      Go to dashboard now
    </button>
  </motion.div>
);

/* -------------------------------- Small pieces -------------------------------- */

const ProgressBar: React.FC<{ step: Step; accent: string }> = ({ step, accent }) => (
  <div style={{ display: "flex", gap: 6, padding: "20px 24px 0" }}>
    {[1, 2, 3, 4].map((n) => (
      <div key={n} style={{ flex: 1, height: 4, borderRadius: 4, background: n <= step ? accent : "rgba(0,0,0,0.08)", transition: "background 0.3s ease" }} />
    ))}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ flex: 1 }}>
    <label style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, opacity: 0.5, display: "block", marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);

const PaymentOption: React.FC<{ selected: boolean; accent: string; title: string; desc: string; recommended?: boolean; onClick: () => void }> = ({ selected, accent, title, desc, recommended, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 16, textAlign: "left", cursor: "pointer",
      border: selected ? `1.5px solid ${accent}` : "1px solid rgba(0,0,0,0.08)", background: selected ? `${accent}0d` : "#fff",
    }}
  >
    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selected ? accent : "rgba(0,0,0,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
      {selected && <div style={{ width: 9, height: 9, borderRadius: "50%", background: accent }} />}
    </div>
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#1d1d1f" }}>{title}</span>
        {recommended && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>RECOMMENDED</span>}
      </div>
      <div style={{ fontSize: 11.5, color: "rgba(29,29,31,0.55)", marginTop: 2 }}>{desc}</div>
    </div>
  </button>
);

const PrimaryButton: React.FC<{ accent: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ accent, onClick, disabled, children }) => (
  <motion.button
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    disabled={disabled}
    style={{ width: "100%", border: "none", borderRadius: 15, padding: "14px 20px", fontSize: 14, fontWeight: 800, color: "#fff", background: accent, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, boxShadow: disabled ? "none" : `0 10px 24px ${accent}44`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
  >
    {children} <ChevronRight size={15} />
  </motion.button>
);

const inputStyle: React.CSSProperties = { width: "100%", fontSize: 14, padding: "12px 14px", borderRadius: 13, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.025)", color: "#1d1d1f", fontFamily: "inherit" };

export default BusinessOnboarding;