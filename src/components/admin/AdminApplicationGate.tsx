import React, { useState } from "react";
import { ref, update, push, serverTimestamp } from "firebase/database";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { ShieldCheck, ShieldAlert, Clock3, LogOut } from "lucide-react";
import { ADMIN_CAPABILITIES, AdminRecord } from "../../hooks/useAdminRole";

const tokens = {
  bg: "#0A0C0E",
  surface: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)",
  text: "#EDEFF1",
  textDim: "#8B939B",
  accent: "#C5FF41",
  danger: "#FF5C5C",
  warn: "#FFB020",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  sans: "Inter, sans-serif",
};

interface Props {
  record: AdminRecord;
}


// Shown in place of the normal app whenever the signed-in user's email has
// an admin record that isn't yet `active`. Covers the three non-admin
// states an invited person can be in: fill out the application, wait for
// review, or see that they were declined.
export const AdminApplicationGate: React.FC<Props> = ({ record }) => {
  if (record.status === "invited") return <ApplicationForm record={record} />;
  if (record.status === "pending_review") return <PendingScreen record={record} />;
  if (record.status === "rejected") return <RejectedScreen />;
  if (record.status === "revoked") return <RejectedScreen revoked />;
  return null;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: tokens.bg,
        color: tokens.text,
        fontFamily: tokens.sans,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>{children}</div>
    </div>
  );
}

function ApplicationForm({ record }: Props) {
  const [fullName, setFullName] = useState(auth.currentUser?.displayName || "");
  const [reason, setReason] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [experience, setExperience] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const requested = ADMIN_CAPABILITIES.filter((c) => record.capabilities?.[c.key]);

  const submit = async () => {
    if (!fullName.trim() || !reason.trim() || !responsibilities.trim() || !agreed) {
      setError("Please fill in every field and confirm you understand the admin policy.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await update(ref(db, `admin/admins/${record.id}`), {
        status: "pending_review",
        uid: auth.currentUser?.uid || null,
        application: {
          fullName: fullName.trim(),
          reason: reason.trim(),
          responsibilities: responsibilities.trim(),
          experience: experience.trim(),
          agreedToPolicy: true,
          submittedAt: Date.now(),
        },
      });
      await push(ref(db, "admin/audit_log"), {
        adminEmail: record.email,
        action: "ADMIN_APPLICATION_SUBMITTED",
        targetUid: auth.currentUser?.uid || record.email,
        details: `${fullName.trim()} submitted an administrator application.`,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      setError("Something went wrong submitting your application. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <ShieldCheck size={34} color={tokens.accent} />
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "12px 0 4px" }}>
          You've been invited to become a Malvin administrator
        </h1>
        <p style={{ fontSize: 13, color: tokens.textDim, margin: 0 }}>
          Tell us a bit about yourself before we grant access. Your invite was sent to{" "}
          <strong style={{ color: tokens.text }}>{record.email}</strong>.
        </p>
      </div>

      {requested.length > 0 && (
        <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
          <div style={{ fontSize: 10, letterSpacing: 1, opacity: 0.5, marginBottom: 8, fontFamily: tokens.mono }}>REQUESTED PERMISSIONS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {requested.map((c) => (
              <span key={c.key} style={{ fontSize: 10, fontFamily: tokens.mono, padding: "4px 8px", borderRadius: 6, background: "rgba(197,255,65,0.1)", color: tokens.accent }}>
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Full name">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" style={inputStyle} />
        </Field>
        <Field label="Why are you requesting administrator access?">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <Field label="Which responsibilities will you handle?">
          <textarea value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <Field label="Previous experience (optional)">
          <textarea value={experience} onChange={(e) => setExperience(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: tokens.textDim, cursor: "pointer" }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
          I understand that administrator activity may be logged and reviewed.
        </label>

        {error && <div style={{ fontSize: 12, color: tokens.danger }}>{error}</div>}

        <button onClick={submit} disabled={submitting} style={primaryBtn}>
          {submitting ? "Submitting…" : "Submit Application"}
        </button>
        <button onClick={() => signOut(auth)} style={ghostBtn}>
          <LogOut size={13} style={{ marginRight: 6 }} /> Sign out
        </button>
      </div>
    </Shell>
  );
}

function PendingScreen({ record }: Props) {
  return (
    <Shell>
      <div style={{ textAlign: "center" }}>
        <Clock3 size={34} color={tokens.warn} />
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "12px 0 4px" }}>🟡 Application pending review</h1>
        <p style={{ fontSize: 13, color: tokens.textDim, marginBottom: 20 }}>
          Thanks{record.application?.fullName ? `, ${record.application.fullName}` : ""} — an existing admin
          needs to approve your request before you can access the Admin Center. You'll see the console here
          automatically once you're approved.
        </p>
        <button onClick={() => signOut(auth)} style={ghostBtn}>
          <LogOut size={13} style={{ marginRight: 6 }} /> Sign out
        </button>
      </div>
    </Shell>
  );
}

function RejectedScreen({ revoked }: { revoked?: boolean }) {
  return (
    <Shell>
      <div style={{ textAlign: "center" }}>
        <ShieldAlert size={34} color={tokens.danger} />
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "12px 0 4px" }}>
          {revoked ? "Your admin access was revoked" : "Your admin application wasn't approved"}
        </h1>
        <p style={{ fontSize: 13, color: tokens.textDim, marginBottom: 20 }}>
          If you think this is a mistake, reach out to the team that invited you.
        </p>
        <button onClick={() => signOut(auth)} style={ghostBtn}>
          <LogOut size={13} style={{ marginRight: 6 }} /> Sign out
        </button>
      </div>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontFamily: tokens.mono, letterSpacing: 0.5, opacity: 0.6, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#000",
  border: `1px solid ${tokens.border}`,
  padding: "10px 12px",
  borderRadius: 8,
  color: tokens.text,
  fontSize: 13,
  boxSizing: "border-box",
  fontFamily: tokens.sans,
};

const primaryBtn: React.CSSProperties = {
  background: tokens.accent,
  color: "#000",
  border: "none",
  padding: 13,
  borderRadius: 8,
  fontWeight: 800,
  fontSize: 12,
  fontFamily: tokens.mono,
  letterSpacing: 0.5,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: tokens.textDim,
  border: `1px solid ${tokens.border}`,
  padding: 12,
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 11,
  fontFamily: tokens.mono,
  letterSpacing: 0.5,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default AdminApplicationGate;
