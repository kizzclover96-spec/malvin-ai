import { signInWithCustomToken, type Auth } from 'firebase/auth';

// Avoids re-signing-in on every MALVIN_USER message a store receives — the
// parent can resend identity more than once per session (a retried
// handshake, a duplicate *_READY), and calling signInWithCustomToken()
// repeatedly with the same token is wasted work at best and a network
// round-trip that can race with itself at worst.
let lastAppliedToken: string | null = null;

// Error codes worth retrying — genuinely transient, not a problem with the
// token itself. A flaky connection, a DNS hiccup, or the iframe's network
// stack not being fully up yet on the very first attempt are the realistic
// causes; retrying a couple of times with a short, growing delay clears
// most of these without the store staying stuck on plain uid/email data
// (no working Firestore session) for something that would have worked on
// attempt two. auth/invalid-custom-token and auth/custom-token-mismatch
// deliberately are NOT in this list — retrying an actually-bad token just
// wastes time and fails identically every time.
const RETRYABLE_AUTH_ERROR_CODES = new Set([
  'auth/network-request-failed',
  'auth/timeout',
  'auth/too-many-requests',
]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await signInWithCustomToken(auth, customToken);
      return; // success
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const isRetryable = code ? RETRYABLE_AUTH_ERROR_CODES.has(code) : false;
      const isLastAttempt = attempt === maxAttempts;

      if (isRetryable && !isLastAttempt) {
        console.warn(`Storefront auth sign-in attempt ${attempt} failed (${code}), retrying…`);
        await delay(attempt * 600); // 600ms, then 1200ms
        continue;
      }

      // Soft failure — the store still has uid/email as plain data for
      // display purposes, it just won't be able to run authenticated
      // Firestore queries. Reset so a later, possibly-valid token isn't
      // skipped because this one happened to fail.
      lastAppliedToken = null;
      console.error('Failed to establish storefront auth session from custom token:', err);
      return;
    }
  }
}

/**
 * Resolves once THIS origin's Firebase Auth actually has a real,
 * signed-in user — not the moment identity DATA arrives over postMessage,
 * which is a separate, earlier event. `applyStorefrontIdentity` above is
 * asynchronous (it may retry on a flaky connection, and even a clean run
 * is a real network round trip to Cloud Functions + Identity Toolkit), so
 * there's a real window where a store has uid/email to DISPLAY but no
 * working `request.auth` for firestore.rules to check yet.
 *
 * That gap is exactly what broke ratings: handleRateStore fell back to a
 * plain postMessage-derived guestId whenever auth.currentUser wasn't set
 * yet, so the WRITE could fire before the real session existed —
 * Firestore correctly rejected it, since a client-supplied uid string
 * proves nothing on its own. Reads never showed this (user_ratings is
 * public-read by design), only writes, which is why it looked like a
 * rules problem rather than a sequencing one.
 *
 * Callers that need a real, write-capable identity (submitting a rating,
 * placing an order, anything Firestore's rules gate on request.auth.uid)
 * should await this instead of reading auth.currentUser directly or
 * falling back to a locally-tracked guest id. Resolves immediately if
 * already signed in; otherwise waits (bounded by timeoutMs) for
 * onAuthStateChanged to actually fire. Resolves to null — never rejects —
 * if that doesn't happen in time, so callers can show an honest "still
 * connecting" message instead of a raw Firestore permission error.
 */
export function waitForRealAuthUid(auth: Auth, timeoutMs = 4000): Promise<string | null> {
  if (auth.currentUser?.uid) return Promise.resolve(auth.currentUser.uid);

  return new Promise((resolve) => {
    let settled = false;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (settled) return;
      if (user?.uid) {
        settled = true;
        clearTimeout(timer);
        unsubscribe();
        resolve(user.uid);
      }
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve(auth.currentUser?.uid ?? null);
    }, timeoutMs);
  });
}