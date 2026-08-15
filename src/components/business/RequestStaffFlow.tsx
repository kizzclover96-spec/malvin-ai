import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Package, Camera, Check, Plus } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore as db, storage, auth } from "../../firebase";
import { resolveGuestUid } from "../../services/storefrontAuth";

/* ============================================================================
   RequestStaffFlow
   The floating circular button on the customer store (only when the
   Request Staff tool is enabled). Two paths:
     1. "I need staff here" -> table number -> a short "on their way"
        moment, done.
     2. "Take my order to go" -> table number -> a photo of the current
        order (so staff know the right packaging size) -> uploaded with a
        5-minute expiry; malvinbackend's expireTogoPhotos scheduled
        function actually deletes it after that, this component doesn't
        rely on the customer's tab staying open.
   Both write to business/{businessId}/serviceCalls, which the manager's
   RequestStaffCard (B-Vin.tsx) reads from.
============================================================================ */

type Step = "closed" | "menu" | "staffTable" | "staffWaiting" | "togoTable" | "togoPhoto" | "togoDone";

const RequestStaffFlow: React.FC<{ businessId: string; accent: string; allowToGo: boolean }> = ({ businessId, accent, allowToGo }) => {
  const [step, setStep] = useState<Step>("closed");
  const [tableNumber, setTableNumber] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setStep("closed");
    setTableNumber("");
    setPhotoFile(null);
    setPhotoPreview("");
  };

  const submitStaffCall = async () => {
    if (!tableNumber.trim()) return;
    setSubmitting(true);
    try {
      const uid = await resolveGuestUid(auth);
      await addDoc(collection(db, "business", businessId, "serviceCalls"), {
        type: "requestStaff",
        tableNumber: tableNumber.trim(),
        customerUid: uid,
        resolved: false,
        createdAt: serverTimestamp(),
      });
      setStep("staffWaiting");
      setTimeout(close, 4500);
    } finally {
      setSubmitting(false);
    }
  };

  const pickPhoto = (f: File | null) => {
    setPhotoFile(f);
    setPhotoPreview(f ? URL.createObjectURL(f) : "");
  };

  const submitTogoCall = async () => {
    if (!tableNumber.trim() || !photoFile) return;
    setSubmitting(true);
    try {
      const uid = await resolveGuestUid(auth);
      const callId = `togo_${Date.now()}`;
      let photoUrl: string | undefined;
      let photoStoragePath: string | undefined;
      try {
        photoStoragePath = `business/${businessId}/togoPhotos/${callId}.jpg`;
        const fileRef = storageRef(storage, photoStoragePath);
        const snap = await uploadBytes(fileRef, photoFile);
        photoUrl = await getDownloadURL(snap.ref);
      } catch {
        /* photo is the whole point here, but don't block the request if the upload fails */
      }
      await addDoc(collection(db, "business", businessId, "serviceCalls"), {
        type: "togo",
        tableNumber: tableNumber.trim(),
        customerUid: uid,
        resolved: false,
        ...(photoUrl ? { photoUrl, photoStoragePath } : {}),
        // Purely informational for the manager UI — the actual deletion is
        // enforced server-side by expireTogoPhotos, not by this timestamp
        // being "read" by anything client-side.
        photoExpiresAt: Date.now() + 5 * 60 * 1000,
        createdAt: serverTimestamp(),
      });
      setStep("togoDone");
      setTimeout(close, 3500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* No longer self-positioned — BVinStore.tsx places this directly
          beside the header pill now, sized a little larger than it rather
          than as a bottom-corner floating action button. */}
      <motion.button
        onClick={() => setStep("menu")}
        whileTap={{ scale: 0.92 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "relative", flexShrink: 0, zIndex: 40,
          width: 46, height: 46, borderRadius: "50%", border: "none",
          background: accent, color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 10px 24px ${accent}55`,
        }}
        title="Request staff"
      >
        <User size={19} />
        <span style={{
          position: "absolute", top: -2, right: -2, width: 17, height: 17, borderRadius: "50%",
          background: "#fff", color: accent, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)", border: `1.5px solid ${accent}`,
        }}>
          <Plus size={10} strokeWidth={3} />
        </span>
      </motion.button>

      <AnimatePresence>
        {step !== "closed" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => (step === "staffWaiting" || step === "togoDone" ? undefined : close())}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,20,22,0.4)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 340, background: "#fff", borderRadius: 26, padding: 26, boxShadow: "0 30px 80px rgba(0,0,0,0.22)", position: "relative" }}
            >
              {step !== "staffWaiting" && step !== "togoDone" && (
                <button onClick={close} style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <X size={13} />
                </button>
              )}

              {step === "menu" && (
                <div>
                  <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, textAlign: "center" }}>How can we help?</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button onClick={() => setStep("staffTable")} style={optionBtnStyle(accent)}>
                      <User size={18} color={accent} />
                      <span>I need a staff here</span>
                    </button>
                    {allowToGo && (
                      <button onClick={() => setStep("togoTable")} style={optionBtnStyle(accent)}>
                        <Package size={18} color={accent} />
                        <span>Take my order on my table to go</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {step === "staffTable" && (
                <div>
                  <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, textAlign: "center" }}>What's your seat/table number?</h3>
                  <input
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. 12"
                    autoFocus
                    style={inputStyle}
                  />
                  <button onClick={submitStaffCall} disabled={!tableNumber.trim() || submitting} style={{ ...primaryBtnStyle(accent), marginTop: 14, opacity: !tableNumber.trim() || submitting ? 0.5 : 1 }}>
                    {submitting ? "Sending…" : "Request staff"}
                  </button>
                </div>
              )}

              {step === "staffWaiting" && (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <WalkingPerson accent={accent} />
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: "#1d1d1f", margin: "16px 0 0" }}>A staff is on their way,</p>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>please wait a moment.</p>
                </div>
              )}

              {step === "togoTable" && (
                <div>
                  <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, textAlign: "center" }}>What's your table number?</h3>
                  <input
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. 12"
                    autoFocus
                    style={inputStyle}
                  />
                  <button onClick={() => tableNumber.trim() && setStep("togoPhoto")} disabled={!tableNumber.trim()} style={{ ...primaryBtnStyle(accent), marginTop: 14, opacity: !tableNumber.trim() ? 0.5 : 1 }}>
                    Continue
                  </button>
                </div>
              )}

              {step === "togoPhoto" && (
                <div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, textAlign: "center" }}>Take a photo of your order</h3>
                  <p style={{ fontSize: 11.5, color: "rgba(29,29,31,0.55)", textAlign: "center", margin: "0 0 14px" }}>
                    So staff know the right packaging size. This photo is automatically deleted after 5 minutes.
                  </p>
                  <button
                    onClick={() => document.getElementById("bvin-togo-photo-input")?.click()}
                    style={{ width: "100%", height: 140, borderRadius: 16, border: "1.5px dashed rgba(0,0,0,0.15)", background: photoPreview ? `url(${photoPreview}) center/cover` : "rgba(0,0,0,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 14 }}
                  >
                    {!photoPreview && <Camera size={26} color="#999" />}
                  </button>
                  <input id="bvin-togo-photo-input" type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => pickPhoto(e.target.files?.[0] || null)} />
                  <button onClick={submitTogoCall} disabled={!photoFile || submitting} style={{ ...primaryBtnStyle(accent), opacity: !photoFile || submitting ? 0.5 : 1 }}>
                    {submitting ? "Sending…" : "Send request"}
                  </button>
                </div>
              )}

              {step === "togoDone" && (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} style={{ width: 56, height: 56, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <Check size={26} color="#fff" strokeWidth={3} />
                  </motion.div>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>Request sent — staff will package your order shortly.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* Simple animated walking figure — legs + arms swing via CSS-free framer
   transforms, no image asset needed. */
const WalkingPerson: React.FC<{ accent: string }> = ({ accent }) => (
  <div style={{ display: "flex", justifyContent: "center" }}>
    <svg width="64" height="80" viewBox="0 0 64 80">
      <circle cx="32" cy="14" r="10" fill={accent} />
      <rect x="26" y="26" width="12" height="28" rx="6" fill={accent} />
      <motion.line x1="32" y1="30" x2="18" y2="46" stroke={accent} strokeWidth="6" strokeLinecap="round" animate={{ x2: [18, 26, 18], y2: [46, 40, 46] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }} />
      <motion.line x1="32" y1="30" x2="46" y2="46" stroke={accent} strokeWidth="6" strokeLinecap="round" animate={{ x2: [46, 38, 46], y2: [46, 40, 46] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.35 }} />
      <motion.line x1="30" y1="54" x2="20" y2="76" stroke={accent} strokeWidth="7" strokeLinecap="round" animate={{ x2: [20, 32, 20], y2: [76, 76, 76] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }} />
      <motion.line x1="34" y1="54" x2="44" y2="76" stroke={accent} strokeWidth="7" strokeLinecap="round" animate={{ x2: [44, 32, 44], y2: [76, 76, 76] }} transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.35 }} />
    </svg>
  </div>
);

const optionBtnStyle = (accent: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 16,
  border: `1px solid ${accent}33`, background: `${accent}0d`, color: "#1d1d1f", fontSize: 13.5, fontWeight: 700,
  cursor: "pointer", textAlign: "left",
});

const inputStyle: React.CSSProperties = { width: "100%", fontSize: 15, padding: "13px 15px", borderRadius: 14, border: "1px solid rgba(0,0,0,0.1)", background: "rgba(0,0,0,0.025)", textAlign: "center" };

const primaryBtnStyle = (accent: string): React.CSSProperties => ({
  width: "100%", border: "none", borderRadius: 14, padding: "13px 16px", fontSize: 14, fontWeight: 800,
  color: "#fff", background: accent, cursor: "pointer",
});

export default RequestStaffFlow;