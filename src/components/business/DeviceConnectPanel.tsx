import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue } from "firebase/database";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { Html5Qrcode } from "html5-qrcode";
import { db as rtdb, auth, firestore } from "../../firebase";
import {
  createDevicePairingSession, revokeDevicePairingSession,
  createPairRelaySession, revokePairRelaySession, parsePairingUrl,
  claimDevicePairing, markDevicePairingConnected,
} from "../../utils/devicePairing";
import BrandedQrCode from "./BrandedQrCode";
import PairingDebugPanel from "./PairingDebugPanel";
import { Smartphone, Camera, ChevronLeft, Check, Trash2 } from "lucide-react";

/* ============================================================================
   DeviceConnectPanel — the Settings "Connect Account" tab.

   Two entry points, both converging on the same pairing session underneath
   (devicePairing/{hostUid}/{token} — see utils/devicePairing.ts):

   - "Add an existing account to this one": THIS device HOSTS — generates
     and displays the QR, waits to be scanned.
   - "Add this account to an existing account": THIS device is the GUEST —
     it needs to scan a QR shown on the OTHER (existing) account's Settings
     screen. If this device's camera isn't good enough, a phone can be
     used as a relay camera instead (same pattern as B-Vin's existing
     scanner-pairing feature).
============================================================================ */

type Mode = "root" | "host" | "guestChoice" | "guestScanning" | "guestRelay" | "connecting" | "tip" | "success";

const CONNECTING_MS = 4000;
const TIP_MS = 6000;

