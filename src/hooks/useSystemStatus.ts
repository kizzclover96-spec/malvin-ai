import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

export interface SystemStatus {
  appLocked: boolean;
  storesLocked: boolean;
  businessLocked: boolean;
  customerHubLocked: boolean;
  message?: string;
  updatedAt?: number;
  updatedByEmail?: string;
}

const DEFAULT_STATUS: SystemStatus = {
  appLocked: false,
  storesLocked: false,
  businessLocked: false,
  customerHubLocked: false,
};

/**
 * Live subscription to /system/status in Realtime Database — the single
 * kill-switch control record the admin panel writes to.
 *
 * This is a REAL-TIME listener, not a one-time read: if the admin flips a
 * switch while someone already has the app open, every open tab gets the
 * update instantly and re-renders into the restricted state without a
 * refresh. That's what makes "log everyone out right now" possible — the
 * gate components below react to this the moment it changes, not the next
 * time someone happens to reload.
 *
 * `loading` stays true only for the first read — treat it as "unknown yet",
 * not "unlocked", so nothing briefly flashes unrestricted content while the
 * very first snapshot is still in flight.
 */
export function useSystemStatus(): { status: SystemStatus; loading: boolean } {
  const [status, setStatus] = useState<SystemStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const statusRef = ref(db, "system/status");
    const unsub = onValue(
      statusRef,
      (snap) => {
        const data = snap.val();
        setStatus({ ...DEFAULT_STATUS, ...(data || {}) });
        setLoading(false);
      },
      (err) => {
        console.error("useSystemStatus: read failed", err);
        // Fail OPEN on a read error (e.g. offline) rather than locking
        // everyone out because of a network blip — the kill switch should
        // only engage when the admin actually turns it on.
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { status, loading };
}
