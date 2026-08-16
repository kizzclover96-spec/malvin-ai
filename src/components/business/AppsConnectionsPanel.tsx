import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Link2, Globe, Plug, X, Check, ChevronRight, Monitor, RefreshCw, Bell, Server, Link2Off } from "lucide-react";
import { doc, deleteDoc, onSnapshot, collection, addDoc } from "firebase/firestore";
import { firestore } from "../../firebase";
import { addWebsiteConnection } from "../../services/bvinConnections";
import styles from "./BVin.module.css";

/* ============================================================================
   Apps & Connections
   A small glass pill beside the top island. Opening it slides down a "what
   would you like to add?" menu; choosing Add Website or Add Service hands
   off to a proper centered glass modal (not another cramped dropdown step)
   with real enter/exit animation. Add Website's actual safety check runs
   server-side in addWebsiteConnection (malvinbackend/src/index.ts) — this
   file just drives the popup sequence around that call.

   Note on icons: lucide-react has no literal Android-logo glyph (that's a
   trademarked brand mark, not something a generic icon set ships), so
   Smartphone stands in as the generic "app" icon here.
============================================================================ */

export interface BVinConnection {
  id: string;
  type: "website" | "service";
  name: string;
  url: string;
  domain?: string;
  iconUrl?: string | null;
  addedAt?: number;
}

type FormStep = "closed" | "menu" | "addWebsite" | "addService" | "scanning" | "success" | "error";

/* -------------------------------- The pill -------------------------------- */

