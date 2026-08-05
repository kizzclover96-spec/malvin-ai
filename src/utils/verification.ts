/**
 * PLATFORM VERIFICATION MARK
 * ---------------------------------------------------------------------------
 * The blue check next to a business name. Whether an account carries it has
 * historically been readable from two places:
 *
 *   1. The Realtime Database user node (`users/{uid}`), which is where admin
 *      tooling writes it — sometimes at the root as `isVerified`, sometimes
 *      nested under `profile`. This is what the salon and restaurant
 *      dashboards read.
 *   2. The business's own Firestore profile document, which carries an
 *      `isVerified` field (the hotels collection defines one).
 *
 * Reading only one source silently drops the badge for an account that has
 * the other set, so this accepts either.
 */

export interface VerifiableProfile {
  isVerified?: boolean;
}

export function resolveVerifiedFlag(
  rtdbUser: any,
  profile?: VerifiableProfile | null
): boolean {
  return Boolean(
    rtdbUser?.profile?.isVerified ||
      rtdbUser?.isVerified ||
      profile?.isVerified
  );
}
