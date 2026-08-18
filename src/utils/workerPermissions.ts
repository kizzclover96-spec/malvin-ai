import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { ref, onValue, set as rtdbSet } from 'firebase/database';

// Every dashboard area an owner/manager can grant or restrict access to.
// Keep `id` stable — it's used as the RTDB key. `label`/`icon` are display only.
export const DASHBOARD_ACCESS_AREAS = [
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'orders', label: 'Orders & Job Board', icon: '🧾' },
  { id: 'inventory', label: 'Inventory / Connect System', icon: '📦' },
  { id: 'storefront', label: 'Storefront & Catalog', icon: '🛍️' },
  { id: 'finances', label: 'Finances & Payouts', icon: '💳' },
  { id: 'invoices', label: 'Invoices & Expenses', icon: '🧮' },
  { id: 'teamHub', label: 'Team Hub', icon: '💬' },
  { id: 'tools', label: 'Business Tools', icon: '🧰' },
  { id: 'marketing', label: 'Marketing & Ads', icon: '📣' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
] as const;

export type AccessAreaId = typeof DASHBOARD_ACCESS_AREAS[number]['id'];
export type WorkerPermissionMap = Partial<Record<AccessAreaId, boolean>>;

export const defaultWorkerPermissions = (): WorkerPermissionMap =>
  DASHBOARD_ACCESS_AREAS.reduce((acc, area) => {
    acc[area.id] = false;
    return acc;
  }, {} as WorkerPermissionMap);

export const workerPermissionsPath = (ownerUid: string, workerUid: string) =>
  `users/${ownerUid}/workerPermissions/${workerUid}`;

export async function saveWorkerPermissions(
  ownerUid: string,
  workerUid: string,
  permissions: WorkerPermissionMap
) {
  await rtdbSet(ref(db, workerPermissionsPath(ownerUid, workerUid)), permissions);
}

/**
 * Live-subscribes to a worker's granted dashboard access.
 * Owners/managers always get full access (isOwner=true short-circuits to all-true).
 */
export function useWorkerPermissions(ownerUid?: string | null, workerUid?: string | null, isOwner?: boolean) {
  const [permissions, setPermissions] = useState<WorkerPermissionMap>(
    isOwner ? DASHBOARD_ACCESS_AREAS.reduce((a, x) => ({ ...a, [x.id]: true }), {}) : {}
  );
  const [loaded, setLoaded] = useState(!!isOwner);

  useEffect(() => {
    if (isOwner) {
      setPermissions(DASHBOARD_ACCESS_AREAS.reduce((a, x) => ({ ...a, [x.id]: true }), {}));
      setLoaded(true);
      return;
    }
    if (!ownerUid || !workerUid) return;
    const r = ref(db, workerPermissionsPath(ownerUid, workerUid));
    const unsub = onValue(r, (snap) => {
      setPermissions(snap.val() || {});
      setLoaded(true);
    });
    return () => unsub();
  }, [ownerUid, workerUid, isOwner]);

  const canAccess = (area: AccessAreaId) => !!permissions[area];

  return { permissions, loaded, canAccess };
}

/**
 * Wrap any dashboard section with this. If the current user lacks access,
 * the content renders faded/blurred with a centered lock badge instead of
 * being removed entirely — so the layout doesn't jump around, and the
 * worker can see what exists without being able to use it.
 */
export const LockedSection: React.FC<{
  allowed: boolean;
  label?: string;
  children: React.ReactNode;
  minHeight?: number | string;
}> = ({ allowed, label = 'You do not have access to this', children, minHeight }) => {
  if (allowed) return React.createElement(React.Fragment, null, children);

  return React.createElement(
    'div',
    { style: { position: 'relative', minHeight, borderRadius: 16, overflow: 'hidden' } },
    React.createElement(
      'div',
      {
        style: {
          opacity: 0.25,
          filter: 'blur(1.5px) grayscale(0.4)',
          pointerEvents: 'none',
          userSelect: 'none',
        },
      },
      children
    ),
    React.createElement(
      'div',
      {
        style: {
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: 'rgba(0,0,0,0.15)',
          backdropFilter: 'blur(2px)',
          textAlign: 'center',
          padding: 16,
        },
      },
      React.createElement('div', { style: { fontSize: 26 } }, '🔒'),
      React.createElement(
        'div',
        { style: { fontSize: 12, fontWeight: 700, color: 'white', opacity: 0.85, maxWidth: 220 } },
        label
      )
    )
  );
};
