import React, { useEffect, useState } from "react";
import { ref, onValue, update, push, serverTimestamp } from "firebase/database";
import { auth, db } from "../../firebase";

interface StatusDoc {
  appLocked: boolean;
  storesLocked: boolean;
  businessLocked: boolean;
  customerHubLocked: boolean;
  message?: string;
  updatedAt?: number;
  updatedByEmail?: string;
}

const DEFAULTS: StatusDoc = {
  appLocked: false,
  storesLocked: false,
  businessLocked: false,
  customerHubLocked: false,
  message: "",
};

interface SwitchDef {
  key: keyof Pick<StatusDoc, "appLocked" | "storesLocked" | "businessLocked" | "customerHubLocked">;
  label: string;
  description: string;
  /** appLocked is the big red one — everything else is a subset of it. */
  danger: "critical" | "high";
}

const SWITCHES: SwitchDef[] = [
  {
    key: "appLocked",
    label: "ENTIRE APP",
    description:
      "Blocks everyone, everywhere — every screen, every store, every dashboard. Logs out every currently signed-in user immediately, on every open tab/device, and blocks new sign-ins while it's on. Your own admin account is exempt so you can always get back in to turn it off.",
    danger: "critical",
  },
  {
    key: "storesLocked",
    label: "ALL STORES (customer ordering)",
    description:
      "Blocks every public store page reached by QR/link — food, salon, hotel, mechanic, service. Customers hit the restricted screen instead of the storefront. Business dashboards and the customer hub are unaffected.",
    danger: "high",
  },
  {
    key: "businessLocked",
    label: "BUSINESS SECTION",
    description:
      "Blocks every business-owner and worker dashboard (management tools, orders, records, device pairing, payouts). Customers browsing the app or an individual store are unaffected.",
    danger: "high",
  },
  {
    key: "customerHubLocked",
    label: "CUSTOMER HUB",
    description:
      "Blocks the general customer browsing/marketplace screen. Direct store links (QR scans) and business dashboards are unaffected.",
    danger: "high",
  },
];

export default function AdminKillSwitch() {
  const [status, setStatus] = useState<StatusDoc>(DEFAULTS);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);

  useEffect(() => {
    const statusRef = ref(db, "system/status");
    const unsub = onValue(statusRef, (snap) => {
      const data = snap.val();
      const merged = { ...DEFAULTS, ...(data || {}) };
      setStatus(merged);
      setMessage(merged.message || "");
    });
    return () => unsub();
  }, []);

  const writeStatus = async (patch: Partial<StatusDoc>) => {
    await update(ref(db, "system/status"), {
      ...patch,
      updatedAt: serverTimestamp(),
      updatedByEmail: auth.currentUser?.email || "unknown",
    });
    await push(ref(db, "admin/audit_log"), {
      adminEmail: auth.currentUser?.email || "unknown",
      action: "KILL_SWITCH_CHANGE",
      targetUid: "system",
      details: JSON.stringify(patch),
      timestamp: serverTimestamp(),
    });
  };

  const toggle = async (def: SwitchDef) => {
    const nextValue = !status[def.key];
    // Turning something ON is the dangerous direction — require a second
    // tap before it actually goes live. Turning things back OFF is always
    // one tap, on purpose: you never want friction on the "let people back
    // in" path.
    if (nextValue && confirmingKey !== def.key) {
      setConfirmingKey(def.key);
      return;
    }
    setConfirmingKey(null);
    setSaving(def.key);
    try {
      await writeStatus({ [def.key]: nextValue } as Partial<StatusDoc>);
    } catch (err) {
      console.error("Kill switch update failed:", err);
      alert("Failed to update — check your connection and try again.");
    } finally {
      setSaving(null);
    }
  };

  const saveMessage = async () => {
    setSaving("message");
    try {
      await writeStatus({ message });
    } catch (err) {
      console.error("Failed to save message:", err);
      alert("Failed to save the message.");
    } finally {
      setSaving(null);
    }
  };

  const anyActive = status.appLocked || status.storesLocked || status.businessLocked || status.customerHubLocked;

  return (
    <div style={{ padding: "24px", maxWidth: 760, margin: "0 auto", color: "#fff", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <h2 style={{ fontSize: "1.2rem", letterSpacing: "2px", margin: 0 }}>KILL SWITCH</h2>
        <span
          style={{
            fontSize: "0.7rem",
            padding: "3px 10px",
            borderRadius: 20,
            fontWeight: 700,
            background: anyActive ? "#ff4d4d" : "#1f7a3d",
            color: "#fff",
          }}
        >
          {anyActive ? "RESTRICTION ACTIVE" : "ALL SYSTEMS NORMAL"}
        </span>
      </div>
      <p style={{ opacity: 0.6, fontSize: "0.8rem", marginBottom: 24 }}>
        These take effect immediately for every open session — nothing to deploy, nothing for a user to bypass from the app.
      </p>

      {SWITCHES.map((def) => {
        const active = !!status[def.key];
        const isConfirming = confirmingKey === def.key;
        return (
          <div
            key={def.key}
            style={{
              border: `1px solid ${active ? "#ff4d4d" : "#2a2a2a"}`,
              borderRadius: 12,
              padding: "16px 18px",
              marginBottom: 14,
              background: active ? "rgba(255,77,77,0.08)" : "transparent",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", letterSpacing: "1px" }}>{def.label}</div>
                <div style={{ opacity: 0.6, fontSize: "0.75rem", marginTop: 4, lineHeight: 1.4 }}>{def.description}</div>
              </div>
              <button
                onClick={() => toggle(def)}
                disabled={saving === def.key}
                style={{
                  flexShrink: 0,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: `1px solid ${active ? "#ff4d4d" : "#333"}`,
                  background: active ? "#ff4d4d" : isConfirming ? "#C5FF41" : "transparent",
                  color: active ? "#fff" : isConfirming ? "#000" : "#fff",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  cursor: saving === def.key ? "default" : "pointer",
                  minWidth: 120,
                }}
              >
                {saving === def.key
                  ? "SAVING…"
                  : active
                  ? "TURN OFF"
                  : isConfirming
                  ? "TAP AGAIN TO CONFIRM"
                  : "TURN ON"}
              </button>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 28 }}>
        <label style={{ fontSize: "0.75rem", opacity: 0.6, display: "block", marginBottom: 6 }}>
          Custom message shown on the restricted screen (optional — leave blank for the default wording)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Access to this feature has been restricted."
          rows={2}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid #333",
            borderRadius: 8,
            padding: "10px 12px",
            color: "#fff",
            fontSize: "0.85rem",
            resize: "vertical",
          }}
        />
        <button
          onClick={saveMessage}
          disabled={saving === "message"}
          style={{
            marginTop: 8,
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #C5FF41",
            background: "transparent",
            color: "#C5FF41",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {saving === "message" ? "SAVING…" : "SAVE MESSAGE"}
        </button>
      </div>

      {status.updatedAt && (
        <p style={{ opacity: 0.4, fontSize: "0.7rem", marginTop: 24 }}>
          Last change by {status.updatedByEmail || "unknown"} · {new Date(status.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
