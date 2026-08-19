import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { ref, onValue, set as rtdbSet, get } from 'firebase/database';
import { TOOLS, ToolKey } from '../config/bvinTools';

/* ============================================================================
   Every dashboard area an owner/manager can grant or restrict access to.

   Two sources feed this list:
   - CORE_ACCESS_AREAS: dashboard destinations that aren't individually
     toggleable tools (Analytics, Orders, Team Hub, Settings) — these exist
     regardless of what's enabled in Enable Tools, so they need their own
     entries rather than piggybacking on a TOOLS key.
   - Every entry in TOOLS itself (src/config/bvinTools.ts) — so a manager
     can grant or withhold any individual tool a worker might use, not
     just a handful of broad buckets. This is the single source of truth
     tool config already uses elsewhere (B-Vin's Enable Tools screen,
     the customer store), so a new tool added there is automatically
     grantable here too with no separate list to maintain.
============================================================================ */

export const CORE_ACCESS_AREAS = [
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'orders', label: 'Orders & Job Board', icon: '🧾' },
  { id: 'teamHub', label: 'Team Hub', icon: '💬' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
] as const;

// "orders" (and any other id that happens to collide with a core area) is
// deliberately excluded from the tool-derived list below — it's already
// covered by CORE_ACCESS_AREAS above, and without this filter the same
// permission would show up twice in the grant grid under two different
// labels toggling the exact same underlying key.
const CORE_IDS: Set<string> = new Set(CORE_ACCESS_AREAS.map((a) => a.id));
const TOOL_ACCESS_AREAS = TOOLS.filter((t) => !CORE_IDS.has(t.key)).map((t) => ({ id: t.key, label: t.label, icon: '🔧' }));

export const DASHBOARD_ACCESS_AREAS = [...CORE_ACCESS_AREAS, ...TOOL_ACCESS_AREAS];

export type CoreAreaId = typeof CORE_ACCESS_AREAS[number]['id'];
export type AccessAreaId = CoreAreaId | ToolKey;
export type WorkerPermissionMap = Partial<Record<AccessAreaId, boolean>>;

// `dashboardAccess` is a separate, top-level flag from the per-tool grants
// below it — it answers "can this person open the Manager Dashboard at
// all", while the per-area keys answer "which tools once they're in it".
// Same RTDB node, both read directly by the claimTeamInvite Cloud Function
// (malvinbackend/src/index.ts) so the routing decision — worker dashboard
// vs. manager dashboard — is server-verified, not just a client flag.
export interface WorkerPermissionRecord extends WorkerPermissionMap {
  dashboardAccess?: boolean;
}

export const defaultWorkerPermissions = (): WorkerPermissionRecord => ({
  dashboardAccess: false,
  ...DASHBOARD_ACCESS_AREAS.reduce((acc, area) => {
    acc[area.id] = false;
    return acc;
  }, {} as WorkerPermissionMap),
});

export const workerPermissionsPath = (ownerUid: string, workerUid: string) =>
  `users/${ownerUid}/workerPermissions/${workerUid}`;

export async function saveWorkerPermissions(
  ownerUid: string,
  workerUid: string,
  permissions: WorkerPermissionRecord
) {
  await rtdbSet(ref(db, workerPermissionsPath(ownerUid, workerUid)), permissions);
}

export async function getWorkerPermissionsOnce(ownerUid: string, workerUid: string): Promise<WorkerPermissionRecord> {
  const snap = await get(ref(db, workerPermissionsPath(ownerUid, workerUid)));
  return snap.val() || defaultWorkerPermissions();
}

/**
 * Live-subscribes to a worker's granted dashboard access.
 * Owners/managers always get full access (isOwner=true short-circuits to all-true).
 */
export function useWorkerPermissions(ownerUid?: string | null, workerUid?: string | null, isOwner?: boolean) {
  const fullAccess = (): WorkerPermissionRecord => ({
    dashboardAccess: true,
    ...DASHBOARD_ACCESS_AREAS.reduce((a, x) => ({ ...a, [x.id]: true }), {}),
  });

  const [permissions, setPermissions] = useState<WorkerPermissionRecord>(isOwner ? fullAccess() : {});
  const [loaded, setLoaded] = useState(!!isOwner);

  useEffect(() => {
    if (isOwner) {
      setPermissions(fullAccess());
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
  const hasDashboardAccess = isOwner || !!permissions.dashboardAccess;

  return { permissions, loaded, canAccess, hasDashboardAccess };
}

/**
 * Wrap any dashboard section with this. If the current user lacks access,
 * the content renders faded/blurred with a centered lock badge instead of
 * being removed entirely — so the layout doesn't jump around, and the
 * worker can see what exists without being able to use it.
 *
 * IMPORTANT: this is presentation only. The real boundary is server-side
 * (Firestore/RTDB rules keyed off the `dashboardAccessOf`/`teamOf` custom
 * claims) — a worker blocked here but hitting a collection directly still
 * gets denied by the rules, same as any other client-side gate in this
 * app. See firestore.rules' WORKER TOOL PERMISSIONS note for the current
 * state of that enforcement (per-tool grants are still client/RTDB-only
 * today — only `dashboardAccess` itself is claim-backed so far).
 */
export const LockedSection: React.FC<{
  allowed: boolean;
  label?: string;
  children: React.ReactNode;
  minHeight?: number | string;
  onLockedClick?: () => void;
}> = ({ allowed, label = 'You do not have access to this', children, minHeight, onLockedClick }) => {
  if (allowed) return React.createElement(React.Fragment, null, children);

  return React.createElement(
    'div',
    { style: { position: 'relative', minHeight, borderRadius: 16, overflow: 'hidden' }, onClick: onLockedClick },
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
          cursor: onLockedClick ? 'pointer' : 'default',
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