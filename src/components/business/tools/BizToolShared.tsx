import React, { useEffect, useState } from "react";
import { firestore as db, auth } from "../../../firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { X, ChevronRight } from "lucide-react";

/** Every biz tool screen shares one Firestore root: businesses/{businessId}/{toolCollection}/{docId} */
export function useBizCollection<T extends { id: string }>(businessId: string, collectionName: string, order: "asc" | "desc" = "desc") {
  const [items, setItems] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    const q = query(collection(db, "business", businessId, collectionName), orderBy("createdAt", order));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: T[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setItems(list);
        setLoaded(true);
      },
      () => setLoaded(true)
    );
    return () => unsub();
  }, [businessId, collectionName, order]);

  const add = async (data: Record<string, any>) => {
    await addDoc(collection(db, "business", businessId, collectionName), {
      ...data,
      createdBy: auth.currentUser?.uid || null,
      createdAt: serverTimestamp(),
    });
  };

  const update = async (id: string, data: Record<string, any>) => {
    await updateDoc(doc(db, "business", businessId, collectionName, id), data);
  };

  const remove = async (id: string) => {
    await deleteDoc(doc(db, "business", businessId, collectionName, id));
  };

  return { items, loaded, add, update, remove };
}

/* ============================================================================
   THEME — white surfaces, blue accent. Every tool screen shares this palette
   so nothing reads as a bolted-on dark/green module anymore.
============================================================================ */

export const bizToolTint = "#2563EB";       // primary blue
export const bizToolTintSoft = "#EFF4FF";   // pale blue fill
export const bizToolTintBorder = "#DBE6FF"; // pale blue border
export const bizTextPrimary = "#0F172A";
export const bizTextMuted = "#64748B";

export const BizToolShell: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, onClose, headerAction, children }) => (
  <div style={{ minHeight: "100vh", background: "#F7F9FC", color: bizTextPrimary, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
    <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid #E7ECF3" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: bizTextPrimary }}>{title}</h1>
        {subtitle && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: bizTextMuted }}>{subtitle}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {headerAction}
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: bizToolTintSoft, color: bizToolTint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={16} />
        </button>
      </div>
    </div>
    <div style={{ padding: "18px 20px 60px" }}>{children}</div>
  </div>
);

export const bizInputStyle: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  border: "1px solid #DCE3ED",
  borderRadius: 12,
  padding: "11px 13px",
  color: bizTextPrimary,
  fontSize: 13.5,
  boxSizing: "border-box",
  outline: "none",
};

export const bizBtnStyle: React.CSSProperties = {
  background: bizToolTint,
  border: "none",
  color: "#fff",
  padding: "11px 18px",
  borderRadius: 12,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

export const bizBtnGhostStyle: React.CSSProperties = {
  background: bizToolTintSoft,
  border: `1px solid ${bizToolTintBorder}`,
  color: bizToolTint,
  padding: "11px 18px",
  borderRadius: 12,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

export const BizRow: React.FC<{ children: React.ReactNode; onDelete?: () => void }> = ({ children, onDelete }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #E7ECF3", borderRadius: 14, padding: "14px 16px", boxShadow: "0 1px 3px rgba(15,23,42,0.03)" }}>
    <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    {onDelete && (
      <button onClick={onDelete} style={{ background: "none", border: "none", color: "#B0B9C6", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>
        Delete
      </button>
    )}
  </div>
);

export const BizEmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ textAlign: "center", padding: "50px 20px", color: bizTextMuted, fontSize: 13 }}>{label}</div>
);

export const BizFormCard: React.FC<{ children: React.ReactNode; onCancel?: () => void }> = ({ children, onCancel }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10, background: bizToolTintSoft, border: `1px solid ${bizToolTintBorder}`, borderRadius: 16, padding: 16, marginBottom: 20, position: "relative" }}>
    {onCancel && (
      <button onClick={onCancel} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: bizTextMuted, cursor: "pointer" }}>
        <X size={15} />
      </button>
    )}
    {children}
  </div>
);

/* ============================================================================
   ICON-ACTION HOME SCREEN
   The pattern every merged tool uses: land on a row of clear action buttons
   ("New shift", "New form", "View sheets"...) instead of an always-open
   input form. Tapping one reveals just that form/view.
============================================================================ */

export const BizActionButton: React.FC<{
  icon: React.ElementType;
  label: string;
  sub?: string;
  onClick: () => void;
  accent?: string;
}> = ({ icon: Icon, label, sub, onClick, accent = bizToolTint }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
      background: "#fff", border: "1px solid #E7ECF3", borderRadius: 16, padding: "14px 16px",
      cursor: "pointer", boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
    }}
  >
    <div style={{ width: 38, height: 38, borderRadius: 12, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={17} color={accent} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: bizTextPrimary }}>{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: bizTextMuted, marginTop: 1 }}>{sub}</div>}
    </div>
    <ChevronRight size={16} color="#C3CCDA" />
  </button>
);

export const BizActionGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>{children}</div>
);

/** Small pill-style tab switcher used by merged tools (e.g. Workspace: Schedule / Forms / Sheets). */
export const BizTabSwitch: React.FC<{ tabs: { key: string; label: string; icon: React.ElementType }[]; active: string; onChange: (k: string) => void }> = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 6, background: "#EEF2F8", borderRadius: 14, padding: 5, marginBottom: 18 }}>
    {tabs.map((t) => {
      const isActive = active === t.key;
      return (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "9px 10px", borderRadius: 10, border: "none", cursor: "pointer",
            background: isActive ? "#fff" : "transparent",
            color: isActive ? bizToolTint : bizTextMuted,
            fontWeight: 700, fontSize: 12.5,
            boxShadow: isActive ? "0 2px 8px rgba(15,23,42,0.08)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <t.icon size={13} /> {t.label}
        </button>
      );
    })}
  </div>
);