import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * A single rate-limit rule: "no more than `max` hits per `windowMs`".
 * `name` becomes part of the Firestore document id, so keep it short and
 * stable — renaming it resets everyone's counters.
 */
export interface RateLimitRule {
  name: string;
  max: number;
  windowMs: number;
}

/**
 * Whatever identity signals a given request actually has. Deliberately not
 * just "ip" — a university, office, café, hotel, or mobile carrier can put
 * hundreds of legitimate users behind one public IP, so a bare "1 IP = 1
 * bucket" limiter either locks out a whole building or has to be so loose
 * it stops protecting anything. Each caller supplies whichever of these it
 * has (ip, the authenticated uid, and/or a subject like a target email) and
 * enforceRateLimit folds all of them into the bucket key, so the limit is
 * really "this IP AND this account AND this target", not just the IP.
 */
export interface RateLimitIdentity {
  ip?: string | null;
  uid?: string | null;
  subject?: string | null;
}

// Leading underscore, and never granted to any client SDK — nothing in
// firestore.rules allows read/write on this collection, so the only thing
// that can ever touch it is the Admin SDK running inside these Cloud
// Functions. There is no frontend code path, config flag, or exposed
// endpoint that reaches it — that's what makes this "invisible from the
// browser" rather than just "not linked to from the UI".
const RATE_LIMIT_COLLECTION = "_rateLimits";

function sanitizeKeyPart(part: string): string {
  return part.replace(/[/\s]+/g, "_").slice(0, 300);
}

/**
 * Enforces one or more rate-limit rules for a request, atomically. Throws
 * HttpsError("resource-exhausted", ...) the instant any rule is over
 * budget — callers just `await` this before doing the real work, same as
 * an auth check.
 *
 * Uses a Firestore transaction per rule so concurrent bursts (10 requests
 * arriving in the same millisecond) can't all read "0 so far" and all
 * slip through.
 */
export async function enforceRateLimit(
  identity: RateLimitIdentity,
  rules: RateLimitRule[]
): Promise<void> {
  const db = getFirestore();
  const now = Date.now();

  for (const rule of rules) {
    const parts = [rule.name];
    if (identity.uid) parts.push(`uid:${identity.uid}`);
    if (identity.ip) parts.push(`ip:${identity.ip}`);
    if (identity.subject) parts.push(`subj:${identity.subject.toLowerCase()}`);

    // A rule with zero identity signals would collapse into one shared
    // global bucket for every caller — fail loudly instead of silently
    // shipping a limiter that doesn't actually limit anyone.
    if (parts.length === 1) {
      throw new Error(`enforceRateLimit: rule "${rule.name}" has no identity to key on.`);
    }

    const docId = sanitizeKeyPart(parts.join("|"));
    const ref = db.collection(RATE_LIMIT_COLLECTION).doc(docId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? (snap.data() as { count: number; windowStart: number }) : null;

      const windowExpired = !data || now - data.windowStart > rule.windowMs;
      const count = windowExpired ? 0 : data!.count;
      const windowStart = windowExpired ? now : data!.windowStart;

      if (count >= rule.max) {
        const retryInMs = rule.windowMs - (now - windowStart);
        throw new HttpsError(
          "resource-exhausted",
          `Too many requests. Please try again in ${Math.max(1, Math.ceil(retryInMs / 1000))}s.`
        );
      }

      tx.set(
        ref,
        {
          count: count + 1,
          windowStart,
          updatedAt: now,
          // Firestore TTL field — enable a TTL policy on `_rateLimits.expiresAt`
          // in the console (one-time setup) and old buckets clean themselves
          // up automatically instead of growing forever.
          expiresAt: new Date(windowStart + rule.windowMs * 2),
        },
        { merge: false }
      );
    });
  }
}

/**
 * Best-effort client IP extraction. Works for both onCall (via
 * request.rawRequest) and onRequest (req directly) — Cloud Functions v2
 * runs behind Google's front end, which sets x-forwarded-for to the real
 * client IP as the first entry.
 */
export function getClientIp(req: { headers: Record<string, unknown>; ip?: string } | undefined): string {
  if (!req) return "unknown";
  const fwd = req.headers?.["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  return req.ip || "unknown";
}
