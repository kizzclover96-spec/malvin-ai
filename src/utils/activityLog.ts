import { collection, addDoc, serverTimestamp, doc, setDoc, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { firestore } from "../firebase";

/* ============================================================================
   ACTIVITY LOG — the audit trail described in the Dashboard Access spec.
   Every entry lives at business/{businessId}/activityLog/{entryId}, and is
   read back per-member in the Dashboard Access Members screen.

   This is deliberately a thin, generic logger rather than a bespoke event
   type per action — `action` is a short human phrase ("Edited document",
   "Granted Finance access"), `detail` is the specific target ("Sunday
   Meeting Notes"). Call logActivity() from any mutation point that matters
   for an audit trail; it's cheap (one Firestore write) and never blocks
   the action it's describing — callers fire-and-forget it.
============================================================================ */

export interface ActivityEntry {
  id: string;
  actorUid: string;
  actorLabel: string;
  action: string;
  detail?: string;
  createdAt?: any;
}

export function logActivity(businessId: string, actorUid: string, actorLabel: string, action: string, detail?: string) {
  addDoc(collection(firestore, "business", businessId, "activityLog"), {
    actorUid,
    actorLabel,
    action,
    detail: detail || null,
    createdAt: serverTimestamp(),
  }).catch(() => {
    // Best-effort — never worth interrupting the actual action over a
    // failed audit-log write.
  });
}

export function useActivityLog(businessId: string, actorUid?: string, max = 100) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  useEffect(() => {
    if (!businessId) return;
    const q = query(collection(firestore, "business", businessId, "activityLog"), orderBy("createdAt", "desc"), limit(max));
    const unsub = onSnapshot(q, (snap) => {
      const list: ActivityEntry[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setEntries(actorUid ? list.filter((e) => e.actorUid === actorUid) : list);
    });
    return () => unsub();
  }, [businessId, actorUid, max]);
  return entries;
}

/* ============================================================================
   PRESENCE — last login / "active now" for the Dashboard Access Members
   list. A lightweight heartbeat rather than Firebase's Realtime Database
   presence system (onDisconnect), since this only needs to answer "roughly
   how recently was this person here", not instant online/offline state.
============================================================================ */

const ACTIVE_WINDOW_MS = 2 * 60 * 1000; // "Active now" if seen in the last 2 minutes
const HEARTBEAT_MS = 60 * 1000;

export function usePresenceHeartbeat(businessId: string, uid: string, label: string) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!businessId || !uid) return;
    const ping = () => {
      setDoc(doc(firestore, "business", businessId, "memberPresence", uid), {
        label, lastActive: Date.now(), lastLogin: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    };
    ping();
    intervalRef.current = setInterval(ping, HEARTBEAT_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [businessId, uid, label]);
}

export interface PresenceInfo { lastActive?: number; lastLogin?: any; }

export function usePresence(businessId: string, uid: string) {
  const [presence, setPresence] = useState<PresenceInfo | null>(null);
  useEffect(() => {
    if (!businessId || !uid) return;
    const unsub = onSnapshot(doc(firestore, "business", businessId, "memberPresence", uid), (snap) => {
      setPresence(snap.exists() ? (snap.data() as PresenceInfo) : null);
    });
    return () => unsub();
  }, [businessId, uid]);

  const isActiveNow = !!presence?.lastActive && Date.now() - presence.lastActive < ACTIVE_WINDOW_MS;

  const lastActiveLabel = (() => {
    if (!presence?.lastActive) return "Never";
    if (isActiveNow) return "Active now";
    const mins = Math.round((Date.now() - presence.lastActive) / 60000);
    if (mins < 60) return `Last active ${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `Last active ${hours}h ago`;
    return `Last active ${Math.round(hours / 24)}d ago`;
  })();

  return { presence, isActiveNow, lastActiveLabel };
}