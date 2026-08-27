import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, increment } from "firebase/firestore";
import { firestore } from "../firebase";

/* ============================================================================
   STORAGE QUOTA
   ---------------------------------------------------------------------------
   Every Malvin user gets 10 MB free storage, tracked as a running byte
   counter at users/{uid}.storageUsedBytes. Nothing here decides WHAT counts
   toward storage — that's up to each upload call site, which should call
   recordStorageUsage(uid, bytes) right after a successful upload (see
   handleLogoFile / handleWorkerAvatarFile in B-Vin.tsx for the two wired
   examples). This file is the single source of truth for the limit itself,
   so the number only ever needs to change in one place.
============================================================================ */

export const FREE_STORAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface StorageState {
  usedBytes: number;
  limitBytes: number;
  percentUsed: number; // 0-100+
  nearLimit: boolean;  // >= 90%
  atLimit: boolean;    // >= 100%
}

export function evaluateStorage(usedBytes: number, limitBytes: number = FREE_STORAGE_BYTES): StorageState {
  const percentUsed = limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 0;
  return {
    usedBytes,
    limitBytes,
    percentUsed,
    nearLimit: percentUsed >= 90,
    atLimit: percentUsed >= 100,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Call right after any successful file upload to add its size to the running total. */
export async function recordStorageUsage(uid: string, bytesAdded: number): Promise<void> {
  if (!uid || !bytesAdded) return;
  try {
    await setDoc(doc(firestore, "users", uid), { storageUsedBytes: increment(bytesAdded) }, { merge: true });
  } catch (err) {
    console.error("Failed to record storage usage:", err);
  }
}

/** Live-reads users/{uid}.storageUsedBytes and evaluates it against the free tier limit. */
export function useStorageUsage(uid: string | null | undefined): StorageState {
  const [usedBytes, setUsedBytes] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(firestore, "users", uid), (snap) => {
      setUsedBytes(snap.data()?.storageUsedBytes || 0);
    });
    return () => unsub();
  }, [uid]);

  return evaluateStorage(usedBytes);
}
