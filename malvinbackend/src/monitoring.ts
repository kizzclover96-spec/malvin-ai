import * as Sentry from "@sentry/node";
import type { CallableRequest } from "firebase-functions/v2/https";

let initialized = false;

/**
 * Lazy, idempotent init — called from withMonitoring() on first use rather
 * than at module load, because SENTRY_DSN is bound as a Firebase Functions
 * v2 secret (see setGlobalOptions in index.ts) and secrets aren't
 * guaranteed to be populated in process.env until a request actually comes
 * in for a function that declares them.
 */
export function initSentry(): void {
  if (initialized) return;
  initialized = true; // set first so a failed init doesn't retry on every call

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn("SENTRY_DSN not set — backend error reporting to Sentry is disabled.");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || "production",
    tracesSampleRate: 0.1,
  });
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  console.error(err);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  }
}

/**
 * Wraps an onCall handler so any thrown error (including rate-limit
 * rejections and real bugs) is reported to Sentry before it's rethrown to
 * the client exactly as before. Apply this to any callable that touches
 * money, credentials, or another abuse-prone path.
 */
export function withMonitoring<TData = any, TResult = any>(
  handler: (request: CallableRequest<TData>) => Promise<TResult>
) {
  return async (request: CallableRequest<TData>): Promise<TResult> => {
    initSentry();
    try {
      return await handler(request);
    } catch (err) {
      captureError(err, { uid: request.auth?.uid });
      throw err;
    }
  };
}