const DeviceConnectPanel: React.FC<{ ownerUid: string; ownerEmail?: string | null }> = ({ ownerUid, ownerEmail }) => {
  const [mode, setMode] = useState<Mode>("root");
  const [connectedDevices, setConnectedDevices] = useState<{ id: string; guestLabel: string; connectedAt: number }[]>([]);
  const [confirmDisconnect, setConfirmDisconnect] = useState<"all" | string | null>(null);

  useEffect(() => {
    if (!ownerUid) return;
    const unsub = onSnapshot(collection(firestore, "users", ownerUid, "connectedDevices"), (snap) => {
      setConnectedDevices(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [ownerUid]);

  const disconnectDevice = async (id: string) => {
    await deleteDoc(doc(firestore, "users", ownerUid, "connectedDevices", id)).catch(() => {});
    setConfirmDisconnect(null);
  };
  const disconnectAll = async () => {
    await Promise.all(connectedDevices.map((d) => deleteDoc(doc(firestore, "users", ownerUid, "connectedDevices", d.id)).catch(() => {})));
    setConfirmDisconnect(null);
  };

  // host state
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [hostUrl, setHostUrl] = useState<string | null>(null);

  // guest state
  const [relayId, setRelayId] = useState<string | null>(null);
  const [relayUrl, setRelayUrl] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = "device-connect-guest-scanner";
  const guestClaimedRef = useRef(false);

  const cleanupHost = () => {
    if (hostToken && ownerUid) revokeDevicePairingSession(ownerUid, hostToken);
    setHostToken(null); setHostUrl(null);
  };
  const cleanupGuest = () => {
    if (relayId) revokePairRelaySession(relayId);
    setRelayId(null); setRelayUrl(null);
    scannerRef.current?.stop().catch(() => {});
  };

  useEffect(() => () => { cleanupHost(); cleanupGuest(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startHost = async () => {
    const label = ownerEmail || "This account";
    const { token, url } = await createDevicePairingSession(ownerUid, label);
    setHostToken(token); setHostUrl(url);
    setMode("host");
  };

  // Host listens for a guest scanning its QR.
  useEffect(() => {
    if (mode !== "host" || !hostToken) return;
    const unsub = onValue(
      ref(rtdb, `devicePairing/${ownerUid}/${hostToken}`),
      (snap) => {
        const val = snap.val();
        if (val?.status === "scanned") {
          setMode("connecting");
          setTimeout(() => setMode("tip"), CONNECTING_MS);
          setTimeout(() => setMode("success"), CONNECTING_MS + TIP_MS);
          setTimeout(() => {
            markDevicePairingConnected(ownerUid, hostToken).catch((e) => setScanError(e?.message || "Couldn't mark session connected."));
            // Host owns this write (guest can't write into the host's own
            // Firestore user doc) — this is what powers the disconnect list.
            setDoc(doc(firestore, "users", ownerUid, "connectedDevices", hostToken), {
              guestUid: val.guestUid || null,
              guestLabel: val.guestLabel || "Connected device",
              connectedAt: Date.now(),
            }).catch((e) => setScanError(e?.message || "Couldn't save the connected device."));
          }, CONNECTING_MS);
        }
      },
      (err) => setScanError(err?.message || "Lost connection to the pairing session.")
    );
    return () => unsub();
  }, [mode, hostToken, ownerUid]);

  const finishGuestClaim = async (decoded: string) => {
    if (guestClaimedRef.current) return;
    const parsed = parsePairingUrl(decoded);
    if (!parsed) { setScanError("That QR code doesn't look like a Malvin connect code."); return; }
    guestClaimedRef.current = true;
    try {
      await claimDevicePairing(parsed.hostUid, parsed.token, ownerUid, ownerEmail || "Connected device");
      setMode("connecting");
      setTimeout(() => setMode("tip"), CONNECTING_MS);
      setTimeout(() => setMode("success"), CONNECTING_MS + TIP_MS);
    } catch (err: any) {
      setScanError(err?.message || "Couldn't connect. Check your connection and try again.");
      guestClaimedRef.current = false;
    }
  };

  const startGuestScanning = async () => {
    setMode("guestScanning");
    setScanError(null);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          async (decodedText) => {
            await scanner.stop().catch(() => {});
            finishGuestClaim(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        setScanError(err?.message || "Couldn't access the camera. Check camera permissions and try again.");
      }
    }, 50);
  };

  const startGuestRelay = async () => {
    const { relayId: rid, url } = await createPairRelaySession();
    setRelayId(rid); setRelayUrl(url);
    setMode("guestRelay");
  };

  // Guest (relay mode) watches for the phone to finish scanning and relay the result.
  useEffect(() => {
    if (mode !== "guestRelay" || !relayId) return;
    const unsub = onValue(ref(rtdb, `pairRelay/${relayId}`), (snap) => {
      const val = snap.val();
      if (val?.status === "done" && val.scannedValue) {
        finishGuestClaim(val.scannedValue);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, relayId]);

  const reset = () => {
    cleanupHost(); cleanupGuest();
    guestClaimedRef.current = false;
    setScanError(null);
    setMode("root");
  };

  const Back: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontSize: 13, marginBottom: 18, padding: 0 }}>
      <ChevronLeft size={14} /> Back
    </button>
  );

  return (
    <section>
      <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px" }}>Connect Another Malvin Account</h1>
      <h3 style={{ marginTop: 0, fontSize: "14px", color: "#2563EB", letterSpacing: "1px", fontWeight: 800 }}>
        ACCOUNT LINKING
      </h3>

      {mode === "root" && (
        <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
          <button
            onClick={startHost}
            style={{ flex: 1, minWidth: 220, textAlign: "left", background: "#fff", border: "1px solid #E7ECF3", borderRadius: 18, padding: "22px", cursor: "pointer" }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>📥</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Add an existing account to this one</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>Show a QR code — scan it with the other account to connect.</div>
          </button>
          <button
            onClick={() => setMode("guestChoice")}
            style={{ flex: 1, minWidth: 220, textAlign: "left", background: "#fff", border: "1px solid #E7ECF3", borderRadius: 18, padding: "22px", cursor: "pointer" }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>📤</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Add this account to an existing account</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>Scan the QR code shown on the other account's screen.</div>
          </button>
        </div>
      )}

      {mode === "host" && hostUrl && (
        <div style={{ marginTop: 10, maxWidth: 340 }}>
          <Back onClick={reset} />
          <div style={{ background: "#fff", border: "1px solid #E7ECF3", borderRadius: 20, padding: 26, textAlign: "center" }}>
            <BrandedQrCode value={hostUrl} size={200} />
            <p style={{ fontSize: 13.5, fontWeight: 700, marginTop: 16 }}>Scan with the other account to connect</p>
            <p style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>Open Malvin on the other device and scan this from Settings, or point any camera at it.</p>
          </div>
        </div>
      )}

      {mode === "guestChoice" && (
        <div style={{ marginTop: 10, maxWidth: 380 }}>
          <Back onClick={reset} />
          <div style={{ background: "#fff", border: "1px solid #E7ECF3", borderRadius: 18, padding: 22 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: "#EFF4FF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Camera size={20} color="#2563EB" />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>How's this device's camera?</h3>
            <p style={{ fontSize: 12.5, color: "#64748B", lineHeight: 1.6, marginBottom: 18 }}>
              If this device doesn't have a good camera, scan the code below with your phone to use it as an external camera instead — then scan the second device with your phone. If this device already has a good camera, just continue and scan directly.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={startGuestScanning} style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 12, padding: "12px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                Continue — open camera
              </button>
              <button onClick={startGuestRelay} style={{ background: "#EFF4FF", color: "#2563EB", border: "1px solid #DBE6FF", borderRadius: 12, padding: "12px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                Use my phone as an external camera
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "guestScanning" && (
        <div style={{ marginTop: 10, maxWidth: 340 }}>
          <Back onClick={reset} />
          <div id={elementId} style={{ width: "100%", aspectRatio: "1", borderRadius: 18, overflow: "hidden", background: "#000", marginBottom: 12 }} />
          {scanError && <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 10 }}>{scanError}</p>}
          <p style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}>Point at the other account's QR code…</p>
        </div>
      )}

      {mode === "guestRelay" && relayUrl && (
        <div style={{ marginTop: 10, maxWidth: 340 }}>
          <Back onClick={reset} />
          <div style={{ background: "#fff", border: "1px solid #E7ECF3", borderRadius: 20, padding: 26, textAlign: "center" }}>
            <BrandedQrCode value={relayUrl} size={180} />
            <p style={{ fontSize: 13.5, fontWeight: 700, marginTop: 16 }}>Scan this with your phone</p>
            <p style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>Your phone will open its camera — point it at the other account's QR code, and this screen will pick it up automatically.</p>
          </div>
        </div>
      )}

      {(mode === "connecting" || mode === "tip") && (
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <motion.div
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{ width: 54, height: 54, borderRadius: "50%", border: "3px solid #DBE6FF", borderTopColor: "#2563EB", marginBottom: 18 }}
          />
          <p style={{ fontSize: 14, fontWeight: 700 }}>Connecting…</p>
          <AnimatePresence>
            {mode === "tip" && (
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ fontSize: 12.5, color: "#64748B", marginTop: 14, maxWidth: 260 }}>
                You can always connect more devices in Settings.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {mode === "success" && (
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}
            style={{ width: 68, height: 68, borderRadius: "50%", background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}
          >
            <Check size={30} color="#fff" strokeWidth={3.5} />
          </motion.div>
          <p style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Connected</p>
          <button onClick={reset} style={{ marginTop: 10, background: "none", border: "1px solid #DBE6FF", color: "#2563EB", borderRadius: 12, padding: "10px 18px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            Done
          </button>
        </div>
      )}

      {mode === "root" && connectedDevices.length > 0 && (
        <div style={{ marginTop: 30, maxWidth: 460 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>Connected Devices</h4>
            <button onClick={() => setConfirmDisconnect("all")} style={{ background: "none", border: "none", color: "#EF4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Disconnect all
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {connectedDevices.map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #E7ECF3", borderRadius: 12, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{d.guestLabel}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>Connected {new Date(d.connectedAt).toLocaleDateString()}</div>
                </div>
                <button onClick={() => setConfirmDisconnect(d.id)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                  <Trash2 size={13} /> Disconnect
                </button>
              </div>
            ))}
          </div>

          {confirmDisconnect && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }} onClick={() => setConfirmDisconnect(null)}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 22, maxWidth: 320, width: "100%", textAlign: "center" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 800 }}>
                  {confirmDisconnect === "all" ? "Disconnect all devices?" : "Disconnect this device?"}
                </h4>
                <p style={{ fontSize: 12.5, color: "#64748B", marginBottom: 18 }}>They'll lose access immediately. You can reconnect anytime.</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfirmDisconnect(null)} style={{ flex: 1, border: "1px solid #E7ECF3", background: "none", borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                  <button onClick={() => (confirmDisconnect === "all" ? disconnectAll() : disconnectDevice(confirmDisconnect))} style={{ flex: 1, border: "none", background: "#EF4444", color: "#fff", borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Disconnect</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <PairingDebugPanel
        role={mode === "guestChoice" || mode === "guestScanning" || mode === "guestRelay" ? "Secondary" : "Primary"}
        paired={mode === "connecting" || mode === "tip" || mode === "success" || connectedDevices.length > 0}
        lastEvent={`MODE_${mode.toUpperCase()}`}
        error={scanError}
      />
    </section>
  );
};

export default DeviceConnectPanel;