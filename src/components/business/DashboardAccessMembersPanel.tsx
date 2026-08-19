import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore as fsdb, auth } from "../../firebase";
import { DASHBOARD_ACCESS_AREAS, useWorkerPermissions } from "../../utils/workerPermissions";
import { useActivityLog, usePresence } from "../../utils/activityLog";
import { WorkerAccessModal, type WorkerRow } from "./WorkerPermissionsPanel";
import { ChevronLeft, X } from "lucide-react";

/* ============================================================================
   Settings → Dashboard Access Members. Shows only members who've actually
   been granted dashboardAccess (filtering happens per-card, since each
   member's grant lives in its own RTDB node — there's no single query that
   can answer "which members have dashboardAccess" without reading each one).
============================================================================ */

const ActivityModal: React.FC<{ ownerUid: string; worker: WorkerRow; onClose: () => void }> = ({ ownerUid, worker, onClose }) => {
  const entries = useActivityLog(ownerUid, worker.uid, 60);

  const grouped = entries.reduce<Record<string, typeof entries>>((acc, e) => {
    const day = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Recent";
    (acc[day] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, maxHeight: "80vh", overflowY: "auto", background: "#fff", border: "1px solid #E7ECF3", borderRadius: 20, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0F172A" }}>{worker.email} — Activity</h2>
          <button onClick={onClose} style={{ background: "#EFF4FF", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#2563EB", cursor: "pointer" }}><X size={13} /></button>
        </div>
        {entries.length === 0 && <p style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 20 }}>No activity recorded yet.</p>}
        {Object.entries(grouped).map(([day, items]) => (
          <div key={day} style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#2563EB", letterSpacing: 0.5, marginBottom: 8 }}>{day.toUpperCase()}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((e) => (
                <div key={e.id} style={{ display: "flex", gap: 10 }}>
                  <div style={{ fontSize: 11, color: "#94A3B8", width: 44, flexShrink: 0, paddingTop: 1 }}>
                    {e.createdAt?.toDate ? e.createdAt.toDate().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : ""}
                  </div>
                  <div style={{ fontSize: 13, color: "#0F172A" }}>
                    {e.action}{e.detail ? <span style={{ fontWeight: 700 }}> "{e.detail}"</span> : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MemberCard: React.FC<{ ownerUid: string; worker: WorkerRow; onVisibilityChange: (uid: string, visible: boolean) => void }> = ({ ownerUid, worker, onVisibilityChange }) => {
  const { permissions, loaded, hasDashboardAccess } = useWorkerPermissions(ownerUid, worker.uid, false);
  const { lastActiveLabel, isActiveNow } = usePresence(ownerUid, worker.uid);
  const [manageOpen, setManageOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  useEffect(() => {
    if (loaded) onVisibilityChange(worker.uid, hasDashboardAccess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, hasDashboardAccess]);

  if (!loaded || !hasDashboardAccess) return null;

  const initials = worker.email.slice(0, 2).toUpperCase();

  return (
    <div style={{ background: "#fff", border: "1px solid #E7ECF3", borderRadius: 16, padding: 18, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EFF4FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{worker.email}</div>
          <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 700 }}>Dashboard Access: Enabled</div>
        </div>
        {isActiveNow && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A", flexShrink: 0 }} title="Active now" />}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {(() => {
          const granted = DASHBOARD_ACCESS_AREAS.filter((area) => !!permissions[area.id]);
          if (granted.length === 0) {
            return <span style={{ fontSize: 10.5, color: "#94A3B8" }}>No tools granted yet</span>;
          }
          const shown = granted.slice(0, 6);
          const overflow = granted.length - shown.length;
          return (
            <>
              {shown.map((area) => (
                <span key={area.id} style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 8px", borderRadius: 999, background: "#EFF4FF", color: "#2563EB", display: "flex", alignItems: "center", gap: 4 }}>
                  {area.label} ✓
                </span>
              ))}
              {overflow > 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 8px", borderRadius: 999, background: "#F1F5F9", color: "#64748B" }}>
                  +{overflow} more
                </span>
              )}
            </>
          );
        })()}
      </div>

      <div style={{ fontSize: 11.5, color: "#64748B", marginBottom: 14 }}>{lastActiveLabel}</div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setActivityOpen(true)} style={{ flex: 1, background: "#F7F9FC", border: "1px solid #E2E8F0", color: "#334155", borderRadius: 10, padding: "9px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>View Activity</button>
        <button onClick={() => setManageOpen(true)} style={{ flex: 1, background: "#2563EB", border: "none", color: "#fff", borderRadius: 10, padding: "9px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Manage Access</button>
      </div>

      {manageOpen && <WorkerAccessModal worker={worker} ownerUid={ownerUid} onClose={() => setManageOpen(false)} />}
      {activityOpen && <ActivityModal ownerUid={ownerUid} worker={worker} onClose={() => setActivityOpen(false)} />}
    </div>
  );
};

const DashboardAccessMembersPanel: React.FC<{ ownerUid: string; onBack?: () => void }> = ({ ownerUid, onBack }) => {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!ownerUid) return;
    const unsub = onSnapshot(collection(fsdb, "managerMembers", ownerUid, "members"), (snap) => {
      const list: WorkerRow[] = [];
      snap.forEach((d) => {
        const data: any = d.data();
        if (data.role === "Manager" && d.id === ownerUid) return;
        list.push({ uid: d.id, email: data.email, role: data.role, status: data.status });
      });
      setWorkers(list);
    });
    return () => unsub();
  }, [ownerUid]);

  const anyVisible = Object.values(visibility).some(Boolean);
  const allChecked = workers.length > 0 && workers.every((w) => visibility[w.uid] !== undefined);

  return (
    <section>
      {onBack && (
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontSize: 13, marginBottom: 14, padding: 0 }}>
          <ChevronLeft size={14} /> Settings
        </button>
      )}
      <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "6px", color: "#0F172A" }}>Dashboard Access Members</h1>
      <p style={{ color: "#64748B", fontSize: 13, marginBottom: 20, maxWidth: 480 }}>
        Everyone currently granted access to the Manager Dashboard, what they can use, and when they were last active.
      </p>

      {allChecked && !anyVisible && (
        <p style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
          No one has Dashboard Access yet — grant it from Worker Permissions.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {workers.map((w) => (
          <MemberCard
            key={w.uid}
            ownerUid={ownerUid}
            worker={w}
            onVisibilityChange={(uid, visible) => setVisibility((v) => ({ ...v, [uid]: visible }))}
          />
        ))}
      </div>
    </section>
  );
};

export default DashboardAccessMembersPanel;