import React, { useEffect, useState } from 'react';
import { firestore as fsdb } from '../../firebase';
import { db } from '../../firebase';
import { ref, get } from 'firebase/database';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  DASHBOARD_ACCESS_AREAS,
  WorkerPermissionMap,
  defaultWorkerPermissions,
  saveWorkerPermissions,
  workerPermissionsPath,
} from '../../utils/workerPermissions';

interface WorkerRow {
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
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '14px 16px',
  },
  emailText: { fontSize: 14, fontWeight: 600 },
  roleText: { fontSize: 11, opacity: 0.5, marginTop: 2 },
  grantBtn: {
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid #22c55e',
    color: '#22c55e',
    padding: '8px 16px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  emptyState: { opacity: 0.4, fontSize: 13, textAlign: 'center', padding: '40px 0' },
};

const WorkerPermissionsPanel: React.FC<{ ownerUid: string }> = ({ ownerUid }) => {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [activeWorker, setActiveWorker] = useState<WorkerRow | null>(null);
  const [draft, setDraft] = useState<WorkerPermissionMap>(defaultWorkerPermissions());
  const [saving, setSaving] = useState(false);

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

  const openWorker = async (w: WorkerRow) => {
    setActiveWorker(w);
    try {
      const snap = await get(ref(db, workerPermissionsPath(ownerUid, w.uid)));
      setDraft({ ...defaultWorkerPermissions(), ...(snap.val() || {}) });
    } catch {
      setDraft(defaultWorkerPermissions());
    }
  };

  const toggle = (id: string) => setDraft((d) => ({ ...d, [id]: !d[id as keyof WorkerPermissionMap] }));

  const save = async () => {
    if (!activeWorker) return;
    setSaving(true);
    try {
      await saveWorkerPermissions(ownerUid, activeWorker.uid, draft);
      setActiveWorker(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>Worker Permissions</h1>
      <h3 style={{ marginTop: 0, fontSize: '14px', color: '#22c55e', letterSpacing: '1px', fontWeight: 800 }}>
        DASHBOARD ACCESS CONTROL
      </h3>
      <p style={{ opacity: 0.5, fontSize: 13, maxWidth: 520 }}>
        Choose exactly what each worker can see and use in the dashboard. Anything you don't grant
        appears locked to them.
      </p>

      <div style={panelStyles.wrap}>
        {workers.length === 0 && <div style={panelStyles.emptyState}>No workers yet — invite staff from the Team tab first.</div>}
        {workers.map((w) => (
          <div key={w.uid} style={panelStyles.row}>
            <div>
              <div style={panelStyles.emailText}>{w.email}</div>
              <div style={panelStyles.roleText}>{w.role} {w.status ? `· ${w.status}` : ''}</div>
            </div>
            <button style={panelStyles.grantBtn} onClick={() => openWorker(w)}>
              Grant Access
            </button>
          </div>
        ))}
      </div>

      {activeWorker && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={() => setActiveWorker(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 460, background: '#0b0b0d',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24,
              boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
              animation: 'permPopIn 0.18s ease-out',
            }}
          >
            <style>{`@keyframes permPopIn { from { opacity: 0; transform: scale(0.96) translateY(6px);} to { opacity: 1; transform: scale(1) translateY(0);} }`}</style>
            <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>{activeWorker.email}</div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 800 }}>
              What should this user have access to in the dashboard?
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
              {DASHBOARD_ACCESS_AREAS.map((area) => {
                const on = !!draft[area.id];
                return (
                  <button
                    key={area.id}
                    onClick={() => toggle(area.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, textAlign: 'left',
                      transition: 'all 0.15s ease',
                      background: on ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                      border: on ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                      color: on ? '#22c55e' : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    <span>{area.icon}</span>
                    <span style={{ flex: 1 }}>{area.label}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{on ? 'ON' : 'OFF'}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={() => setActiveWorker(null)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#22c55e', border: 'none', color: '#04150a', cursor: 'pointer', fontSize: 13, fontWeight: 800 }}
              >
                {saving ? 'Saving…' : 'Save Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default WorkerPermissionsPanel;
