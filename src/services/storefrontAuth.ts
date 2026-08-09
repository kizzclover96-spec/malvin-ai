import { signInWithCustomToken, type Auth } from 'firebase/auth';

// Avoids re-signing-in on every MALVIN_USER message a store receives — the
// parent can resend identity more than once per session (a retried
// handshake, a duplicate *_READY), and calling signInWithCustomToken()
// repeatedly with the same token is wasted work at best and a network
// round-trip that can race with itself at worst.
let lastAppliedToken: string | null = null;

/**
 * Called by every store (Store.tsx, salonStore.tsx, hotelStore.tsx,
 * mechanicStore.tsx, serviceStore.tsx, MarketFront.tsx) on receiving a
 * MALVIN_USER postMessage from StoreFront.tsx that carries a `customToken`.
 *
 * WHY THIS EXISTS: stores run on stores.malvinai.com, a genuinely different
 * origin than the main app shell (by design — see the <iframe> comment in
 * StoreFront.tsx). Firebase Auth sessions live in per-origin browser
 * storage, so the customer's real, already-verified session on the shell's
 * origin simply doesn't exist here — this origin's own `auth.currentUser`
 * is null even though identity data (uid/email) arrived over postMessage.
 * A bare uid is just a string a client claims about itself; Firestore's
 * security rules correctly refuse to trust that with nothing backing it,
 * which is why scoped queries were failing with "Missing or insufficient
 * permissions" here despite the handshake itself succeeding.
 *
 * StoreFront.tsx mints a short-lived Firebase custom token server-side
 * (mintStorefrontToken in malvinbackend/src/index.ts, callable only by an
 * already-authenticated caller) for that same uid and sends it down
 * alongside the rest of the identity payload. Signing in with it here
 * gives this origin a REAL Firebase Auth session for that uid — the same
 * as if the customer had signed in directly on stores.malvinai.com —
 * which is what lets request.auth.uid checks in firestore.rules actually
 * pass for the store's own queries.
 */
export async function applyStorefrontIdentity(auth: Auth, customToken: string | null | undefined): Promise<void> {
  if (!customToken || customToken === lastAppliedToken) return;
  lastAppliedToken = customToken;
  try {
    await signInWithCustomToken(auth, customToken);
  } catch (err) {
    // Soft failure — the store still has uid/email as plain data for
    // display purposes, it just won't be able to run authenticated
    // Firestore queries. Reset so a later, possibly-valid token isn't
    // skipped because this one happened to fail.
    lastAppliedToken = null;
    console.error('Failed to establish storefront auth session from custom token:', err);
  }
}
