import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db, auth } from "../firebase";

export const FREE_VINBACK_TAGS = 2;
export const VINBACK_TAG_PRICE_USD = 0.88;

export interface VinBackCreditsState {
  loading: boolean;
  tagsCreatedCount: number;
  paidCredits: number;
  freeRemaining: number;
  canCreateForFree: boolean;
  /** True if the next tag is either free or already paid for. */
  canCreate: boolean;
}

// Live mirror of users/{uid}/vinback in Realtime Database, kept current by
// createVinBackTag (consumes a slot) and the LemonSqueezy webhook (grants
// paidCredits on purchase) — see malvinbackend/src/index.ts /
// api/webhook/lemonsqueezy.ts. This hook is read-only; nothing writes
// through it directly, matching how quota enforcement actually happens
// server-side, not in the client.
export function useVinBackCredits(uid?: string | null): VinBackCreditsState {
  const resolvedUid = uid ?? auth.currentUser?.uid ?? null;
  const [tagsCreatedCount, setTagsCreatedCount] = useState(0);
  const [paidCredits, setPaidCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resolvedUid) {
      setLoading(false);
      return;
    }
    const r = ref(db, `users/${resolvedUid}/vinback`);
    const unsub = onValue(
      r,
      (snap) => {
        const v = snap.val() || {};
        setTagsCreatedCount(v.tagsCreatedCount || 0);
        setPaidCredits(v.paidCredits || 0);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [resolvedUid]);

  const freeRemaining = Math.max(0, FREE_VINBACK_TAGS - tagsCreatedCount);
  return {
    loading,
    tagsCreatedCount,
    paidCredits,
    freeRemaining,
    canCreateForFree: freeRemaining > 0,
    canCreate: freeRemaining > 0 || paidCredits > 0,
  };
}
