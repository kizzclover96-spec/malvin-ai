import { getDatabase } from "firebase-admin/database";
import { HttpsError } from "firebase-functions/v2/https";

export type LockScope = "app" | "stores" | "business" | "customerHub";

interface SystemStatusDoc {
  appLocked?: boolean;
  storesLocked?: boolean;
  businessLocked?: boolean;
  customerHubLocked?: boolean;
  message?: string;
}

const SCOPE_FIELD: Record<Exclude<LockScope, "app">, keyof SystemStatusDoc> = {
  stores: "storesLocked",
  business: "businessLocked",
  customerHub: "customerHubLocked",
};

/**
 * Server-side kill-switch check, read straight from Realtime Database via
 * the Admin SDK — the same /system/status node the admin panel writes to
 * and the frontend's AccessGate reads from. This is what makes the switch
 * a real backstop rather than just a UI convenience: even if someone calls
 * a Cloud Function directly (curl, a modified client, replaying a request),
 * this check runs before the function does anything, and there's no
 * frontend code path that can skip it.
 *
 * The app-wide switch (`appLocked`) always blocks, regardless of which
 * specific `scope` a function passes — it's a superset of every other
 * scope by design.
 */
export async function assertNotLocked(scope: LockScope): Promise<void> {
  const snap = await getDatabase().ref("system/status").get();
  const data: SystemStatusDoc = snap.exists() ? snap.val() : {};

  const scopeLocked = scope !== "app" && !!data[SCOPE_FIELD[scope]];

  if (data.appLocked || scopeLocked) {
    throw new HttpsError(
      "unavailable",
      data.message || "Access to this feature has been restricted."
    );
  }
}