export const AppsConnectionsPill: React.FC<{ businessId: string; accent: string; onConnectSystem?: () => void; isPremium?: boolean; onRequirePremium?: () => void }> = ({ businessId, accent, onConnectSystem, isPremium = true, onRequirePremium }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [step, setStep] = useState<FormStep>("closed");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceUrl, setServiceUrl] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [successName, setSuccessName] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  const openForm = (which: "addWebsite" | "addService") => {
    if (!isPremium) {
      setMenuOpen(false);
      onRequirePremium?.();
      return;
    }
    setMenuOpen(false);
    setConnectError(null);
    setStep(which);
  };

  const closeModal = () => {
    setStep("closed");
    setWebsiteUrl("");
    setServiceName("");
    setServiceUrl("");
    setConnectError(null);
  };

  const connectWebsite = async () => {
    if (!websiteUrl.trim()) return;
    setStep("scanning");
    const minWait = new Promise((r) => setTimeout(r, 30000)); // matches the spec's fixed 30s "scanning" moment
    try {
      const [result] = await Promise.all([
        addWebsiteConnection({ businessId, url: websiteUrl.trim() }) as Promise<any>,
        minWait,
      ]);
      setSuccessName(result?.data?.name || websiteUrl.trim());
      setWebsiteUrl("");
      setStep("success");
    } catch (err: any) {
      await minWait; // still honor the 30s beat even on failure, so it doesn't feel like it skipped the check
      setConnectError(err?.message || "Couldn't connect that website. Double-check the address and try again.");
      setStep("error");
    }
  };

  const connectService = async () => {
    if (!serviceName.trim() || !serviceUrl.trim()) return;
    try {
      await addDoc(collection(firestore, "business", businessId, "connections"), {
        type: "service",
        name: serviceName.trim(),
        url: serviceUrl.trim(),
        addedAt: Date.now(),
      });
      setSuccessName(serviceName.trim());
      setServiceName("");
      setServiceUrl("");
      setStep("success");
    } catch (err: any) {
      setConnectError(err?.message || "Couldn't save that connection. Try again.");
      setStep("error");
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button className={styles.connectPill} onClick={() => setMenuOpen((v) => !v)}>
        {menuOpen ? (
          <>
            <Smartphone size={14} />
            <Link2 size={14} />
          </>
        ) : (
          <>
            <Smartphone size={14} />
            Apps &amp; Connections
          </>
        )}
      </button>

      {/* Small "what would you like to add" menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            style={{
              position: "absolute", top: 46, left: 0, zIndex: 50, width: 260,
              background: "rgba(255,255,255,0.96)", backdropFilter: "blur(30px) saturate(180%)", WebkitBackdropFilter: "blur(30px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.85)", borderRadius: 22, padding: 14,
              boxShadow: "0 24px 60px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.9)", color: "#1d1d1f",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>What would you like to add?</div>
            <MenuRow icon={Globe} label="Add Website" sub="Launch any website from Malvin" accent={accent} onClick={() => openForm("addWebsite")} locked={!isPremium} />
            <MenuRow icon={Plug} label="Add Service" sub="Connect an external service" accent={accent} onClick={() => openForm("addService")} locked={!isPremium} />
            {onConnectSystem && (
              <MenuRow icon={Server} label="Connect System" sub="Link your catalogue & stock" accent={accent} onClick={() => { setMenuOpen(false); onConnectSystem(); }} />
            )}
            <MenuRow icon={Smartphone} label="Add App" sub="Connect a desktop app" accent={accent} disabled comingSoon />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Centered glass modal — every step (form, scanning, success, error) lives here for one continuous animated sequence */}
      <AnimatePresence>
        {step !== "closed" && step !== "menu" && (
          <motion.div
            className={styles.connectModalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => (step === "scanning" ? undefined : closeModal())}
          >
            <motion.div
              className={styles.connectModal}
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                {step === "addWebsite" && (
                  <motion.div key="addWebsite" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                    <ModalHeader icon={Globe} title="Add Website" accent={accent} onClose={closeModal} />
                    <p style={{ fontSize: 13, color: "rgba(29,29,31,0.6)", margin: "0 0 16px" }}>Enter the website address to add — it'll appear as an app icon on your dashboard.</p>
                    <input
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      style={inputStyle}
                      autoFocus
                    />
                    <motion.button whileTap={{ scale: 0.97 }} onClick={connectWebsite} disabled={!websiteUrl.trim()} style={connectBtnStyle(accent, !websiteUrl.trim())}>
                      Connect
                    </motion.button>
                  </motion.div>
                )}

                {step === "addService" && (
                  <motion.div key="addService" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                    <ModalHeader icon={Plug} title="Add Service" accent={accent} onClose={closeModal} />
                    <p style={{ fontSize: 13, color: "rgba(29,29,31,0.6)", margin: "0 0 16px" }}>Connect an external service to Malvin.</p>
                    <input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Service name" style={inputStyle} autoFocus />
                    <input value={serviceUrl} onChange={(e) => setServiceUrl(e.target.value)} placeholder="https://service.example.com" style={{ ...inputStyle, marginTop: 10 }} />
                    <motion.button whileTap={{ scale: 0.97 }} onClick={connectService} disabled={!serviceName.trim() || !serviceUrl.trim()} style={connectBtnStyle(accent, !serviceName.trim() || !serviceUrl.trim())}>
                      Connect
                    </motion.button>
                  </motion.div>
                )}

                {step === "scanning" && (
                  <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: "center", padding: "10px 0" }}>
                    <div style={{ width: 56, height: 56, margin: "0 auto 20px", position: "relative" }}>
                      <svg width="56" height="56" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="23" fill="none" stroke="rgba(34,197,94,0.15)" strokeWidth="5" />
                        <motion.circle
                          cx="28" cy="28" r="23" fill="none" stroke="#22c55e" strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 23}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          style={{ transformOrigin: "28px 28px", strokeDashoffset: 2 * Math.PI * 23 * 0.72 }}
                        />
                      </svg>
                    </div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: "#1d1d1f", margin: 0, lineHeight: 1.5 }}>
                      Please wait a moment while Malvin scans for security and adds the website.
                    </p>
                  </motion.div>
                )}

                {step === "success" && (
                  <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: "center", padding: "6px 0" }}>
                    <motion.div
                      initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}
                      style={{ width: 64, height: 64, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}
                    >
                      <Check size={30} color="#fff" strokeWidth={3.2} />
                    </motion.div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#1d1d1f" }}>Website linked successfully</div>
                    <div style={{ fontSize: 12, color: "rgba(29,29,31,0.55)", marginTop: 4, marginBottom: 20 }}>{successName}</div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={closeModal} style={connectBtnStyle(accent, false)}>Done</motion.button>
                  </motion.div>
                )}

                {step === "error" && (
                  <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: "center", padding: "6px 0" }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(220,60,60,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                      <X size={26} color="#c23a3a" strokeWidth={3} />
                    </div>
                    <p style={{ fontSize: 13.5, color: "#c23a3a", margin: "0 0 20px", lineHeight: 1.5 }}>{connectError}</p>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={closeModal} style={connectBtnStyle(accent, false)}>Close</motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuRow: React.FC<{ icon: React.ElementType; label: string; sub: string; accent: string; onClick?: () => void; disabled?: boolean; comingSoon?: boolean; locked?: boolean }> = ({ icon: Icon, label, sub, accent, onClick, disabled, comingSoon, locked }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 8px", borderRadius: 14,
      border: "none", background: "transparent", cursor: disabled ? "default" : "pointer", textAlign: "left",
      opacity: disabled ? 0.45 : 1, marginBottom: 2,
    }}
  >
    <div style={{ width: 30, height: 30, borderRadius: 10, background: `${accent}1a`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={14} color={accent} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
        + {label}
        {comingSoon && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.45)" }}>SOON</span>}
        {locked && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "#1d1d1f", color: "#FFD700" }}>PREMIUM</span>}
      </div>
      <div style={{ fontSize: 10.5, color: "rgba(29,29,31,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
    </div>
    {!disabled && <ChevronRight size={13} opacity={0.35} />}
  </button>
);

const ModalHeader: React.FC<{ icon: React.ElementType; title: string; accent: string; onClose: () => void }> = ({ icon: Icon, title, accent, onClose }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 12, background: `${accent}1a`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={accent} />
      </div>
      <span style={{ fontSize: 16, fontWeight: 800 }}>{title}</span>
    </div>
    <button onClick={onClose} style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      <X size={13} />
    </button>
  </div>
);

const inputStyle: React.CSSProperties = { width: "100%", fontSize: 14, padding: "13px 14px", borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.03)", color: "#1d1d1f", fontFamily: "inherit" };

const connectBtnStyle = (accent: string, disabled: boolean): React.CSSProperties => ({
  width: "100%", border: "none", borderRadius: 15, padding: "13px 16px", fontSize: 13.5, fontWeight: 800,
  color: "#fff", background: accent, cursor: disabled ? "default" : "pointer", marginTop: 16,
  opacity: disabled ? 0.4 : 1, boxShadow: disabled ? "none" : `0 10px 24px ${accent}44`,
});

/* --------------------------- Connected apps strip --------------------------- */

/** Small "home screen folder" style row of connected app/website icons, sitting
    above the bento grid, left-aligned — same top row as the Live Notice card. */
export const ConnectionsStrip: React.FC<{ businessId: string; accent: string }> = ({ businessId, accent }) => {
  const [connections, setConnections] = useState<BVinConnection[]>([]);

  useEffect(() => {
    if (!businessId) return;
    const unsub = onSnapshot(collection(firestore, "business", businessId, "connections"), (snap) => {
      setConnections(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [businessId]);

  // The panel itself is a fixed size (stretches to match whatever sits
  // beside it in the top row — see B-Vin.tsx's topRow layout); only the
  // icon GRID inside adapts. One connection gets one generously-sized
  // tile; each additional one adds a column/shrinks the tile so the
  // whole set keeps fitting the same panel, the way an iOS folder
  // preview packs more app icons into the same square as you add them.
  const count = connections.length;
  const columns = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
  const tileSize = count <= 1 ? 72 : count <= 4 ? 58 : count <= 9 ? 46 : 38;

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        minHeight: 180,
        borderRadius: 28,
        background: "rgba(255,255,255,0.42)",
        backdropFilter: "blur(30px) saturate(180%)",
        WebkitBackdropFilter: "blur(30px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.75)",
        boxShadow: "0 16px 40px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        overflow: "hidden",
      }}
    >
      {connections.length === 0 ? (
        <span style={{ fontSize: 12, color: "rgba(29,29,31,0.4)", fontWeight: 600, textAlign: "center" }}>
          Connected apps &amp; websites will appear here
        </span>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, ${tileSize}px)`,
            gap: count <= 1 ? 0 : 14,
            justifyContent: "center",
            alignContent: "center",
          }}
        >
          {connections.map((c) => (
            <ConnectionIcon key={c.id} connection={c} accent={accent} businessId={businessId} size={tileSize} />
          ))}
        </div>
      )}
    </div>
  );
};

const ConnectionIcon: React.FC<{ connection: BVinConnection; accent: string; businessId: string; size: number }> = ({ connection, accent, businessId, size }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [showDisconnectPrompt, setShowDisconnectPrompt] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const initials = (connection.name || connection.domain || "?").slice(0, 2).toUpperCase();
  const iconInset = Math.round(size * 0.32); // keeps the actual image comfortably inside the tile at every size

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const handlePressStart = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setShowDisconnectPrompt(true);
    }, 500);
  };
  const handlePressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (!longPressed.current) window.open(connection.url, "_blank", "noopener,noreferrer");
  };

  const finishDisconnect = async () => {
    await deleteDoc(doc(firestore, "business", businessId, "connections", connection.id)).catch(() => {});
    setDisconnecting(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={() => pressTimer.current && clearTimeout(pressTimer.current)}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        title={connection.name}
        style={{
          width: size, height: size, borderRadius: Math.max(12, size * 0.28),
          border: "1px solid rgba(255,255,255,0.8)",
          // Solid-ish white backing (not just blur) so a transparent-background
          // favicon never shows jagged/mismatched edges against the glass
          // panel behind it — this is what "fixes the edges" of the icon.
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 6px 16px rgba(0,0,0,0.10), inset 0 1px 1px rgba(255,255,255,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {connection.type === "website" && connection.iconUrl && !imgFailed ? (
          <img
            src={connection.iconUrl}
            alt={connection.name}
            onError={() => setImgFailed(true)}
            style={{ width: size - iconInset, height: size - iconInset, objectFit: "contain", borderRadius: Math.max(6, (size - iconInset) * 0.18) }}
          />
        ) : connection.type === "service" ? (
          <Plug size={Math.round(size * 0.4)} color={accent} />
        ) : (
          <span style={{ fontSize: Math.round(size * 0.3), fontWeight: 800, color: accent }}>{initials}</span>
        )}
      </button>

      {/* Small "tap to disconnect" prompt, floating above the icon */}
      <AnimatePresence>
        {showDisconnectPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            style={{
              position: "absolute", bottom: size + 8, left: "50%", transform: "translateX(-50%)", zIndex: 30,
              background: "rgba(30,30,32,0.94)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              borderRadius: 12, padding: "4px 4px 4px 12px", display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 14px 30px rgba(0,0,0,0.28)", whiteSpace: "nowrap",
            }}
          >
            <button
              onClick={() => { setShowDisconnectPrompt(false); setDisconnecting(true); }}
              style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 9, padding: "7px 11px", fontSize: 11.5, fontWeight: 700, color: "#ff8a8a", cursor: "pointer" }}
            >
              Tap to disconnect
            </button>
            <button
              onClick={() => setShowDisconnectPrompt(false)}
              style={{ background: "none", border: "none", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
            >
              <X size={12} />
            </button>
            {/* little pointer triangle so the prompt clearly belongs to this icon */}
            <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid rgba(30,30,32,0.94)" }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* dismiss the "tap to disconnect" prompt on outside tap */}
      {showDisconnectPrompt && (
        <div onClick={() => setShowDisconnectPrompt(false)} style={{ position: "fixed", inset: 0, zIndex: 25 }} />
      )}

      <AnimatePresence>
        {disconnecting && <DisconnectSequenceModal name={connection.name} onDone={finishDisconnect} />}
      </AnimatePresence>
    </div>
  );
};

/* -------------------------- Disconnect sequence popup -------------------------- */

const DISCONNECT_STEPS = [
  { icon: Globe, label: "Website access" },
  { icon: Monitor, label: "Browser session" },
  { icon: RefreshCw, label: "Data sync" },
  { icon: Bell, label: "Notifications" },
  { icon: Server, label: "Server link" },
];

const DisconnectSequenceModal: React.FC<{ name: string; onDone: () => void }> = ({ name, onDone }) => {
  const [doneCount, setDoneCount] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (doneCount >= DISCONNECT_STEPS.length) {
      const t = setTimeout(() => setFinished(true), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDoneCount((c) => c + 1), 550);
    return () => clearTimeout(t);
  }, [doneCount]);

  useEffect(() => {
    if (!finished) return;
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,20,22,0.4)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        style={{
          width: "100%", maxWidth: 340, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(34px) saturate(180%)", WebkitBackdropFilter: "blur(34px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.85)", borderRadius: 28, padding: 28, boxShadow: "0 40px 90px rgba(0,0,0,0.24)", color: "#1d1d1f", textAlign: "center",
        }}
      >
        <AnimatePresence mode="wait">
          {!finished ? (
            <motion.div key="steps" exit={{ opacity: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>Disconnecting</div>
              <div style={{ fontSize: 12, color: "rgba(29,29,31,0.55)", marginBottom: 20 }}>{name}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {DISCONNECT_STEPS.map((step, i) => {
                  const isDone = i < doneCount;
                  const isActive = i === doneCount;
                  return (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: isDone || isActive ? 1 : 0.35, x: 0 }}
                      style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: 10, background: isDone ? "rgba(220,60,60,0.1)" : "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <step.icon size={14} color={isDone ? "#c23a3a" : "#8a8f98"} />
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, color: isDone ? "#1d1d1f" : "rgba(29,29,31,0.5)" }}>{step.label}</span>
                      {isDone ? (
                        <Link2Off size={14} color="#c23a3a" />
                      ) : isActive ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.12)", borderTopColor: "#c23a3a" }} />
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}
                style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}
              >
                <Link2Off size={26} color="#1d1d1f" />
              </motion.div>
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>Disconnected</div>
              <div style={{ fontSize: 12, color: "rgba(29,29,31,0.55)", marginTop: 4 }}>{name}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};