import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Server, X, Package, ScanLine, Boxes, QrCode, PenLine, Check } from "lucide-react";
import { ref as rtdbRef, set, remove, onValue, serverTimestamp as rtdbServerTimestamp } from "firebase/database";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db as rtdb, firestore } from "../../firebase";
import BrandedQrCode from "./BrandedQrCode";

/* ============================================================================
   ConnectSystemInventoryModal
   Reached from Apps & Connections → "Connect System". First question is
   always "Do you already have inventory somewhere else?" —

     No  → start fresh with System Inventory (the renamed inventory tool,
           entered manually from here on).
     Yes → Connect Lager: Malvin generates a short-lived QR/pairing token.
           Scanning it from the existing POS/warehouse/ERP system (via a
           Malvin Connector, once one exists on that side) claims the
           session and hands the connection over — same secure short-lived
           pairing pattern already used for the barcode scanner pairing
           flow, just a different RTDB path. This screen only builds the
           pairing handshake and marks the source as connected; the actual
           product import happens wherever that external system's own
           connector implements it — a Level 1 "external → Malvin" sync per
           the Connect Lager spec, ready for that piece to be wired in.
============================================================================ */

const SESSION_TTL_MS = 5 * 60 * 1000;

async function createInventoryConnectSession(businessId: string): Promise<{ sessionId: string; url: string }> {
  const sessionId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  await set(rtdbRef(rtdb, `inventoryConnectSessions/${businessId}/${sessionId}`), {
    status: "pending",
    createdAt: rtdbServerTimestamp(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return { sessionId, url: `https://malvinai.com/connect-inventory/${businessId}/${sessionId}` };
}

async function revokeInventoryConnectSession(businessId: string, sessionId: string) {
  try {
    await remove(rtdbRef(rtdb, `inventoryConnectSessions/${businessId}/${sessionId}`));
  } catch {
    /* session may already be gone — fine */
  }
}

type Step = "summary" | "ask" | "fresh" | "external";

interface ConnectSystemInventoryModalProps {
  open: boolean;
  enabled: boolean;
  businessId: string;
  onEnable: (sourceName?: string) => void;
  onOpen: () => void;
  onClose: () => void;
  accent: string;
}

const ConnectSystemInventoryModal: React.FC<ConnectSystemInventoryModalProps> = ({ open, enabled, businessId, onEnable, onOpen, onClose, accent }) => {
  const [step, setStep] = useState<Step>("summary");
  const [enabling, setEnabling] = useState(false);

  // External pairing state
  const [pairingUrl, setPairingUrl] = useState<string | null>(null);
  const [pairingSessionId, setPairingSessionId] = useState<string | null>(null);
  const [pairingStatus, setPairingStatus] = useState<"pending" | "claimed" | null>(null);
  const [pairingSourceName, setPairingSourceName] = useState<string | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [msLeft, setMsLeft] = useState(SESSION_TTL_MS);

  // Reset to the right entry point every time the modal opens
  useEffect(() => {
    if (open) setStep(enabled ? "summary" : "ask");
  }, [open, enabled]);

  // Start / tear down the external pairing session
  useEffect(() => {
    if (step !== "external" || !businessId) return;
    let cancelled = false;
    setPairingError(null);
    setPairingStatus("pending");
    createInventoryConnectSession(businessId)
      .then(({ sessionId, url }) => {
        if (cancelled) return;
        setPairingSessionId(sessionId);
        setPairingUrl(url);
        setMsLeft(SESSION_TTL_MS);
      })
      .catch(() => !cancelled && setPairingError("Couldn't start the connection. Try again."));
    return () => {
      cancelled = true;
      setPairingUrl(null);
      setPairingSessionId(null);
      setPairingStatus(null);
      setPairingSourceName(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, businessId]);

  // Listen for the external system claiming the session, and clean up if it's abandoned
  useEffect(() => {
    if (step !== "external" || !businessId || !pairingSessionId) return;
    const sessRef = rtdbRef(rtdb, `inventoryConnectSessions/${businessId}/${pairingSessionId}`);
    const unsub = onValue(sessRef, (snap) => {
      const val = snap.val();
      if (val?.status === "claimed") {
        setPairingStatus("claimed");
        setPairingSourceName(val.sourceName || "External inventory");
      }
    });
    const countdown = setInterval(() => setMsLeft((ms) => Math.max(0, ms - 1000)), 1000);
    return () => {
      unsub();
      clearInterval(countdown);
      revokeInventoryConnectSession(businessId, pairingSessionId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, businessId, pairingSessionId]);

  const confirmExternalConnected = async () => {
    if (businessId) {
      await setDoc(doc(firestore, "business", businessId, "connectedInventorySources", pairingSessionId || "external"), {
        name: pairingSourceName || "External inventory",
        connectedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }
    onEnable(pairingSourceName || undefined);
    onClose();
  };

  const handleEnableFresh = () => {
    setEnabling(true);
    setTimeout(() => {
      onEnable();
      setEnabling(false);
    }, 900);
  };

  const mm = String(Math.floor(msLeft / 60000)).padStart(2, "0");
  const ss = String(Math.floor((msLeft % 60000) / 1000)).padStart(2, "0");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={enabling ? undefined : onClose}
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(20,20,22,0.4)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            style={{ width: "100%", maxWidth: 360, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(30px) saturate(180%)", WebkitBackdropFilter: "blur(30px) saturate(180%)", border: "1px solid rgba(255,255,255,0.85)", borderRadius: 26, padding: 24, boxShadow: "0 30px 70px rgba(0,0,0,0.22)", color: "#1d1d1f", textAlign: "center", position: "relative" }}
          >
            {!enabling && (
              <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={13} />
              </button>
            )}

            <AnimatePresence mode="wait">
              {/* ------------------------------ Already connected ------------------------------ */}
              {step === "summary" && (
                <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Server size={24} color={accent} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>System Inventory</div>
                  <p style={{ fontSize: 12.5, color: "rgba(29,29,31,0.55)", lineHeight: 1.5, margin: "0 0 20px" }}>
                    Already connected. Workers with "Scan &amp; check inventory" turned on can scan a barcode and see live stock from their dashboard.
                  </p>
                  <button onClick={() => { onOpen(); onClose(); }} style={btnStyle(accent)}>Open System Inventory</button>
                </motion.div>
              )}

              {/* ------------------------------ The correction: ask first ------------------------------ */}
              {step === "ask" && (
                <motion.div key="ask" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Boxes size={24} color={accent} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Do you have your inventory somewhere else?</div>
                  <p style={{ fontSize: 12.5, color: "rgba(29,29,31,0.55)", lineHeight: 1.5, margin: "0 0 20px" }}>
                    A POS, warehouse system, or ERP — connect it instead of typing everything in by hand.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={() => setStep("external")} style={btnStyle(accent)}>
                      Yes, connect existing inventory
                    </button>
                    <button onClick={() => setStep("fresh")} style={secondaryBtnStyle}>
                      No, start fresh
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ------------------------------ Start fresh (original flow) ------------------------------ */}
              {step === "fresh" && (
                <motion.div key="fresh" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  {enabling ? (
                    <>
                      <div style={{ width: 56, height: 56, borderRadius: 18, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <Server size={24} color={accent} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Connecting…</div>
                      <div style={{ fontSize: 12, color: "rgba(29,29,31,0.55)" }}>Setting up your System Inventory.</div>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 56, height: 56, borderRadius: 18, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <PenLine size={24} color={accent} />
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Start fresh with System Inventory</div>
                      <p style={{ fontSize: 12.5, color: "rgba(29,29,31,0.55)", lineHeight: 1.5, margin: "0 0 16px" }}>
                        Your product catalogue — SKUs, prices, and stock counts. Enable it once, and any worker you've allowed can scan a barcode to check what's in stock.
                      </p>
                      <div style={{ display: "flex", justifyContent: "center", gap: 18, margin: "0 0 20px" }}>
                        <FeatureIcon icon={Package} label="Catalogue" accent={accent} />
                        <FeatureIcon icon={ScanLine} label="Barcode scan" accent={accent} />
                        <FeatureIcon icon={Boxes} label="Live stock" accent={accent} />
                      </div>
                      <button onClick={handleEnableFresh} style={btnStyle(accent)}>Enable System Inventory</button>
                      <button onClick={() => setStep("ask")} style={{ ...secondaryBtnStyle, marginTop: 8 }}>← Back</button>
                    </>
                  )}
                </motion.div>
              )}

              {/* ------------------------------ Connect Lager: external QR pairing ------------------------------ */}
              {step === "external" && (
                <motion.div key="external" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  {pairingError ? (
                    <>
                      <div style={{ fontSize: 13.5, color: "#c23a3a", margin: "0 0 16px" }}>{pairingError}</div>
                      <button onClick={() => setStep("external")} style={btnStyle(accent)}>Try again</button>
                    </>
                  ) : pairingStatus === "claimed" ? (
                    <>
                      <motion.div
                        initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}
                        style={{ width: 60, height: 60, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}
                      >
                        <Check size={28} color="#fff" strokeWidth={3.2} />
                      </motion.div>
                      <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 4 }}>Connected to {pairingSourceName}</div>
                      <p style={{ fontSize: 12, color: "rgba(29,29,31,0.55)", margin: "0 0 20px" }}>
                        Products will start syncing into System Inventory. You can rename or manage this source later.
                      </p>
                      <button onClick={confirmExternalConnected} style={btnStyle(accent)}>Done</button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Connect existing inventory</div>
                      <p style={{ fontSize: 12, color: "rgba(29,29,31,0.55)", margin: "0 0 14px", lineHeight: 1.5 }}>
                        Open your inventory system's Malvin Connector and scan this code.
                      </p>
                      <div style={{ background: "#fff", borderRadius: 18, padding: 16, display: "flex", justifyContent: "center", border: "1px solid rgba(0,0,0,0.06)", marginBottom: 12 }}>
                        {pairingUrl ? (
                          <BrandedQrCode value={pairingUrl} size={160} />
                        ) : (
                          <div style={{ width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <QrCode size={28} color="rgba(0,0,0,0.2)" />
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "rgba(29,29,31,0.55)", marginBottom: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#999", animation: "bvinPulse 1.4s infinite" }} />
                        Waiting for a device to scan…
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(29,29,31,0.4)", marginBottom: 16 }}>Expires in {mm}:{ss}</div>
                      <button onClick={() => setStep("ask")} style={secondaryBtnStyle}>← Back</button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const FeatureIcon: React.FC<{ icon: React.ElementType; label: string; accent: string }> = ({ icon: Icon, label, accent }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
    <div style={{ width: 34, height: 34, borderRadius: 12, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={15} color={accent} />
    </div>
    <span style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(29,29,31,0.5)" }}>{label}</span>
  </div>
);

const btnStyle = (accent: string): React.CSSProperties => ({
  width: "100%", border: "none", borderRadius: 15, padding: "13px 16px", fontSize: 13.5, fontWeight: 800,
  color: "#fff", background: accent, cursor: "pointer", boxShadow: `0 10px 24px ${accent}44`,
});

const secondaryBtnStyle: React.CSSProperties = {
  width: "100%", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 15, padding: "13px 16px", fontSize: 13.5, fontWeight: 700,
  color: "#1d1d1f", background: "transparent", cursor: "pointer",
};

export default ConnectSystemInventoryModal;