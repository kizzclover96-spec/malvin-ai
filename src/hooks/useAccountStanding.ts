import { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { auth } from '../firebase';
import { resolveVerifiedFlag } from '../utils/verification';

/**
 * ACCOUNT STANDING — one reader for "is this account premium, and is it
 * verified".
 *
 * These two flags were being read from three different places with three
 * different shapes: Category.tsx looked at users/{uid}/profile/isPremium,
 * Premium.tsx at users/{uid}/premium|tier, and App.jsx at the `premium`
 * custom claim. The RTDB `tier` field is the one the backend actually treats
 * as authoritative (see syncPremiumClaim in malvinbackend — it mints the
 * custom claim FROM users/{uid}/tier), and nothing ever wrote
 * profile/isPremium, which is why the premium pill never lit up.
 *
 * Everything is accepted on read so no existing account is misread, but
 * `tier === 'premium'` is the source of truth.
 */
export interface AccountStanding {
  isPremium: boolean;
  isVerified: boolean;
  /** Premium AND verified — the only state that lifts the intake cap. */
  unlimited: boolean;
  loading: boolean;
}

export function resolvePremiumFlag(rtdbUser: any): boolean {
  if (!rtdbUser) return false;
  return (
    rtdbUser.tier === 'premium' ||
    rtdbUser.premium === true ||
    rtdbUser.isPremium === true ||
    rtdbUser.profile?.isPremium === true ||
    rtdbUser.profile?.tier === 'premium'
  );
}

/**
 * @param businessUid whose standing to read. Defaults to the signed-in user,
 *   which is what every dashboard wants; storefronts pass the business's uid.
 */
export function useAccountStanding(businessUid?: string | null): AccountStanding {
  const [rtdbUser, setRtdbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackUid, setFallbackUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  // Without this the hook would read auth.currentUser once, before sign-in
  // resolves, and never re-run.
  useEffect(() => {
    if (businessUid) return;
    return auth.onAuthStateChanged((user) => setFallbackUid(user?.uid ?? null));
  }, [businessUid]);

  const uid = businessUid || fallbackUid;

  useEffect(() => {
    if (!uid) {
      setRtdbUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const rtdb = getDatabase();
    const unsubscribe = onValue(
      ref(rtdb, `users/${uid}`),
      (snapshot) => {
        setRtdbUser(snapshot.val());
        setLoading(false);
      },
      (err) => {
        console.error('Failed to read account standing:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [uid]);

  const isPremium = resolvePremiumFlag(rtdbUser);
  const isVerified = resolveVerifiedFlag(rtdbUser);

  return { isPremium, isVerified, unlimited: isPremium && isVerified, loading };
}
