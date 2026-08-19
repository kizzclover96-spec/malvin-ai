import React, { useEffect, useState } from 'react';
import { firestore as fsdb } from '../../firebase';
import { db } from '../../firebase';
import { ref, get } from 'firebase/database';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  DASHBOARD_ACCESS_AREAS,
  WorkerPermissionRecord,
  defaultWorkerPermissions,
  saveWorkerPermissions,
  workerPermissionsPath,
} from '../../utils/workerPermissions';
import { logActivity } from '../../utils/activityLog';
import { auth } from '../../firebase';

export interface WorkerRow {
  uid: string;
  email: string;
  role: string;
  status?: string;
}

const panelStyles: { [k: string]: React.CSSProperties } = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fff',
    border: '1px solid #E7ECF3',
    borderRadius: 14,
    padding: '14px 16px',
    boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
  },
  emailText: { fontSize: 14, fontWeight: 700, color: '#0F172A' },
  roleText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  grantBtn: {
    background: '#EFF4FF',
    border: '1px solid #DBE6FF',
    color: '#2563EB',
    padding: '8px 16px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  emptyState: { color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '40px 0' },
};

export const WorkerAccessModal: React.FC<{
  worker: WorkerRow;
  ownerUid: string;
  ownerLabel?: string;
  onClose: () => void;
  onSaved?: () => void;
}> = ({ worker, ownerUid, ownerLabel, onClose, onSaved }) => {
  const [draft, setDraft] = useState<WorkerPermissionRecord>(defaultWorkerPermissions());
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await get(ref(db, workerPermissionsPath(ownerUid, worker.uid)));
        setDraft({ ...defaultWorkerPermissions(), ...(snap.val() || {}) });
      } catch {
        setDraft(defaultWorkerPermissions());
      }
      setLoaded(true);
    })();
  }, [ownerUid, worker.uid]);

  const toggle = (id: string) => setDraft((d) => ({ ...d, [id]: !d[id as keyof WorkerPermissionRecord] }));
  const toggleDashboardAccess = () => setDraft((d) => ({ ...d, dashboardAccess: !d.dashboardAccess }));

  const save = async () => {
    setSaving(true);
    try {
      await saveWorkerPermissions(ownerUid, worker.uid, draft);
      const actorLabel = auth.currentUser?.email || ownerLabel || 'Manager';
      logActivity(
        ownerUid,
        auth.currentUser?.uid || ownerUid,
        actorLabel,
        draft.dashboardAccess ? 'Granted Dashboard Access' : 'Updated permissions for',
        worker.email
      );
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 640, maxHeight: '86vh', overflowY: 'auto', background: '#fff',
          border: '1px solid #E7ECF3', borderRadius: 20, padding: 24,
          boxShadow: '0 30px 80px rgba(15,23,42,0.25)',
          animation: 'permPopIn 0.18s ease-out',
        }}
      >
        <style>{`@keyframes permPopIn { from { opacity: 0; transform: scale(0.96) translateY(6px);} to { opacity: 1; transform: scale(1) translateY(0);} }`}</style>
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>{worker.email}</div>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
          Dashboard Access
        </h2>

        <button
          onClick={toggleDashboardAccess}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
            background: draft.dashboardAccess ? '#EFF4FF' : '#F7F9FC',
            border: draft.dashboardAccess ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: draft.dashboardAccess ? '#2563EB' : '#334155' }}>Allow this member to access the Main Manager Dashboard</div>
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>They'll be taken to the Manager Dashboard instead of the Worker Dashboard next time they sign in.</div>
          </div>
          <span style={{
            width: 40, height: 24, borderRadius: 999, flexShrink: 0, marginLeft: 12,
            background: draft.dashboardAccess ? '#2563EB' : '#CBD5E1', position: 'relative', transition: 'background 0.15s ease',
          }}>
            <span style={{ position: 'absolute', top: 2, left: draft.dashboardAccess ? 18 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.15s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </span>
        </button>

        {draft.dashboardAccess && (
          <>
            <h3 style={{ margin: '22px 0 4px 0', fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
              Tool Permissions
            </h3>
            <p style={{ fontSize: 11.5, color: '#64748B', margin: '0 0 12px' }}>
              Choose which tools this member can use in the dashboard.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {DASHBOARD_ACCESS_AREAS.map((area) => {
                const on = !!draft[area.id];
                return (
                  <button
                    key={area.id}
                    onClick={() => toggle(area.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '13px 14px', borderRadius: 12, cursor: 'pointer',
                      fontSize: 13.5, fontWeight: 600, textAlign: 'left',
                      transition: 'all 0.15s ease',
                      background: on ? '#EFF4FF' : '#F7F9FC',
                      border: on ? '1px solid #2563EB' : '1px solid #E2E8F0',
                      color: on ? '#2563EB' : '#64748B',
                    }}
                  >
                    <span>{area.icon}</span>
                    <span style={{ flex: 1 }}>{area.label}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{on ? 'ON' : 'OFF'}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'transparent', border: '1px solid #E2E8F0', color: '#334155', cursor: 'pointer', fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#2563EB', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 800 }}
          >
            {saving ? 'Saving…' : 'Save Access'}
          </button>
        </div>
      </div>
    </div>
  );
};

const WorkerPermissionsPanel: React.FC<{ ownerUid: string; ownerLabel?: string }> = ({ ownerUid, ownerLabel }) => {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [activeWorker, setActiveWorker] = useState<WorkerRow | null>(null);

  useEffect(() => {
    if (!ownerUid) return;
    const unsub = onSnapshot(collection(fsdb, 'managerMembers', ownerUid, 'members'), (snap) => {
      const list: WorkerRow[] = [];
      snap.forEach((d) => {
        const data: any = d.data();
        if (data.role === 'Manager' && d.id === ownerUid) return;
        list.push({ uid: d.id, email: data.email, role: data.role, status: data.status });
      });
      setWorkers(list);
    });
    return () => unsub();
  }, [ownerUid]);

  return (
    <section>
      <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>Worker Permissions</h1>
      <h3 style={{ marginTop: 0, fontSize: '14px', color: '#2563EB', letterSpacing: '1px', fontWeight: 800 }}>
        DASHBOARD ACCESS CONTROL
      </h3>
      <p style={{ color: '#64748B', fontSize: 13, maxWidth: 520 }}>
        Choose who can open the Manager Dashboard, and which tools they can use once they're in it.
        Anything you don't grant appears locked to them.
      </p>

      <div style={panelStyles.wrap}>
        {workers.length === 0 && <div style={panelStyles.emptyState}>No workers yet — invite staff from the Team tab first.</div>}
        {workers.map((w) => (
          <div key={w.uid} style={panelStyles.row}>
            <div>
              <div style={panelStyles.emailText}>{w.email}</div>
              <div style={panelStyles.roleText}>{w.role} {w.status ? `· ${w.status}` : ''}</div>
            </div>
            <button style={panelStyles.grantBtn} onClick={() => setActiveWorker(w)}>
              Grant Access
            </button>
          </div>
        ))}
      </div>

      {activeWorker && (
        <WorkerAccessModal worker={activeWorker} ownerUid={ownerUid} ownerLabel={ownerLabel} onClose={() => setActiveWorker(null)} />
      )}
    </section>
  );
};

export default WorkerPermissionsPanel;