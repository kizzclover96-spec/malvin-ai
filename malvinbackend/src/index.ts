import "dotenv/config";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onValueWritten } from "firebase-functions/v2/database";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";
import { initializeApp } from "firebase-admin/app";
import * as crypto from "crypto";
import { enforceRateLimit, getClientIp, RateLimitRule } from "./rateLimiter";
import { withMonitoring, captureError } from "./monitoring";
import { assertNotLocked } from "./systemStatus";

initializeApp();

setGlobalOptions({
  maxInstances: 10,
  // Available as process.env.SENTRY_DSN in every function without having
  // to list it per-function — same idea as RESEND_API_KEY/SECURE_STRIPE_KEY
  // below, just applied globally since monitoring should cover everything.
  secrets: ["SENTRY_DSN"],
});

// Always read from SECURE_STRIPE_KEY which will be bound via Firebase Secrets
const getStripe = () => {
  const Stripe = require("stripe");
  return new Stripe(process.env.SECURE_STRIPE_KEY || "");
};

const getDb = () => {
  const { getFirestore } = require("firebase-admin/firestore");
  return getFirestore();
};

const getRtdb = () => {
  const { getDatabase } = require("firebase-admin/database");
  return getDatabase();
};

// Notification channel id. Must match the one created client-side in
// src/services/pushNotifications.ts and declared in AndroidManifest.xml —
// if it doesn't, Android files the push under a channel the user can't
// manage and it arrives silently.
const PUSH_CHANNEL_ID = "malvin_default";

interface PushPayload {
  title: string;
  body: string;
  /** Routed to the app in the data payload so it can deep-link on tap. */
  type?: string;
  data?: Record<string, string>;
}

/**
 * Single send path for every push in the app.
 *
 * Sound has to be requested explicitly per-message: FCM defaults to a silent
 * notification, and Android only plays audio when the message names a sound
 * AND lands on a channel whose importance is HIGH. Priority "high" is what
 * gets it delivered promptly while the device is dozing, which matters for
 * "an order just came in".
 *
 * Tokens live on customers/{uid} regardless of whether that account is a
 * shopper or a merchant — registerPushNotifications() writes there for both.
 */
async function sendPushToUser(uid: string, payload: PushPayload): Promise<boolean> {
  if (!uid) return false;

  const db = getDb();
  const snap = await db.collection("customers").doc(uid).get();
  const token = snap.data()?.pushToken;

  if (!token) {
    console.log(`No push token for ${uid} — skipping push, in-app bell still works.`);
    return false;
  }

  const { getMessaging } = require("firebase-admin/messaging");

  try {
    await getMessaging().send({
      token,
      notification: { title: payload.title, body: payload.body },
      data: { type: payload.type || "", ...(payload.data || {}) },
      android: {
        priority: "high",
        notification: {
          channelId: PUSH_CHANNEL_ID,
          sound: "default",
          defaultVibrateTimings: true,
          visibility: "public",
        },
      },
      apns: {
        payload: { aps: { sound: "default" } },
      },
    });
    return true;
  } catch (err: any) {
    // A token can go stale (app uninstalled, permissions revoked, etc).
    // Firebase reports that as messaging/registration-token-not-registered
    // — clean it up so future notifications don't keep failing against a
    // dead token.
    if (err?.code === "messaging/registration-token-not-registered") {
      await db.collection("customers").doc(uid).update({
        pushToken: require("firebase-admin/firestore").FieldValue.delete(),
      });
      console.log(`Removed stale push token for ${uid}.`);
    } else {
      console.error(`Failed to send push to ${uid}:`, err);
    }
    return false;
  }
}

function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 1000, 64, "sha512").toString("hex");
}

// Constant-time comparison for hashed secrets (PINs, reset tokens). A plain
// `===`/`!==` string comparison can leak timing information about how many
// leading characters matched; this closes that off. Lengths are checked
// first since timingSafeEqual throws on mismatched buffer lengths rather
// than returning false.
function safeCompare(hexA: string, hexB: string): boolean {
  const bufA = Buffer.from(hexA, "hex");
  const bufB = Buffer.from(hexB, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Sends the PIN-reset code by email via Resend's HTTP API (no SDK needed —
// Cloud Functions' Node runtime has global fetch built in). Requires a
// RESEND_API_KEY secret to be set; see setup notes below. Throws on failure
// rather than silently succeeding, since a reset code nobody receives is
// worse than an honest error telling the merchant to try again.
async function sendResetEmail(toEmail: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Email service is not configured (RESEND_API_KEY secret is missing).");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // TODO: replace with an address on a domain you've verified in Resend.
      // Resend's shared "onboarding@resend.dev" sender only works for testing.
      from: "Malvin AI Security <malvinsecurity@malvinai.com>",
      to: toEmail,
      subject: "Your Malvin AI PIN reset code",
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 420px;">
          <p>Someone requested a PIN reset for your Malvin AI merchant account.</p>
          <p style="font-size: 32px; font-weight: 800; letter-spacing: 6px; margin: 24px 0;">${code}</p>
          <p>This code expires in 15 minutes and can only be used once.</p>
          <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email — your PIN has not been changed.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }
}

// Shared rate-limit rules for the money/credential-moving endpoints below.
// Numbers are deliberately generous for real users and tight for scripts —
// tune per your actual traffic once you have data.
const STRIPE_ONBOARDING_LIMIT: RateLimitRule = { name: "stripe_onboard", max: 10, windowMs: 60 * 60 * 1000 };
const PAYMENT_SESSION_LIMIT: RateLimitRule = { name: "payment_session", max: 20, windowMs: 10 * 60 * 1000 };
const PAYOUT_REQUEST_LIMIT: RateLimitRule = { name: "payout_request", max: 10, windowMs: 60 * 60 * 1000 };
const DELETE_ACCOUNT_LIMIT: RateLimitRule = { name: "delete_stripe_account", max: 5, windowMs: 60 * 60 * 1000 };

/*
=====================================
0A. AUTH ABUSE PROTECTION (BLOCKING FUNCTIONS)
=====================================
Account creation, sign-in, and (below) password reset all go straight from
the browser to Google's Identity Platform servers — the Firebase client SDK
calls sendPasswordResetEmail/signInWithEmailAndPassword/etc. directly, they
never touch our own Cloud Functions. That means a conventional "put a rate
limiter/WAF in front of the API" layer never sees these requests at all, so
it can't protect them.

Blocking functions are Google's actual hook for this: they run ON THE
IDENTITY PLATFORM SERVER, before an account is created or a sign-in is
finalized. A client can't skip them, can't see them, and can't call around
them — there is no frontend code path involved. Throwing here rejects the
create/sign-in outright.

One-time setup required (not code — a console step):
  Firebase Console → Authentication → Settings → "Upgrade to Identity
  Platform". This unlocks blocking functions; it does not change behavior
  for any existing user. Then `firebase deploy --only functions` as usual.

Also worth turning on while you're in that console, since it protects the
same direct-to-Google endpoints with zero code on either end: Identity
Platform → Settings → the built-in SMS/email abuse protection (adds
reCAPTCHA Enterprise scoring at Google's edge, invisible to your UI).
*/
const SIGNUP_LIMIT: RateLimitRule = { name: "signup", max: 5, windowMs: 60 * 60 * 1000 }; // 5 new accounts / IP / hour
const SIGNIN_LIMIT: RateLimitRule = { name: "signin", max: 20, windowMs: 10 * 60 * 1000 }; // 20 successful sign-ins / IP / 10 min

export const blockAbusiveSignups = beforeUserCreated(async (event) => {
  const ip = event.ipAddress || "unknown";
  try {
    await enforceRateLimit({ ip }, [SIGNUP_LIMIT]);
  } catch (err) {
    captureError(err, { scope: "blockAbusiveSignups", ip });
    throw err;
  }
});

export const guardSignIns = beforeUserSignedIn(async (event) => {
  const ip = event.ipAddress || "unknown";
  const uid = event.data?.uid;
  if (!uid) return; // no user record on the event — nothing to key a bucket on, let it through

  // This can't stop password *guessing* — Identity Platform already throttles
  // repeated failed attempts on its own before this hook ever fires, and a
  // wrong password never reaches beforeUserSignedIn since no sign-in
  // succeeded. What this does stop is rapid automated re-logins and
  // "credential stuffing succeeded, now hammer the session" from one IP.
  try {
    await enforceRateLimit({ ip, uid }, [SIGNIN_LIMIT]);
  } catch (err) {
    captureError(err, { scope: "guardSignIns", ip, uid });
    throw err;
  }
});

/*
=====================================
0B. SECURE PASSWORD RESET REQUEST
=====================================
Replaces the frontend's direct sendPasswordResetEmail(auth, email) call.
That call goes straight to Google's Auth REST API and can't be rate-limited
by us. This callable is what the frontend should call instead: we enforce
the limit here, then mint the reset link ourselves with the Admin SDK and
email it — same outcome for the user, but with a server-side cooldown that
isn't visible or reachable from the browser.
*/
const PASSWORD_RESET_LIMIT_EMAIL: RateLimitRule = { name: "pwreset_email", max: 3, windowMs: 15 * 60 * 1000 };
const PASSWORD_RESET_LIMIT_IP: RateLimitRule = { name: "pwreset_ip", max: 10, windowMs: 15 * 60 * 1000 };
// Generous — this fires once per store a signed-in customer opens, which
// can legitimately happen many times in a normal browsing session (Front.tsx
// re-mounts StoreFront on every tap). It's still a real limit so a runaway
// client bug can't hammer token minting indefinitely.
const STOREFRONT_TOKEN_LIMIT: RateLimitRule = { name: "storefront_token", max: 120, windowMs: 10 * 60 * 1000 };

async function sendPasswordResetEmailViaResend(toEmail: string, resetLink: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Email service is not configured (RESEND_API_KEY secret is missing).");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Malvin AI Security <malvinsecurity@malvinai.com>",
      to: toEmail,
      subject: "Reset your Malvin AI password",
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 420px;">
          <p>We received a request to reset your Malvin AI account password.</p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#0066ff;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">
              Reset your password
            </a>
          </p>
          <p style="color: #888; font-size: 13px;">This link expires soon and can only be used once. If you didn't request this, you can safely ignore this email — your password has not been changed.</p>
        </div>
      `,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }
}

export const requestAccountPasswordReset = onCall(
  { secrets: ["RESEND_API_KEY"] },
  withMonitoring(async (request) => {
    const { email } = (request.data || {}) as { email?: string };
    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new HttpsError("invalid-argument", "A valid email address is required.");
    }

    const ip = getClientIp(request.rawRequest);
    await enforceRateLimit(
      { ip, subject: email },
      [PASSWORD_RESET_LIMIT_EMAIL, PASSWORD_RESET_LIMIT_IP]
    );

    // Always return the same success response regardless of whether the
    // account exists, so this endpoint can't be used to enumerate
    // registered emails.
    try {
      const { getAuth } = require("firebase-admin/auth");
      const link = await getAuth().generatePasswordResetLink(email);
      await sendPasswordResetEmailViaResend(email, link);
    } catch (err: any) {
      if (err?.code !== "auth/user-not-found") {
        captureError(err, { scope: "requestAccountPasswordReset" });
      }
    }

    return { success: true, message: "If an account exists for that email, a reset link has been sent." };
  })
);

/*
=====================================
MINT STOREFRONT AUTH TOKEN
=====================================
StoreFront.tsx's <iframe> loads a store from stores.malvinai.com — a
genuinely different origin than this app shell, by design (see the long
comment on that <iframe> for why). Firebase Auth sessions live in per-origin
browser storage, so the customer's real, signed-in session on THIS origin
does not exist on stores.malvinai.com at all; the store only ever received
a bare uid/email over postMessage, which is just data, not proof of
anything — Firestore's security rules correctly refuse to trust a client
telling it "I am this uid" with nothing backing that claim, hence
"Missing or insufficient permissions" on every scoped query the store runs.

This callable is what fixes that properly: called from the PARENT (this
shell, where request.auth is the customer's real, already-verified
session), it mints a short-lived Firebase custom token for that same uid.
StoreFront.tsx sends that token down to the child over the existing
handshake postMessage; the store calls signInWithCustomToken() with it on
its OWN local `auth` instance, which gives it a real, valid Firebase Auth
session on stores.malvinai.com too — satisfying request.auth.uid checks
same as if they'd signed in there directly, without ever exposing a
password or long-lived credential to the iframe.
*/
export const mintStorefrontToken = onCall(withMonitoring(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "You must be signed in to open a store.");
  }

  await enforceRateLimit(
    { ip: getClientIp(request.rawRequest), uid: request.auth.uid },
    [STOREFRONT_TOKEN_LIMIT]
  );

  const { getAuth } = require("firebase-admin/auth");
  // No extra custom claims — the store only needs proof of *which* uid this
  // is, not an escalated permission set. Firestore rules apply exactly the
  // same as they would for a native sign-in under that uid.
  const token = await getAuth().createCustomToken(request.auth.uid);
  return { token };
}));

/*
=====================================
1. CREATE STRIPE CONNECT ACCOUNT
=====================================
*/
export const createBusinessStripeAccount = onCall(
  { secrets: ["SECURE_STRIPE_KEY"] },
  withMonitoring(async (request) => {
    await assertNotLocked("business");
    if (!process.env.SECURE_STRIPE_KEY) {
      throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
    }
    const stripe = getStripe();
    const db = getDb();

    const { email, businessId, merchantType } = request.data;
    if (!email || !businessId || !merchantType) { 
      throw new HttpsError("invalid-argument", "Email, businessId, and merchantType are required"); 
    }

    await enforceRateLimit(
      { ip: getClientIp(request.rawRequest), uid: request.auth?.uid, subject: businessId },
      [STRIPE_ONBOARDING_LIMIT]
    );

    const targetCollection = merchantType === "food" ? "restaurantprofile" : merchantType === "hotel" ? "hotels" : "salons";

    // 🟢 Wrapped so real Stripe/Firestore errors reach the client instead of
    // being swallowed into a generic "INTERNAL" by Firebase Functions.
    try {
      const account = await stripe.accounts.create({
        type: "express",
        country: "DE",
        email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } }
      });

      // 🟢 SAFE FIX: Use set with merge: true instead of update to prevent crashes on missing docs
      await db.collection(targetCollection).doc(businessId).set({
        stripeAccountId: account.id,
        stripeOnboarded: false,
        charges_enabled: false,
        payouts_enabled: false,
      }, { merge: true });

      return { stripeAccountId: account.id };
    } catch (err: any) {
      console.error("createBusinessStripeAccount failed:", err);
      throw new HttpsError(
        "internal",
        err?.raw?.message || err?.message || "Failed to create the Stripe connected account."
      );
    }
  })
);

/*
=====================================
2. CREATE ONBOARDING LINK
=====================================
*/
export const createStripeOnboardingLink = onCall(
  { secrets: ["SECURE_STRIPE_KEY"] }, // 🟢 Added secure secret binding
  withMonitoring(async (request) => {
    await assertNotLocked("business");
    if (!process.env.SECURE_STRIPE_KEY) {
      throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
    }
    const stripe = getStripe();

    const { stripeAccountId } = request.data;
    if (!stripeAccountId) { throw new HttpsError("invalid-argument", "Stripe account missing"); }

    await enforceRateLimit(
      { ip: getClientIp(request.rawRequest), uid: request.auth?.uid, subject: stripeAccountId },
      [STRIPE_ONBOARDING_LIMIT]
    );

    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: "http://malvinai.com/stripe-success",
      return_url: "http://malvinai.com/stripe-success",
      type: "account_onboarding"
    });

    return { url: link.url };
  })
);

/*
=====================================
3. CHECK ACCOUNT STATUS
=====================================
*/
export const checkStripeAccount = onCall(
  { secrets: ["SECURE_STRIPE_KEY"] }, // 🟢 Added secure secret binding
  async (request) => {
    if (!process.env.SECURE_STRIPE_KEY) {
      throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
    }
    const stripe = getStripe();
    const db = getDb();

    const { stripeAccountId, businessId, merchantType } = request.data;
    if (!stripeAccountId || !businessId || !merchantType) {
      throw new HttpsError("invalid-argument", "Stripe account ID, Business ID, and Merchant Type are required.");
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);
    const targetCollection = merchantType === "food" ? "restaurantprofile" : merchantType === "hotel" ? "hotels" : "salons";

    // 🟢 Keep database keys perfectly aligned with createDirectPaymentSession validator (snake_case)
    await db.collection(targetCollection).doc(businessId).update({
      stripeOnboarded: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled
    });

    return {
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled
    };
  }
);

/*
=====================================
4. CREATE DIRECT PAYMENT SESSION
=====================================
*/
export const createDirectPaymentSession = onCall(
  { secrets: ["SECURE_STRIPE_KEY"] }, 
  withMonitoring(async (request) => {
    if (!process.env.SECURE_STRIPE_KEY) {
      throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
    }
    const stripe = getStripe();
    const db = getDb();

    const { amount, targetBusinessUid, merchantType, appointmentDetails } = request.data;
    const customerUid = request.auth?.uid;

    if (!customerUid) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    if (!amount || amount <= 0 || !targetBusinessUid || !merchantType) {
      throw new HttpsError("invalid-argument", "Missing required transaction parameters.");
    }

    await assertNotLocked("stores");
    await enforceRateLimit(
      { ip: getClientIp(request.rawRequest), uid: customerUid },
      [PAYMENT_SESSION_LIMIT]
    );

    const isFood = merchantType === "food";
    const isHotel = merchantType === "hotel";
    const isService = merchantType === "service";
    const targetCollection = isFood ? "restaurantprofile" : isHotel ? "hotels" : isService ? "serviceProviders" : "salons";
    const businessDoc = await db.collection(targetCollection).doc(targetBusinessUid).get();

    if (!businessDoc.exists) {
      throw new HttpsError("not-found", "Business profile not found.");
    }

    const businessData = businessDoc.data();
    const stripeAccountId = businessData?.stripeAccountId;
    // Fallback check to let you accept payments in test mode as long as an ID exists
    const isMerchantReady = businessData?.stripeOnboarded || (stripeAccountId && process.env.SECURE_STRIPE_KEY?.startsWith("sk_test"));

    if (!stripeAccountId || !isMerchantReady) {
      throw new HttpsError("failed-precondition", "This merchant is not ready to accept payments yet.");
    }

    const amountInCents = Math.round(amount * 100);
    const applicationFeeInCents = Math.round(amountInCents * 0.02); // Your 2% cut

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: businessData?.brandName || businessData?.name || businessData?.salonName || businessData?.hotelName || businessData?.businessName || "Malvin Service Payment",
              description: `Direct payment via Malvin App`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: applicationFeeInCents,
        transfer_data: {
          destination: stripeAccountId,
        },
      },
      metadata: {
        userId: customerUid,
        businessId: targetBusinessUid,
        merchantType: merchantType,
        amount: amount.toString(),
        appointmentDetails: JSON.stringify(appointmentDetails || {}),
        type: "direct_payment"
      },
      success_url: "https://malvinai.com/?checkout=success",
      cancel_url: "https://malvinai.com/?checkout=cancel",
    });

    return { url: session.url };
  })
);



/*
=====================================
5. STRIPE WEBHOOK LISTENER (DIRECT PAYMENTS)
=====================================
*/
export const stripeWebhook = onRequest(
  { cors: true, secrets: ["SECURE_STRIPE_KEY", "SECURE_WEBHOOK_SECRET"] }, 
  async (req, res) => {
    const { FieldValue } = require("firebase-admin/firestore");
    const stripe = new (require("stripe"))(process.env.SECURE_STRIPE_KEY || ""); 
    const db = getDb();

    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.SECURE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent((req as any).rawBody, sig!, endpointSecret!);
    } catch (err: any) {
      console.error(`Webhook signature verification failed:`, err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const type = session.metadata?.type;

      if (type === "direct_payment") {
        const userId = session.metadata?.userId;
        const businessId = session.metadata?.businessId;
        const merchantType = session.metadata?.merchantType;
        const amount = parseFloat(session.metadata?.amount || "0");
        const appointmentDetails = JSON.parse(session.metadata?.appointmentDetails || "{}");

        if (userId && businessId && merchantType && amount > 0) {
          const isFood = merchantType === "food";
          const userDocRef = db.collection("users").doc(userId);
          const batch = db.batch();

          if (isFood) {
            // 🍔 FOOD FLOW: Save order directly in flat root 'orders' collection
            const orderRef = db.collection("orders").doc();
            const fourDigitPin = Math.floor(1000 + Math.random() * 9000).toString();

            batch.set(orderRef, {
              restaurantUid: businessId,
              customerName: appointmentDetails?.customerName || "Customer",
              pickupTime: appointmentDetails?.pickupTime || "",
              status: "pending",
              items: (appointmentDetails?.services || []).map((s: any) => ({
                name: s.serviceName || s.name,
                quantity: s.quantity || 1,
                price: s.price
              })),
              fourDigitCode: fourDigitPin,
              totalPaid: amount,
              paymentStatus: "paid",
              userMobilityStatus: appointmentDetails?.userMobilityStatus || "home",
              tableNumber: appointmentDetails?.tableNumber || "",
              customerUid: userId,
              createdAt: new Date().toISOString()
            });

          } else if (merchantType === "hotel") {
            // 🏨 HOTEL FLOW: the reservation was already staged client-side
            // (status: "held", paymentStatus: false, availableUnits already
            // decremented) before the Stripe redirect — see hotelStore.tsx's
            // confirmReservation(). Payment confirmation here is an UPDATE
            // of that existing doc, not a new record, keyed off the
            // reservationId carried through in appointmentDetails.
            const reservationId = appointmentDetails?.reservationId;
            if (reservationId) {
              const reservationRef = db
                .collection("customers").doc(userId)
                .collection("hotelReservations").doc(reservationId);

              batch.update(reservationRef, {
                status: "confirmed",
                paymentStatus: true,
                paidAmount: amount,
                confirmedAt: FieldValue.serverTimestamp()
              });
            } else {
              console.error("Hotel direct payment webhook fired with no reservationId in metadata — nothing to confirm.");
            }

          } else if (merchantType === "service") {
            // 🛠 SERVICE FLOW: same shape as hotel — the request/quote
            // already exists on both trees (business's job board +
            // customer's receipt, see utils/serviceRequests.ts), so
            // payment confirmation is an UPDATE of both, keyed off the
            // requestId carried through in appointmentDetails. Both copies
            // are updated so the business dashboard's job board and the
            // customer's receipt drawer never disagree on status.
            const requestId = appointmentDetails?.requestId;
            if (requestId) {
              const customerReceiptRef = db
                .collection("customers").doc(userId)
                .collection("serviceReceipts").doc(requestId);
              const businessRequestRef = db
                .collection("serviceProviders").doc(businessId)
                .collection("serviceRequests").doc(requestId);

              batch.update(customerReceiptRef, {
                status: "paid",
                paymentStatus: true,
                paidAmount: amount,
                paidAt: FieldValue.serverTimestamp()
              });
              batch.update(businessRequestRef, {
                status: "paid",
                paidAmount: amount,
                paidAt: FieldValue.serverTimestamp()
              });
            } else {
              console.error("Service direct payment webhook fired with no requestId in metadata — nothing to confirm.");
            }

          } else {
            // 💇 SALON FLOW: Maintain nested collection flow
            const appointmentRef = db.collection("salonAppointments").doc(userId).collection("appointments").doc();
            const ticketId = `SAL-${Math.floor(100000 + Math.random() * 900000)}`;

            batch.set(appointmentRef, {
              ticketId: ticketId,
              businessId: businessId,
              services: appointmentDetails?.services || [],
              stylist: appointmentDetails?.stylist || "Any available",
              duration: appointmentDetails?.duration || 0,
              totalPaid: amount,
              status: "paid",
              merchantType: merchantType,
              createdAt: FieldValue.serverTimestamp()
            });
          }

          // Log payment transaction inside the customer's wallet history
          const txRef = userDocRef.collection("walletTransactions").doc();
          batch.set(txRef, {
            storeName: isFood ? "Food Order" : merchantType === "hotel" ? "Hotel Reservation" : "Direct Payment",
            amount: amount,
            type: "spent",
            timestamp: FieldValue.serverTimestamp()
          });

          await batch.commit();
          console.log(`Successfully processed direct payment of €${amount} for user ${userId}`);
        }
      }
    }

    res.json({ received: true });
  }
);


/*
=====================================
6. SECURE BALANCE PAYMENT PROCESSOR
=====================================
*/
export const processPayment = onCall({ cors: true }, withMonitoring(async (request) => {
  await assertNotLocked("stores");
  const { targetBusinessUid, amount, fallbackCustomerUid, appointmentDetails, merchantType } = request.data;
  
  const customerUid = request.auth?.uid || fallbackCustomerUid;

  if (!customerUid) {
    throw new HttpsError("unauthenticated", "Authentication identity context is missing.");
  }

  await enforceRateLimit(
    { ip: getClientIp(request.rawRequest), uid: customerUid },
    [PAYMENT_SESSION_LIMIT]
  );

  if (!targetBusinessUid || typeof amount !== "number" || amount <= 0) {
    throw new HttpsError("invalid-argument", "A valid business UID and payment amount are required.");
  }

  const db = getDb();
  const { FieldValue, Transaction } = require("firebase-admin/firestore");

  const userRef = db.collection("users").doc(customerUid);
  const txRef = userRef.collection("walletTransactions").doc();
  
  const isFood = merchantType === "food";
  const targetCollection = isFood ? "restaurantprofile" : "salons";
  const appointmentCollection = isFood ? "foodOrders" : "salonAppointments";

  const businessRef = db.collection(targetCollection).doc(targetBusinessUid);
  const ticketId = isFood 
    ? `FOOD-${Math.floor(100000 + Math.random() * 900000)}` 
    : `SAL-${Math.floor(100000 + Math.random() * 900000)}`;

  // --- Calculate 2% Application Fee Deduction ---
  const companyCommissionRate = 0.02; // 2% 
  const appFeeAmount = parseFloat((amount * companyCommissionRate).toFixed(2));
  const merchantCreditAmount = parseFloat((amount - appFeeAmount).toFixed(2));

  try {
    await db.runTransaction(async (transaction: typeof Transaction) => {
      const userDoc = await transaction.get(userRef);
      const businessDoc = await transaction.get(businessRef);

      if (!userDoc.exists || !businessDoc.exists) {
        throw new HttpsError("not-found", `Target user profile or merchant directory node (${targetCollection}) is missing.`);
      }

      const userData = userDoc.data();
      const currentCustomerBalance = userData?.wallet?.balance ?? 0;

      if (currentCustomerBalance < amount) {
        throw new HttpsError("failed-precondition", "Insufficient client wallet funds available.");
      }

      // 1. Deduct full payment amount from customer wallet
      transaction.update(userRef, { "wallet.balance": FieldValue.increment(-amount) });
      
      // 2. Add remaining 98% balance to the business wallet account
      transaction.update(businessRef, { walletBalance: FieldValue.increment(merchantCreditAmount) });

      // 3. Optional: Record platform fee metrics inside an admin ledger
      const platformEarningsRef = db.collection("platformFees").doc();
      transaction.set(platformEarningsRef, {
        sourceBusinessId: targetBusinessUid,
        sourceCustomerId: customerUid,
        originalAmount: amount,
        feeCharged: appFeeAmount,
        timestamp: FieldValue.serverTimestamp()
      });

      // 4. Save user transaction statement logs with accurate details
      transaction.set(txRef, {
        storeName: businessDoc.data()?.brandName || businessDoc.data()?.name || businessDoc.data()?.salonName || "Malvin Storefront Platform",
        amount: amount,
        type: "spent",
        timestamp: FieldValue.serverTimestamp(),
      });

      // 5. Secure ticket generation / flat order creation
      if (isFood) {
        // 🍔 FOOD ORDER: Save directly to the 'orders' root collection
        const orderRef = db.collection("orders").doc();
        const fourDigitPin = Math.floor(1000 + Math.random() * 9000).toString();

        transaction.set(orderRef, {
          restaurantUid: targetBusinessUid,
          customerName: appointmentDetails?.customerName || userData?.name || "Customer",
          pickupTime: appointmentDetails?.pickupTime || "",
          status: "pending",
          items: (appointmentDetails?.services || []).map((s: any) => ({
            name: s.serviceName || s.name,
            quantity: s.quantity || 1,
            price: s.price
          })),
          fourDigitCode: fourDigitPin,
          totalPaid: amount,
          paymentStatus: "paid",
          userMobilityStatus: appointmentDetails?.userMobilityStatus || "home",
          tableNumber: appointmentDetails?.tableNumber || "",
          customerUid: customerUid,
          createdAt: new Date().toISOString()
        });
      } else {
        // 💇 SALON BOOKING: Maintain nested collection flow
        const appointmentRef = db.collection(appointmentCollection).doc(customerUid).collection("appointments").doc();
        
        transaction.set(appointmentRef, {
          ticketId: ticketId,
          businessId: targetBusinessUid,
          services: appointmentDetails?.services || [],
          stylist: appointmentDetails?.stylist || "Any available",
          duration: appointmentDetails?.duration || 0,
          totalPaid: amount,
          status: "paid",
          merchantType: merchantType,
          createdAt: FieldValue.serverTimestamp()
        });
      }
    });

    return { success: true, ticketId };
  } catch (error: any) {
    console.error("Internal billing failure trace:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "The ledger settlement failed to complete.");
  }
}));

/*
=====================================
7. SECURE ACCOUNT WITHDRAWAL (PAYOUT)
=====================================
*/
export const requestPayout = onCall(
  { secrets: ["SECURE_STRIPE_KEY"] },
  withMonitoring(async (request) => {
    await assertNotLocked("business");
    if (!process.env.SECURE_STRIPE_KEY) {
      throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
    }

    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication is required to initiate a payout.");
    }

    await enforceRateLimit({ ip: getClientIp(request.rawRequest), uid }, [PAYOUT_REQUEST_LIMIT]);

    const { amount, pin, merchantType } = request.data;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      throw new HttpsError("invalid-argument", "A valid positive withdrawal amount is required.");
    }
    if (!pin || typeof pin !== "string" || pin.length !== 4) {
      throw new HttpsError("invalid-argument", "A valid 4-digit PIN is required.");
    }

    const stripe = getStripe();
    const db = getDb();
    const { FieldValue, Transaction } = require("firebase-admin/firestore");

    const isFood = merchantType === "food";
    const targetCollection = isFood ? "restaurantprofile" : "salons";
    
    const businessDocRef = db.collection(targetCollection).doc(uid);
    const securityRef = businessDocRef.collection("private").doc("security");

    const PAYOUT_MAX_ATTEMPTS = 5;
    const PAYOUT_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

    try {
      // 1. Validate permissions, credentials, and pull Stripe details securely.
      // IMPORTANT: this transaction must never throw on a "wrong PIN" or
      // "locked out" outcome — throwing inside a Firestore transaction rolls
      // back every write it staged, which would silently discard the very
      // attempt-count/lockout state we need to persist. Instead it always
      // returns a status object, and the caller throws afterwards, once the
      // transaction has already committed.
      const outcome: any = await db.runTransaction(async (transaction: typeof Transaction) => {
        const docSnap = await transaction.get(businessDocRef);
        const securitySnap = await transaction.get(securityRef);

        if (!docSnap.exists) {
          return { ok: false, code: "not-found", message: "Business profile not found." };
        }
        if (!securitySnap.exists) {
          return { ok: false, code: "failed-precondition", message: "Security PIN setup is incomplete." };
        }

        const data = docSnap.data();
        const securityData = securitySnap.data()!;

        const stripeAccountId = data?.stripeAccountId;
        const payoutsEnabled = data?.payoutsEnabled ?? data?.payouts_enabled;

        // Already locked out from a prior run of too many wrong PINs?
        const lockedUntil = securityData.payoutLockedUntil || 0;
        if (lockedUntil > Date.now()) {
          const minutesLeft = Math.ceil((lockedUntil - Date.now()) / 60000);
          return {
            ok: false,
            code: "resource-exhausted",
            message: `Too many incorrect PIN attempts. Try again in ${minutesLeft} minute(s).`,
          };
        }

        const { hashedPin, salt } = securityData;
        const incomingPinHash = hashPin(pin, salt);
        const pinMatches = !!hashedPin && safeCompare(incomingPinHash, hashedPin);

        if (!pinMatches) {
          const attempts = (securityData.payoutPinAttempts || 0) + 1;
          const update: Record<string, unknown> = { payoutPinAttempts: attempts };
          const lockingNow = attempts >= PAYOUT_MAX_ATTEMPTS;
          if (lockingNow) {
            update.payoutLockedUntil = Date.now() + PAYOUT_LOCKOUT_MS;
            update.payoutPinAttempts = 0; // the lockout itself is now the gate
          }
          transaction.set(securityRef, update, { merge: true });

          return lockingNow
            ? { ok: false, code: "resource-exhausted", message: `Too many incorrect PIN attempts. Try again in ${PAYOUT_LOCKOUT_MS / 60000} minutes.` }
            : { ok: false, code: "permission-denied", message: `Incorrect secret PIN. ${PAYOUT_MAX_ATTEMPTS - attempts} attempt(s) remaining.` };
        }

        // Correct PIN — clear any accumulated attempt count.
        if (securityData.payoutPinAttempts) {
          transaction.set(securityRef, { payoutPinAttempts: 0 }, { merge: true });
        }

        if (!stripeAccountId || !payoutsEnabled) {
          return { ok: false, code: "failed-precondition", message: "Stripe payout account is not fully setup." };
        }

        return { ok: true, stripeAccountId };
      });

      if (!outcome.ok) {
        throw new HttpsError(outcome.code, outcome.message);
      }
      const result = outcome;

      // 🟢 2. Fetch the live Stripe available balance instead of trusting Firestore's walletBalance counter
      const stripeBalance = await stripe.balance.retrieve({}, {
        stripeAccount: result.stripeAccountId,
      });

      // Sum up available balance from stripe in Euros (Stripe works in cents)
      const liveAvailableBalance = stripeBalance.available.reduce((sum: number, b: any) => sum + b.amount, 0) / 100;

      // 🟢 3. Run validation guard against the actual live Stripe balance
      if (liveAvailableBalance < amount) {
        throw new HttpsError("failed-precondition", `Insufficient funds in your wallet. Available: €${liveAvailableBalance.toFixed(2)}`);
      }

      // 4. Transfer authorized balance to their Stripe Connect account
      const amountInCents = Math.round(amount * 100);
      const transfer = await stripe.transfers.create({
        amount: amountInCents,
        currency: "eur",
        destination: result.stripeAccountId,
        description: `Payout withdrawal for UID: ${uid}`,
      });

      // 5. Commit state details log batch safely
      const batch = db.batch();
      batch.update(businessDocRef, {
        updatedAt: FieldValue.serverTimestamp(),
      });

      const txRef = businessDocRef.collection("walletTransactions").doc();
      batch.set(txRef, {
        storeName: "Wallet Withdrawal",
        amount: amount,
        type: "payout",
        stripeTransferId: transfer.id,
        timestamp: FieldValue.serverTimestamp(),
      });

      await batch.commit();

      return { 
        success: true, 
        message: `Successfully transferred €${amount} to your bank account.`,
        transferId: transfer.id 
      };

    } catch (error: any) {
      console.error("Payout transaction failure trace:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message || "An error occurred during payment extraction.");
    }
  })
);

/*
=====================================
8. REQUEST PIN RESET (V2)
=====================================
*/
const RESET_REQUEST_COOLDOWN_MS = 60 * 1000; // 1 request per minute per merchant

export const requestPinReset = onCall(
  { secrets: ["RESEND_API_KEY"] },
  withMonitoring(async (request) => {
    await assertNotLocked("business");
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication context is missing.");
    }

    // The per-merchant 60s cooldown below already stops one account from
    // spamming itself. This adds an IP layer on top so one attacker can't
    // work around that by cycling through many merchant accounts from the
    // same machine.
    await enforceRateLimit(
      { ip: getClientIp(request.rawRequest), uid },
      [{ name: "pin_reset_request", max: 5, windowMs: 15 * 60 * 1000 }]
    );

    const { merchantType } = request.data;
    const targetCollection = merchantType === "food" ? "restaurantprofile" : merchantType === "hotel" ? "hotels" : "salons";

    const { getAuth } = require("firebase-admin/auth");
    const db = getDb();
    const securityRef = db.collection(targetCollection).doc(uid).collection("private").doc("security");

    const userRecord = await getAuth().getUser(uid);
    const email = userRecord.email;

    if (!email) {
      throw new HttpsError("failed-precondition", "No email associated with this merchant account.");
    }

    // Rate-limit: stops both email-bombing the merchant and an attacker
    // repeatedly minting fresh tokens to widen their guessing window.
    const existingSnap = await securityRef.get();
    const existing = existingSnap.exists ? existingSnap.data()! : {};
    const lastRequestedAt = existing.lastResetRequestAt || 0;
    if (Date.now() - lastRequestedAt < RESET_REQUEST_COOLDOWN_MS) {
      throw new HttpsError("resource-exhausted", "Please wait a minute before requesting another code.");
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenSalt = crypto.randomBytes(16).toString("hex");
    const hashedResetToken = hashPin(resetToken, tokenSalt);
    const expiresAt = Date.now() + 15 * 60 * 1000;

    // The token itself is hashed before storage — same treatment as the PIN
    // — so even a Firestore-level read of this doc (which should already be
    // admin-only per security rules) never exposes a usable code directly.
    await securityRef.set({
      hashedResetToken,
      resetTokenSalt: tokenSalt,
      tokenExpires: expiresAt,
      resetAttempts: 0,
      lastResetRequestAt: Date.now(),
    }, { merge: true });

    // Actually send it. If this throws, the caller gets a real error instead
    // of a false "check your email" message for a code that never arrived.
    await sendResetEmail(email, resetToken);

    return { success: true, message: "A secure reset code has been sent to your email." };
  })
);

/*
=====================================
9. CONFIRM PIN RESET (V2)
=====================================
*/
const RESET_TOKEN_MAX_ATTEMPTS = 5;

export const confirmPinReset = onCall(withMonitoring(async (request) => {
  await assertNotLocked("business");
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication context is missing.");
  }

  const { resetToken, newPin, merchantType } = request.data;
  if (!resetToken || !newPin || newPin.length !== 4) {
    throw new HttpsError("invalid-argument", "Valid validation token and a 4-digit PIN are required.");
  }

  const targetCollection = merchantType === "food" ? "restaurantprofile" : merchantType === "hotel" ? "hotels" : "salons";
  const db = getDb();
  const securityRef = db.collection(targetCollection).doc(uid).collection("private").doc("security");
  const securitySnap = await securityRef.get();

  if (!securitySnap.exists) {
    throw new HttpsError("not-found", "Security record missing.");
  }

  const { hashedResetToken, resetTokenSalt, tokenExpires, resetAttempts } = securitySnap.data()!;

  if (!hashedResetToken) {
    throw new HttpsError("failed-precondition", "No reset code has been requested.");
  }

  // A 6-digit code only has 1,000,000 combinations — without a hard cap on
  // guesses, it's brute-forceable well within the 15-minute expiry window.
  if ((resetAttempts || 0) >= RESET_TOKEN_MAX_ATTEMPTS) {
    throw new HttpsError("resource-exhausted", "Too many incorrect attempts. Please request a new code.");
  }

  const incomingTokenHash = hashPin(resetToken, resetTokenSalt);
  const tokenMatches = safeCompare(incomingTokenHash, hashedResetToken);
  const notExpired = Date.now() <= tokenExpires;

  if (!tokenMatches || !notExpired) {
    await securityRef.set({ resetAttempts: (resetAttempts || 0) + 1 }, { merge: true });
    throw new HttpsError("permission-denied", "The code is invalid or has expired.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPin = hashPin(newPin, salt);

  await securityRef.set({
    hashedPin,
    salt,
    hashedResetToken: null,
    resetTokenSalt: null,
    tokenExpires: null,
    resetAttempts: 0,
    // A PIN reset is a good moment to also clear any accumulated payout
    // lockout — the merchant just proved account ownership via email.
    payoutPinAttempts: 0,
    payoutLockedUntil: null,
  });

  return { success: true, message: "Security PIN updated successfully!" };
}));

/*
=====================================
10. INITIALIZE MERCHANT PIN (V2)
=====================================
*/
export const initializeMerchantPin = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication context is missing.");
  }

  const { pin, merchantType } = request.data;
  if (!pin || typeof pin !== "string" || pin.length !== 4) {
    throw new HttpsError("invalid-argument", "A valid 4-digit numeric PIN is required.");
  }

  const targetCollection = merchantType === "food" ? "restaurantprofile" : merchantType === "hotel" ? "hotels" : "salons";
  const db = getDb();
  const securityRef = db.collection(targetCollection).doc(uid).collection("private").doc("security");

  const securitySnap = await securityRef.get();
  if (securitySnap.exists && securitySnap.data()?.hashedPin) {
    throw new HttpsError("already-exists", "A security PIN is already established for this account.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPin = hashPin(pin, salt);

  await securityRef.set({
    hashedPin,
    salt,
    resetToken: null,
    tokenExpires: null
  }, { merge: true });

  return { success: true, message: "Security PIN initialized successfully!" };
});


/*
=====================================
11. GET LIVE STRIPE ACCOUNT BALANCE
=====================================
*/
export const getStripeAccountBalance = onCall(
  { secrets: ["SECURE_STRIPE_KEY"] },
  async (request) => {
    if (!process.env.SECURE_STRIPE_KEY) {
      throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
    }
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    const { merchantType } = request.data;
    const stripe = getStripe();
    const db = getDb();

    const targetCollection = merchantType === "food" ? "restaurantprofile" : merchantType === "hotel" ? "hotels" : "salons";
    const businessDoc = await db.collection(targetCollection).doc(uid).get();

    if (!businessDoc.exists) {
      throw new HttpsError("not-found", "Business profile not found.");
    }

    const businessData = businessDoc.data();
    const stripeAccountId = businessData?.stripeAccountId;

    if (!stripeAccountId) {
      return { availableBalance: 0, pendingBalance: 0, totalBalance: 0 };
    }

    try {
      // Ask Stripe for the balances specifically matching the connected merchant's account
      const balance = await stripe.balance.retrieve({}, {
        stripeAccount: stripeAccountId,
      });

      // Sum up the active balances (Stripe returns amounts in cents, so we divide by 100)
      const availableBalance = balance.available.reduce((sum: number, b: any) => sum + b.amount, 0) / 100;
      const pendingBalance = balance.pending.reduce((sum: number, b: any) => sum + b.amount, 0) / 100;

      return {
        availableBalance,
        pendingBalance,
        totalBalance: availableBalance + pendingBalance,
      };
    } catch (err: any) {
      console.error("Error retrieving Stripe balance:", err);
      throw new HttpsError("internal", `Failed to retrieve Stripe balance: ${err.message}`);
    }
  }
);

/*
=====================================
12. DELETE STRIPE CONNECT ACCOUNT
=====================================
*/
export const deleteStripeAccount = onCall(
  { secrets: ["SECURE_STRIPE_KEY"] },
  withMonitoring(async (request) => {
    if (!process.env.SECURE_STRIPE_KEY) {
      throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
    }

    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    await enforceRateLimit({ ip: getClientIp(request.rawRequest), uid }, [DELETE_ACCOUNT_LIMIT]);

    const { stripeAccountId } = request.data;
    if (!stripeAccountId) {
      return { success: true, message: "No Stripe account provided." };
    }

    const stripe = getStripe();

    try {
      // Permanently delete the connected account from Stripe
      const deleted = await stripe.accounts.del(stripeAccountId);
      console.log(`Successfully deleted Stripe Connect account ${stripeAccountId} for user ${uid}`);
      return { success: true, deleted };
    } catch (err: any) {
      console.error("Error deleting Stripe Connect account:", err);
      throw new HttpsError("internal", `Failed to delete Stripe account: ${err.message}`);
    }
  })
);

/*
=====================================
13. ONE-TIME MIGRATION: SPLIT MEMBER CONTACT DATA
=====================================
Moves email/contactNumber/startingDate off the public members/{id} document
and into members/{id}/private/contact, then strips those fields from the
public document.

RUN THIS ONCE, AS AN ADMIN, BEFORE deploying the new Firestore rule that
makes members/{id} publicly readable (`allow get: if true`). Until this has
run, any existing member still has their contact info sitting on the same
document that rule is about to open up — running this first closes that gap
before it's ever exposed.

Safe to re-run: any member already migrated (no legacy fields left on their
public doc) is skipped rather than touched again.
*/
function isAdminCaller(request: { auth?: { token?: Record<string, unknown> } }): boolean {
  const token = request.auth?.token;
  return !!token && (token.email === "kizzclover96@gmail.com" || token.role === "ADMIN");
}

export const migrateMemberContactData = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  if (!isAdminCaller(request)) {
    throw new HttpsError("permission-denied", "Admin access is required to run this migration.");
  }

  const db = getDb();
  const { FieldValue } = require("firebase-admin/firestore");
  const membersSnap = await db.collection("members").get();

  let migrated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const memberDoc of membersSnap.docs) {
    const data = memberDoc.data();
    const hasLegacyFields = "email" in data || "contactNumber" in data || "startingDate" in data;

    if (!hasLegacyFields) {
      skipped++;
      continue;
    }

    try {
      const contactRef = memberDoc.ref.collection("private").doc("contact");

      await contactRef.set({
        email: data.email || "",
        contactNumber: data.contactNumber || "",
        startingDate: data.startingDate || "",
      }, { merge: true });

      await memberDoc.ref.update({
        email: FieldValue.delete(),
        contactNumber: FieldValue.delete(),
        startingDate: FieldValue.delete(),
      });

      migrated++;
    } catch (err: any) {
      errors.push(`${memberDoc.id}: ${err.message}`);
    }
  }

  return {
    success: true,
    migrated,
    skipped,
    totalMembers: membersSnap.size,
    errors,
  };
});

/*
=====================================
14. PREMIUM CLAIMS SYNC (SELF-HEAL)
=====================================
Why this exists: `users/{uid}/tier` in Realtime Database is only ever
written by the signature-verified LemonSqueezy webhook, so it's a
trustworthy record — but a plain database read is still something every
screen would otherwise need its own listener for.

This mirrors that trusted value into a Firebase Auth *custom claim*
instead. Claims live inside the user's signed ID token, so the client can
trust `getIdTokenResult().claims.premium` directly — nothing it can
tamper with, since only `admin.auth().setCustomUserClaims()`, called from
trusted backend code, can ever change it.

The webhook sets this claim itself the moment a subscription event
arrives. This callable is the fallback the client triggers when the claim
isn't there yet — covers the brief race window right after checkout, and
lets pre-existing premium accounts self-heal into the claims system.

Safety: `uid` always comes from the verified auth token
(`request.auth.uid`), never from anything the client sends — a caller can
only ever resync *their own* status, never anyone else's.
*/
export const syncPremiumClaims = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in to check premium status.");
  }

  const uid = request.auth.uid;
  const rtdb = getRtdb();

  const snap = await rtdb.ref(`users/${uid}/tier`).get();
  const tier = snap.exists() ? snap.val() : "free";
  const isPremium = tier === "premium";

  const { getAuth } = require("firebase-admin/auth");
  const authAdmin = getAuth();
  const userRecord = await authAdmin.getUser(uid);
  const existingClaims = userRecord.customClaims || {};

  await authAdmin.setCustomUserClaims(uid, {
    ...existingClaims,
    premium: isPremium,
    tier,
  });

  return { premium: isPremium, tier };
});

/*
=====================================
15. SEND PUSH ON NEW NOTIFICATION
=====================================
The client's pushNotification() helper (see Notification.tsx) only ever
writes a document to customers/{uid}/notifications — it never talks to a
device directly. This trigger fires immediately after that write and is
the piece that actually delivers a push to the customer's phone: it reads
the device token saved by registerPushNotifications() (see
src/services/pushNotifications.ts) onto the customer's own doc, and sends
one FCM message.

Safe to fail loud rather than silently: if there's no token yet (customer
never opened the app on a native device, or hasn't granted permission),
this just logs and returns — the in-app notification bell still works
regardless, since that reads the Firestore doc directly and doesn't
depend on push delivery at all.
*/
export const sendPushOnNewNotification = onDocumentCreated(
  "customers/{uid}/notifications/{notificationId}",
  async (event) => {
    const uid = event.params.uid;
    const notification = event.data?.data();
    if (!notification) return;

    await sendPushToUser(uid, {
      title: notification.title || "Malvin AI",
      body: notification.message || "",
      type: notification.type || "",
    });
  }
);

/*
=====================================
MERCHANT ACTIVITY PUSHES
=====================================
Three triggers that fire the moment work lands on a merchant, plus one
scheduled digest for work that has been left sitting.

Where the data lives (taken from the dashboards that read it):
  orders        -> `orders`, tied to a business by `restaurantUid`
  appointments  -> `customers/{customerUid}/appointments/{id}`,
                   tied to a business by `businessId`
  chats         -> `conversations`, tied by `brandId`, with
                   `viewedByManager === false` meaning unread

All of these push to the business owner's auth uid, which is also the
document id of their `restaurantprofile` / `salons` profile doc.
*/

/** New order hits a restaurant's dashboard. */
export const notifyOnNewOrder = onDocumentCreated(
  "orders/{orderId}",
  async (event) => {
    const order = event.data?.data();
    const ownerUid = order?.restaurantUid;
    if (!ownerUid) return;

    const customer = order?.customerName ? ` from ${order.customerName}` : "";
    await sendPushToUser(ownerUid, {
      title: "New order received",
      body: `You have a new order${customer}. Open Malvin to accept it.`,
      type: "new_order",
      data: { orderId: event.params.orderId },
    });
  }
);

/** New booking hits a salon's dashboard. */
export const notifyOnNewAppointment = onDocumentCreated(
  "customers/{customerUid}/appointments/{appointmentId}",
  async (event) => {
    const appointment = event.data?.data();
    const ownerUid = appointment?.businessId;
    if (!ownerUid) return;

    const who = appointment?.customerName ? ` - ${appointment.customerName}` : "";
    const when = appointment?.time ? ` at ${appointment.time}` : "";
    await sendPushToUser(ownerUid, {
      title: "New appointment booked",
      body: `A new appointment was just booked${who}${when}.`,
      type: "new_appointment",
      data: { appointmentId: event.params.appointmentId },
    });
  }
);

/** Customer sends a chat message to a business. */
export const notifyOnNewChatMessage = onDocumentCreated(
  "conversations/{conversationId}/messages/{messageId}",
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    // Only the customer's side should alert the merchant, otherwise the
    // merchant gets pushed for their own replies.
    if (message.sender !== "customer") return;

    const db = getDb();
    const convoSnap = await db
      .collection("conversations")
      .doc(event.params.conversationId)
      .get();

    const ownerUid = message.brandId || convoSnap.data()?.brandId;
    if (!ownerUid) return;

    const preview = String(message.text || "").slice(0, 120);
    await sendPushToUser(ownerUid, {
      title: "New message from a customer",
      body: preview || "You have a new message.",
      type: "new_chat_message",
      data: { conversationId: event.params.conversationId },
    });
  }
);

/**
 * VINBACK — a scan report on a lost item.
 *
 * The finder (often a total stranger with no relationship to the owner) can
 * only write into vinbackTags/{tagId}/scans — Firestore rules don't allow
 * them anywhere near the owner's own customers/{ownerId}/notifications tree.
 * This trigger is what bridges the two: it reads the scan, looks up the
 * tag's owner, and writes the actual in-app notification server-side (Admin
 * SDK, so it isn't subject to those rules). That write is itself what
 * sendPushOnNewNotification above is listening for, so the real push rides
 * the existing pipeline for free — no separate sendPushToUser call needed
 * here.
 */
export const notifyOnVinbackScan = onDocumentCreated(
  "vinbackTags/{tagId}/scans/{scanId}",
  async (event) => {
    const scan = event.data?.data();
    const tagId = event.params.tagId;
    if (!scan?.ownerId) return;

    const db = getDb();
    const tagRef = db.collection("vinbackTags").doc(tagId);
    const tagSnap = await tagRef.get();
    const tag = tagSnap.data();
    if (!tag) return;

    const propertyName = tag.propertyName || "Your property";
    const location = scan.location || "an unknown location";
    const finder = scan.finderName ? ` by ${scan.finderName}` : "";
    const noteSuffix = scan.message ? ` Message: "${scan.message}"` : "";

    await db.collection("customers").doc(scan.ownerId).collection("notifications").add({
      type: "property_scanned",
      title: `${propertyName} was just scanned`,
      message: `Scanned at ${location}${finder}.${noteSuffix}`,
      read: false,
      createdAt: require("firebase-admin/firestore").FieldValue.serverTimestamp(),
    });

    // A finder actively reporting a "missing" item is someone offering to
    // return it — flip the tag to "found" so the owner immediately sees the
    // status change alongside the notification, and so the scan page stops
    // asking the next person who scans it to file a duplicate report. This
    // has to happen here (not client-side): a finder is never allowed to
    // update the tag directly, only the owner is — see the rules.
    if (tag.status === "missing") {
      await tagRef.update({ status: "found" });
    }
  }
);

interface PendingCounts {
  orders: number;
  appointments: number;
  chats: number;
  total: number;
}

/**
 * Counts work still waiting on a business.
 *
 * "Pending" mirrors how each dashboard already filters: an order counts until
 * it has been accepted/rejected/finished, an appointment counts while its
 * record still exists, and a conversation counts while viewedByManager is
 * false.
 */
async function countPendingWork(ownerUid: string): Promise<PendingCounts> {
  const db = getDb();
  const HANDLED = ["accepted", "rejected", "finished", "completed", "cancelled"];

  const [orderSnap, apptSnap, chatSnap] = await Promise.all([
    db.collection("orders").where("restaurantUid", "==", ownerUid).get(),
    db.collectionGroup("appointments").where("businessId", "==", ownerUid).get(),
    db
      .collection("conversations")
      .where("brandId", "==", ownerUid)
      .where("viewedByManager", "==", false)
      .get(),
  ]);

  // Status vocabulary differs between the food and retail dashboards, so
  // filter on "not yet handled" rather than matching one specific value.
  const orders = orderSnap.docs.filter((d: any) => {
    const status = String(d.data()?.status || "").toLowerCase();
    return !HANDLED.includes(status);
  }).length;

  const appointments = apptSnap.size;
  const chats = chatSnap.size;

  return { orders, appointments, chats, total: orders + appointments + chats };
}

/** Turns the counts into one readable line. */
export function describePendingWork(counts: PendingCounts): string {
  const parts: string[] = [];
  if (counts.orders) {
    parts.push(`${counts.orders} order${counts.orders === 1 ? "" : "s"}`);
  }
  if (counts.appointments) {
    parts.push(`${counts.appointments} appointment${counts.appointments === 1 ? "" : "s"}`);
  }
  if (counts.chats) {
    parts.push(`${counts.chats} unread chat${counts.chats === 1 ? "" : "s"}`);
  }

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const last = parts.pop();
  return `${parts.join(", ")} and ${last}`;
}

/**
 * Hourly nudge for anything still sitting in a merchant's dashboard.
 *
 * This runs server-side on purpose. A repeating *local* notification would
 * also fire with the app closed, but its text would be frozen at whatever was
 * true when it was scheduled - it cannot re-count. Running it here means the
 * numbers are right at the moment the notification lands, and it stops on its
 * own once the queue is clear.
 *
 * Needs Cloud Scheduler, which requires the Blaze plan.
 */
export const remindPendingWork = onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "Europe/Berlin",
    // Fanning out over every business is the slow part; give it room.
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const db = getDb();

    // A business owner's uid is the id of their profile doc.
    const [restaurants, salons] = await Promise.all([
      db.collection("restaurantprofile").get(),
      db.collection("salons").get(),
    ]);

    const ownerUids = new Set<string>();
    restaurants.docs.forEach((d: any) => ownerUids.add(d.id));
    salons.docs.forEach((d: any) => ownerUids.add(d.id));

    console.log(`remindPendingWork: checking ${ownerUids.size} businesses.`);

    let notified = 0;
    const uids = Array.from(ownerUids);
    const BATCH = 10;

    // Batched rather than one giant Promise.all, so a large merchant base
    // cannot exhaust the Firestore connection pool.
    for (let i = 0; i < uids.length; i += BATCH) {
      const batch = uids.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (uid) => {
          try {
            const counts = await countPendingWork(uid);
            if (counts.total === 0) return;

            const sent = await sendPushToUser(uid, {
              title: "You still have work waiting",
              body: `${describePendingWork(counts)} still need your attention.`,
              type: "pending_work",
              data: {
                orders: String(counts.orders),
                appointments: String(counts.appointments),
                chats: String(counts.chats),
              },
            });
            if (sent) notified++;
          } catch (err) {
            console.error(`remindPendingWork: failed for ${uid}:`, err);
          }
        })
      );
    }

    console.log(`remindPendingWork: notified ${notified} businesses.`);
  }
);

/**
 * The same digest on demand. The app calls this right after a merchant signs
 * in, so the reminder is accurate at that moment instead of waiting for the
 * top of the hour. Returns the counts as well, so the caller can decide
 * whether to surface anything in-app.
 */
export const getPendingWorkSummary = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const counts = await countPendingWork(uid);
  return { ...counts, summary: describePendingWork(counts) };
});

/*
=====================================
16. ADMIN INVITATION EMAIL
=====================================
The Admin Center's "+ Add Admin" button (see AdsManagment.tsx) previously
just wrote an `admin/admins/{key}` record straight to Realtime Database
from the browser — nothing ever told the invited person it existed. This
callable is what that button now goes through instead: it does the same
authorization check the RTDB rules already do (Owner, or an active admin
whose own record has capabilities.manageAdmins === true), writes the
record with the Admin SDK (so it's authoritative even if the rules ever
drift), and then actually emails the invite via Resend — same service
sendResetEmail() above already uses, same RESEND_API_KEY secret.

Keeping the authorization check here too (not just in the RTDB rules) means
a malformed or spoofed client write can't create a record this function
didn't itself validate, and — more importantly — it's what guarantees the
email and the database write either both happen or neither does, instead
of a client write silently succeeding with no invite ever reaching anyone.
*/
const OWNER_EMAIL = "kizzclover96@gmail.com";

// Every key AdminCapabilities can carry — kept in sync by hand with
// ADMIN_CAPABILITIES in src/hooks/useAdminRole.ts. If you add a capability
// there, add its key here too, or this function will silently strip it
// from new invites (better than the alternative of accepting unknown keys
// unchecked, but easy to forget — that file is the actual source of truth).
const KNOWN_CAPABILITY_KEYS = [
  "viewUsers", "viewBusinesses", "manageReports", "managePayments",
  "manageAdmins", "suspendUsers", "deleteAccounts", "viewSensitiveInfo", "manageSupport",
] as const;
const OWNER_ONLY_CAPABILITY_KEYS = new Set(["managePayments", "manageAdmins", "deleteAccounts", "viewSensitiveInfo"]);

// Mirrors emailToAdminKey() in src/hooks/useAdminRole.ts — Realtime
// Database keys can't contain '.', '#', '$', '[' or ']'.
function emailToAdminKey(email: string): string {
  return email.trim().toLowerCase().replace(/[.#$[\]]/g, ",");
}

const INVITE_ADMIN_LIMIT: RateLimitRule = { name: "invite_admin", max: 20, windowMs: 60 * 60 * 1000 };

export const inviteAdmin = onCall(
  { secrets: ["RESEND_API_KEY"] },
  withMonitoring(async (request) => {
    const callerEmail = request.auth?.token?.email as string | undefined;
    const callerUid = request.auth?.uid;
    if (!callerUid || !callerEmail) {
      throw new HttpsError("unauthenticated", "Sign in to invite an admin.");
    }

    await enforceRateLimit(
      { ip: getClientIp(request.rawRequest), uid: callerUid },
      [INVITE_ADMIN_LIMIT]
    );

    const rtdb = getRtdb();
    const isOwner = callerEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();

    let callerCanManageAdmins = isOwner;
    if (!isOwner) {
      const callerKey = emailToAdminKey(callerEmail);
      const callerSnap = await rtdb.ref(`admin/admins/${callerKey}`).get();
      const callerRecord = callerSnap.exists() ? callerSnap.val() : null;
      callerCanManageAdmins =
        callerRecord?.status === "active" && callerRecord?.capabilities?.manageAdmins === true;
    }
    if (!callerCanManageAdmins) {
      throw new HttpsError("permission-denied", "You don't have permission to invite admins.");
    }

    const rawEmail = String(request.data?.email || "").trim().toLowerCase();
    const roleLabel = String(request.data?.roleLabel || "Admin").trim().slice(0, 60);
    const requestedCapabilities = request.data?.capabilities || {};

    if (!rawEmail || !/^\S+@\S+\.\S+$/.test(rawEmail)) {
      throw new HttpsError("invalid-argument", "Enter a valid email address.");
    }
    if (rawEmail === OWNER_EMAIL.toLowerCase()) {
      throw new HttpsError("invalid-argument", "That account is already the owner.");
    }

    const adminKey = emailToAdminKey(rawEmail);
    const existingSnap = await rtdb.ref(`admin/admins/${adminKey}`).get();
    if (existingSnap.exists() && existingSnap.val()?.status === "active") {
      throw new HttpsError("already-exists", "This person is already an active admin.");
    }

    // Only the Owner can hand out the four highest-risk capabilities,
    // regardless of what the client sent — an admin who somehow got
    // manageAdmins can invite others, but never with more power than they
    // themselves have been explicitly trusted with beyond the basics.
    const capabilities: Record<string, boolean> = {};
    for (const key of KNOWN_CAPABILITY_KEYS) {
      const wants = requestedCapabilities[key] === true;
      capabilities[key] = wants && (!OWNER_ONLY_CAPABILITY_KEYS.has(key) || isOwner);
    }

    const now = Date.now();
    const expiresAt = now + 1000 * 60 * 60 * 72; // 72h

    await rtdb.ref(`admin/admins/${adminKey}`).set({
      email: rawEmail,
      status: "invited",
      roleLabel,
      capabilities,
      invitedBy: callerEmail,
      invitedByUid: callerUid,
      invitedAt: now,
      expiresAt,
      application: null,
      respondedBy: null,
      respondedAt: null,
      uid: null,
    });

    await rtdb.ref("admin/audit_log").push({
      adminEmail: callerEmail,
      action: "INVITE_ADMIN",
      targetUid: adminKey,
      details: `Invited ${rawEmail} with capabilities: ${
        Object.keys(capabilities).filter((k) => capabilities[k]).join(", ") || "none"
      }`,
      timestamp: now,
    });

    const grantedLabels = KNOWN_CAPABILITY_KEYS.filter((k) => capabilities[k]);
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // The database write already succeeded — don't fail the whole call
      // over a missing email secret, just surface it so the inviting admin
      // knows to follow up manually instead of assuming an email went out.
      captureError(new Error("RESEND_API_KEY missing — invite email not sent"), { scope: "inviteAdmin", adminKey });
      return { success: true, emailSent: false };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Malvin AI <malvinsecurity@malvinai.com>",
        to: rawEmail,
        subject: "You've been invited to become a Malvin AI administrator",
        html: `
          <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px;">
            <p>${callerEmail} has invited you to become a Malvin AI administrator${roleLabel !== "Admin" ? ` (${roleLabel})` : ""}.</p>
            ${grantedLabels.length ? `<p style="font-size: 13px; color: #555;">Requested permissions: ${grantedLabels.join(", ")}.</p>` : ""}
            <p>Sign in to Malvin AI at <a href="https://malvinai.com">malvinai.com</a> with this email address to review the invitation and submit a short application. Nothing is granted automatically — an existing admin still has to approve it.</p>
            <p style="color: #888; font-size: 13px;">This invitation expires in 72 hours. If you weren't expecting this, you can safely ignore it.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      captureError(new Error(`Resend API error (${res.status}): ${errText}`), { scope: "inviteAdmin", adminKey });
      // Same reasoning as above — the invite record exists either way, so
      // the inviting admin can retry sending or share the link manually.
      return { success: true, emailSent: false };
    }

    return { success: true, emailSent: true };
  })
);

/*
=====================================
17. ADMIN CUSTOM CLAIMS SYNC
=====================================
Firestore security rules can't read Realtime Database — there's no
`root.child(...)` equivalent across products — so a Firestore rule has no
way to ask "does this signed-in user have manageSupport?" if that answer
only lives in admin/admins over in RTDB. The Support inbox below needs
exactly that check (only support-capable admins should be able to list
supportConversations straight from the client).

The fix is the same one syncPremiumClaims already uses for `tier`: mirror
the trusted RTDB value onto the user's Firebase Auth *custom claims*,
which DO travel inside their ID token and which Firestore rules read
natively via `request.auth.token`. This trigger keeps that mirror current
automatically — it fires every time an admin/admins/{adminKey} record
changes, and sets or clears `{ admin, cap }` on the matching Auth user.

Two things worth knowing:
  - Claims only take effect in a client's ID token after that client's
    token next refreshes (forced refresh, or up to ~1h naturally) — a
    freshly-granted admin may need to sign out/in once before Firestore
    rules recognize them, same caveat as the premium claim already has.
  - `record.uid` is only populated once the invited person has actually
    signed in and submitted their application (see AdminApplicationGate),
    so records still sitting at status "invited" have no Auth user to
    attach a claim to yet — this is a deliberate no-op, not a bug.
*/
export const syncAdminClaims = onValueWritten(
  "admin/admins/{adminKey}",
  async (event) => {
    const after = event.data.after.val();
    const before = event.data.before.val();
    const uid = after?.uid || before?.uid;
    if (!uid) return;

    const { getAuth } = require("firebase-admin/auth");
    const authAdmin = getAuth();

    let userRecord;
    try {
      userRecord = await authAdmin.getUser(uid);
    } catch (err) {
      console.error(`syncAdminClaims: no Auth user for uid ${uid}`, err);
      return;
    }
    const existingClaims = userRecord.customClaims || {};

    const isActive = after?.status === "active";
    const capabilities = after?.capabilities || {};

    await authAdmin.setCustomUserClaims(uid, {
      ...existingClaims, // preserve premium/tier and anything else already set
      admin: isActive,
      cap: isActive
        ? {
            viewUsers: !!capabilities.viewUsers,
            viewBusinesses: !!capabilities.viewBusinesses,
            manageReports: !!capabilities.manageReports,
            managePayments: !!capabilities.managePayments,
            manageAdmins: !!capabilities.manageAdmins,
            suspendUsers: !!capabilities.suspendUsers,
            deleteAccounts: !!capabilities.deleteAccounts,
            viewSensitiveInfo: !!capabilities.viewSensitiveInfo,
            manageSupport: !!capabilities.manageSupport,
          }
        : null,
    });

    console.log(`syncAdminClaims: uid ${uid} → admin=${isActive}`);
  }
);

/*
=====================================
18. SUPPORT INBOX (Resend inbound + outbound)
=====================================
support@malvinai.com as an in-app inbox rather than a shared mailbox
password. Two halves:

  - resendInboundWebhook: Resend calls this the moment someone emails
    support@malvinai.com. It verifies the request actually came from
    Resend (Svix-signed), pulls the full parsed email via the Receiving
    API (webhook payloads deliberately exclude the body), threads it onto
    an existing supportConversations doc when possible, and creates a new
    one otherwise.

  - sendSupportReply: what the Support tab's reply box calls. The Resend
    API key never reaches the browser — this is the only thing allowed to
    actually send as support@malvinai.com.

Threading: every outbound message we send gets Resend's returned email id
stored as `resendMessageId`. When a reply comes back in, its `In-Reply-To`
header should reference that id (standard email behavior — every mail
client sets this when you hit "reply"), so we look outbound messages up
by that first. If nothing matches (first-ever email from this customer,
or a client that mangled the header), we fall back to the newest
still-open conversation from the same address, and only open a brand new
conversation if neither exists.
*/
const getResend = () => {
  const { Resend } = require("resend");
  return new Resend(process.env.RESEND_API_KEY);
};

async function findOrCreateSupportConversation(params: {
  db: any;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  inReplyTo: string | null;
}): Promise<{ id: string; isNew: boolean }> {
  const { db, fromEmail, fromName, subject, inReplyTo } = params;
  const conversations = db.collection("supportConversations");

  // 1. Thread by In-Reply-To against a message we actually sent.
  if (inReplyTo) {
    const byThread = await db
      .collectionGroup("messages")
      .where("resendMessageId", "==", inReplyTo)
      .limit(1)
      .get();
    if (!byThread.empty) {
      const conversationId = byThread.docs[0].ref.parent.parent?.id;
      if (conversationId) return { id: conversationId, isNew: false };
    }
  }

  // 2. Fall back to the same customer's most recent non-resolved thread.
  const byCustomer = await conversations
    .where("customerEmail", "==", fromEmail)
    .where("status", "in", ["open", "pending"])
    .orderBy("updatedAt", "desc")
    .limit(1)
    .get();
  if (!byCustomer.empty) {
    return { id: byCustomer.docs[0].id, isNew: false };
  }

  // 3. Genuinely new conversation.
  const now = Date.now();
  const newDoc = await conversations.add({
    customerEmail: fromEmail,
    customerName: fromName,
    subject: subject || "(no subject)",
    status: "open",
    assignedTo: null,
    assignedToUid: null,
    createdAt: now,
    updatedAt: now,
    lastMessagePreview: "",
    unreadByAdmin: true,
  });
  return { id: newDoc.id, isNew: true };
}

// Downloads one inbound attachment from Resend's temporary download_url
// and re-uploads it to Firebase Storage for a permanent URL, since
// Resend's own download_url expires after 1 hour — nowhere near long
// enough to be useful in a message thread someone might reopen weeks
// later. `raw` here is one entry from resend.emails.receiving.attachments
// .list()'s response: { id, filename, content_type, download_url, ... } —
// NOT the webhook payload itself, which only carries attachment metadata
// (id/filename/content_type), never content.
async function storeInboundAttachment(params: {
  conversationId: string;
  messageId: string;
  raw: any;
  index: number;
}): Promise<{ filename: string; url: string; contentType: string; size: number } | null> {
  const { conversationId, messageId, raw, index } = params;
  try {
    const filename: string = raw.filename || `attachment-${index}`;
    const contentType: string = raw.content_type || "application/octet-stream";
    const downloadUrl: string | undefined = raw.download_url;
    if (!downloadUrl) {
      console.warn("storeInboundAttachment: no download_url on attachment", { conversationId, messageId, keys: Object.keys(raw || {}) });
      return null;
    }

    const fetched = await fetch(downloadUrl);
    if (!fetched.ok) {
      console.error("storeInboundAttachment: download_url fetch failed", { conversationId, messageId, status: fetched.status });
      return null;
    }
    const buffer = Buffer.from(await fetched.arrayBuffer());

    const { getStorage } = require("firebase-admin/storage");
    const bucket = getStorage().bucket();
    const path = `support-attachments/${conversationId}/${messageId}/${filename}`;
    const file = bucket.file(path);
    await file.save(buffer, { contentType, metadata: { cacheControl: "private, max-age=0" } });

    // Long-lived signed URL rather than making the object public — these
    // are customer-submitted files, not something to leave world-readable
    // just because someone finds the URL.
    const [url] = await file.getSignedUrl({ action: "read", expires: "01-01-2100" });

    return { filename, url, contentType, size: buffer.length };
  } catch (err) {
    captureError(err, { scope: "storeInboundAttachment", conversationId, messageId });
    return null;
  }
}

export const resendInboundWebhook = onRequest(
  { secrets: ["RESEND_API_KEY", "RESEND_WEBHOOK_SECRET"], cors: false },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const resend = getResend();
    let event: any;
    try {
      // Signature covers the EXACT bytes Resend sent — req.rawBody (not the
      // parsed-then-restringified req.body) is required or verification
      // fails even for a completely legitimate request.
      const payload = (req as any).rawBody?.toString("utf8") ?? JSON.stringify(req.body);
      event = resend.webhooks.verify({
        payload,
        headers: {
          id: req.headers["svix-id"] as string,
          timestamp: req.headers["svix-timestamp"] as string,
          signature: req.headers["svix-signature"] as string,
        },
        webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
      });
    } catch (err) {
      captureError(err, { scope: "resendInboundWebhook", stage: "verify" });
      res.status(400).send("Invalid signature");
      return;
    }

    if (event.type !== "email.received") {
      // Delivery/bounce/complaint events etc. — not this inbox's concern.
      res.status(200).send("ignored");
      return;
    }

    try {
      const emailId = event.data.email_id;

      // Fetch the complete received email from Resend.
      const { data: email, error: receiveError } =
        await resend.emails.receiving.get(emailId);

      if (receiveError) {
        console.error("Failed to retrieve inbound email", {
          emailId,
          error: receiveError,
        });

        throw new Error(
          `Failed to retrieve inbound email ${emailId}: ${
            receiveError.message || JSON.stringify(receiveError)
          }`
        );
      }

      if (!email) {
        throw new Error(
          `Resend returned no email data for inbound email ${emailId}`
        );
      }

      console.log("Inbound email retrieved successfully", {
        emailId,
        from: email.from,
        subject: email.subject,
      });

      // Resend can return From as a normal email string such as:
      // "John Smith <john@example.com>"
      function parseEmailAddress(value: unknown): {
        email: string;
        name: string | null;
      } {
        if (typeof value !== "string") {
          return { email: "", name: null };
        }

        const match = value.match(/^(.*?)\s*<([^>]+)>$/);

        if (match) {
          return {
            name: match[1].trim().replace(/^["']|["']$/g, "") || null,
            email: match[2].trim().toLowerCase(),
          };
        }

        return {
          email: value.trim().toLowerCase(),
          name: null,
        };
      }

      const parsedFrom = parseEmailAddress(email.from);

      const fromEmail = parsedFrom.email;
      const fromName = parsedFrom.name;

      const subject = email.subject || "";
      const bodyText = email.text || "";
      const bodyHtml = email.html || null;

      const inReplyTo =
        email.headers?.["in-reply-to"] ||
        email.headers?.["In-Reply-To"] ||
        null;

      const resendMessageId =
        email.message_id ||
        email.headers?.["message-id"] ||
        email.headers?.["Message-Id"] ||
        emailId;

      if (!fromEmail) {
        console.error("resendInboundWebhook: inbound email had no from address", { emailId });
        res.status(200).send("no-from");
        return;
      }

      const db = getDb();
      const { id: conversationId } = await findOrCreateSupportConversation({
        db, fromEmail, fromName, subject, inReplyTo,
      });

      const now = Date.now();
      const messageRef = db.collection("supportConversations").doc(conversationId).collection("messages").doc();

      // Attachment CONTENT never comes from the webhook payload or from
      // emails.receiving.get() — only metadata does. The actual bytes live
      // behind a separate, short-lived (1h) download_url from the
      // Attachments API, which is why this is its own call rather than
      // something read off `email` above.
      let rawAttachments: any[] = [];
      try {
        const { data: attachmentList } = await resend.emails.receiving.attachments.list({ emailId });
        rawAttachments = Array.isArray(attachmentList) ? attachmentList : (attachmentList?.data || []);
      } catch (err) {
        captureError(err, { scope: "resendInboundWebhook", stage: "list-attachments", emailId });
      }
      const attachments = (
        await Promise.all(
          rawAttachments.map((raw, i) =>
            storeInboundAttachment({ conversationId, messageId: messageRef.id, raw, index: i })
          )
        )
      ).filter((a): a is NonNullable<typeof a> => a !== null);

      await messageRef.set({
        direction: "inbound",
        from: fromEmail,
        to: "support@malvinai.com",
        subject,
        body: bodyText,
        html: bodyHtml,
        resendMessageId,
        inReplyTo,
        authorEmail: null,
        attachments,
        createdAt: now,
      });

      await db.collection("supportConversations").doc(conversationId).update({
        updatedAt: now,
        status: "open", // a new customer reply reopens a pending/resolved thread
        lastMessagePreview: bodyText.slice(0, 140) || (attachments.length ? `📎 ${attachments.length} attachment(s)` : ""),
        unreadByAdmin: true,
        ...(fromName ? { customerName: fromName } : {}),
      });

      res.status(200).send("ok");
    } catch (err) {
      captureError(err, { scope: "resendInboundWebhook", stage: "process" });
      // 200, not 500 — Resend retries on non-2xx, and a processing bug on
      // our end shouldn't cause the same email to be redelivered and
      // potentially double-filed. The error is already captured above.
      res.status(200).send("error-logged");
    }
  }
);

const SEND_SUPPORT_REPLY_LIMIT: RateLimitRule = { name: "send_support_reply", max: 60, windowMs: 60 * 60 * 1000 };

export const sendSupportReply = onCall(
  { secrets: ["RESEND_API_KEY"] },
  withMonitoring(async (request) => {
    const callerEmail = request.auth?.token?.email as string | undefined;
    const callerUid = request.auth?.uid;
    if (!callerUid || !callerEmail) {
      throw new HttpsError("unauthenticated", "Sign in to reply.");
    }

    await enforceRateLimit(
      { ip: getClientIp(request.rawRequest), uid: callerUid },
      [SEND_SUPPORT_REPLY_LIMIT]
    );

    // Same authorization check inviteAdmin uses — custom claims (fast
    // path, set by syncAdminClaims above) with an RTDB fallback for the
    // moment right after a grant, before the claim has propagated.
    const isOwner = callerEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();
    let canReply = isOwner || request.auth?.token?.cap?.manageSupport === true;
    if (!canReply) {
      const rtdb = getRtdb();
      const callerKey = emailToAdminKey(callerEmail);
      const callerSnap = await rtdb.ref(`admin/admins/${callerKey}`).get();
      const callerRecord = callerSnap.exists() ? callerSnap.val() : null;
      canReply = callerRecord?.status === "active" && callerRecord?.capabilities?.manageSupport === true;
    }
    if (!canReply) {
      throw new HttpsError("permission-denied", "You don't have permission to reply to support conversations.");
    }

    const conversationId = String(request.data?.conversationId || "");
    const body = String(request.data?.body || "").trim();
    // Client uploads to Storage first and only sends us the resulting
    // metadata — this function never touches raw file bytes, keeping it
    // fast and keeping upload size limits out of the callable's hands.
    const rawAttachments = Array.isArray(request.data?.attachments) ? request.data.attachments : [];
    const attachments = rawAttachments
      .map((a: any) => ({
        filename: String(a?.filename || "attachment"),
        url: String(a?.url || ""),
        contentType: String(a?.contentType || "application/octet-stream"),
        size: Number(a?.size) || 0,
      }))
      .filter((a: { url: string }) => !!a.url)
      .slice(0, 5); // sane ceiling — this is a support reply box, not a file drop
    if (!conversationId || (!body && attachments.length === 0)) {
      throw new HttpsError("invalid-argument", "conversationId and a body or attachment are required.");
    }

    const db = getDb();
    const conversationRef = db.collection("supportConversations").doc(conversationId);
    const conversationSnap = await conversationRef.get();
    if (!conversationSnap.exists) {
      throw new HttpsError("not-found", "Conversation not found.");
    }
    const conversation = conversationSnap.data()!;
    const toEmail = conversation.customerEmail;
    const subject = conversation.subject?.startsWith("Re:") ? conversation.subject : `Re: ${conversation.subject || ""}`;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "Email service is not configured (RESEND_API_KEY secret is missing).");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Malvin Support <support@malvinai.com>",
        to: toEmail,
        subject,
        text: body,
        html: `<div style="font-family: -apple-system, Helvetica, Arial, sans-serif;">${body
          .split("\n")
          .map((line: string) => `<p>${line}</p>`)
          .join("")}</div>`,
        // Resend fetches the file itself from `path` — no need to read the
        // bytes into this function at all, since the client already put
        // them somewhere Resend can reach (a signed Storage URL).
        ...(attachments.length
          ? { attachments: attachments.map((a: { filename: string; url: string }) => ({ filename: a.filename, path: a.url })) }
          : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      captureError(new Error(`Resend API error (${res.status}): ${errText}`), { scope: "sendSupportReply", conversationId });
      throw new HttpsError("internal", "Failed to send the reply email. Nothing was saved.");
    }

    const sent = await res.json();
    const now = Date.now();

    await conversationRef.collection("messages").add({
      direction: "outbound",
      from: "support@malvinai.com",
      to: toEmail,
      subject,
      body,
      html: null,
      resendMessageId: sent.id || null,
      inReplyTo: null,
      authorEmail: callerEmail,
      attachments,
      createdAt: now,
    });

    await conversationRef.update({
      updatedAt: now,
      status: "pending", // waiting on the customer now, not us
      lastMessagePreview: body.slice(0, 140),
      unreadByAdmin: false,
      assignedTo: conversation.assignedTo || callerEmail,
      assignedToUid: conversation.assignedToUid || callerUid,
    });

    return { success: true };
  })
);

/*
=====================================
19. SUPPORT ASSIGNMENT NOTIFICATION
=====================================
The Support tab's "Assign to me" / assign-to-dropdown writes assignedTo
straight to Firestore client-side (see firestore.supportConversations.rules
— that field is one of the four a support-capable admin is allowed to
touch directly). Nobody gets told when that happens unless they're already
staring at the Support tab, though, so this trigger fires an email the
moment assignedTo changes to someone new — same Resend send path as
everything else here, just addressed to the admin instead of the customer.

Deliberately does NOT fire on every conversation update (a reply also
touches this doc) — only when assignedTo itself changed, and only when the
new value isn't null/empty.
*/
export const notifySupportAssignment = onDocumentWritten(
  { document: "supportConversations/{conversationId}", secrets: ["RESEND_API_KEY"] },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after) return; // deleted, not our concern

    const newAssignee = after.assignedTo;
    const prevAssignee = before?.assignedTo;
    if (!newAssignee || newAssignee === prevAssignee) return;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      captureError(new Error("RESEND_API_KEY missing — assignment notification not sent"), { scope: "notifySupportAssignment" });
      return;
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Malvin Support <support@malvinai.com>",
          to: newAssignee,
          subject: `Assigned to you: ${after.subject || "(no subject)"}`,
          html: `
            <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px;">
              <p>A support conversation was assigned to you.</p>
              <p><strong>${after.customerName || after.customerEmail}</strong> — ${after.subject || "(no subject)"}</p>
              ${after.lastMessagePreview ? `<p style="color: #555; font-size: 13px;">"${after.lastMessagePreview}"</p>` : ""}
              <p><a href="https://malvinai.com">Open it in the Malvin Admin Center →</a></p>
            </div>
          `,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        captureError(new Error(`Resend API error (${res.status}): ${errText}`), { scope: "notifySupportAssignment" });
      }
    } catch (err) {
      captureError(err, { scope: "notifySupportAssignment" });
    }
  }
);

/*
=====================================
20. VINBACK TAG QUOTA + PAYWALL
=====================================
2 free VinBack tags per account, then $0.88 each via LemonSqueezy — same
one-time-purchase pattern api/webhook/lemonsqueezy.ts already handles for
wallet top-ups, distinguished by a `product: 'vinback_tag_credit'` field in
LemonSqueezy's custom_data (see the checkout URL built in
VinBackTagCreate.tsx) so the existing top-up branch is untouched for
everyone else.

Tag creation moved server-side entirely — firestore.rules now has
`allow create: if false` on vinbackTags, so this callable (Admin SDK,
bypasses rules) is the ONLY way a tag can be created. That's what actually
makes the quota real: a client-side-only check is just UI, trivially
skippable by anyone editing the request in devtools; the enforcement has
to live wherever the write happens, which is here now, not in the browser.

Quota state lives in RTDB (users/{uid}/vinback), consistent with where
treasury/premium already live for this project, and is checked+updated
inside a single RTDB transaction so two rapid-fire requests (e.g. a
double-tap on "Generate") can't both read "1 free tag left" and both
succeed — the transaction's retry-on-conflict semantics make this
effectively a lock. tagsCreatedCount never decrements on tag deletion —
deleting a tag doesn't refund a free/paid slot, otherwise create→delete→
create would be an infinite free-tag loop.
*/
const FREE_VINBACK_TAGS = 2;
const CREATE_VINBACK_TAG_LIMIT: RateLimitRule = { name: "create_vinback_tag", max: 20, windowMs: 60 * 60 * 1000 };

export const createVinBackTag = onCall(
  withMonitoring(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in to create a VinBack tag.");
    }
    await enforceRateLimit({ ip: getClientIp(request.rawRequest), uid }, [CREATE_VINBACK_TAG_LIMIT]);

    const ownerName = String(request.data?.ownerName || "").trim();
    const propertyName = String(request.data?.propertyName || "").trim();
    const address = String(request.data?.address || "").trim();
    const contact1 = String(request.data?.contact1 || "").trim();
    const contact2 = String(request.data?.contact2 || "").trim();
    if (!ownerName || !propertyName || !contact1) {
      throw new HttpsError("invalid-argument", "Owner name, property name, and at least one contact are required.");
    }

    const rtdb = getRtdb();
    const vinbackRef = rtdb.ref(`users/${uid}/vinback`);

    // The transaction is the actual lock: it re-runs from scratch if the
    // node changed between read and write (e.g. a concurrent request),
    // so "check quota, then consume it" can never race.
    let consumedFrom: "free" | "paid" | null = null;
    const txResult = await vinbackRef.transaction((current: any) => {
      const state = current || { tagsCreatedCount: 0, paidCredits: 0 };
      const tagsCreatedCount = state.tagsCreatedCount || 0;
      const paidCredits = state.paidCredits || 0;

      if (tagsCreatedCount < FREE_VINBACK_TAGS) {
        consumedFrom = "free";
        return { ...state, tagsCreatedCount: tagsCreatedCount + 1 };
      }
      if (paidCredits > 0) {
        consumedFrom = "paid";
        return { ...state, tagsCreatedCount: tagsCreatedCount + 1, paidCredits: paidCredits - 1 };
      }
      consumedFrom = null;
      return; // abort — no committed change, quota exhausted
    });

    if (!txResult.committed || !consumedFrom) {
      throw new HttpsError(
        "failed-precondition",
        `PAYMENT_REQUIRED: You've used your ${FREE_VINBACK_TAGS} free VinBack tags. Buy another for €2.99 to continue.`
      );
    }

    try {
      const { getFirestore, FieldValue } = require("firebase-admin/firestore");
      const fsDb = getFirestore();
      // Matches generateVinBackCode() in src/utils/vinbackQr.ts exactly
      // (same charset, same length, same "vinback-" prefix) — that
      // function is unused now that creation is server-side, but the code
      // FORMAT it established is still what's printed on physical tags
      // and shown in the UI, so this has to stay visually identical to
      // it. Uses crypto.randomBytes instead of Math.random purely because
      // a real CSPRNG is sitting right here server-side anyway; the
      // output format is what actually matters for consistency.
      const VINBACK_CODE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
      const codeSuffix = Array.from(crypto.randomBytes(6) as unknown as number[])
        .map((b) => VINBACK_CODE_CHARS[b % VINBACK_CODE_CHARS.length])
        .join("");
      const code = `vinback-${codeSuffix}`;

      const docRef = await fsDb.collection("vinbackTags").add({
        ownerId: uid,
        ownerName,
        propertyName,
        address,
        contact1,
        contact2,
        code,
        status: "in_possession",
        createdAt: FieldValue.serverTimestamp(),
      });

      await rtdb.ref("admin/audit_log").push({
        adminEmail: null,
        action: consumedFrom === "free" ? "VINBACK_TAG_CREATED_FREE" : "VINBACK_TAG_CREATED_PAID",
        targetUid: uid,
        details: `${propertyName} (${docRef.id})`,
        timestamp: Date.now(),
      });

      return { tagId: docRef.id, code, consumedFrom };
    } catch (err) {
      // The quota slot was already consumed above — if the actual Firestore
      // write then fails, refund it rather than silently charging someone
      // a free/paid tag they never got.
      await vinbackRef.transaction((current: any) => {
        const state = current || { tagsCreatedCount: 0, paidCredits: 0 };
        return {
          ...state,
          tagsCreatedCount: Math.max(0, (state.tagsCreatedCount || 0) - 1),
          paidCredits: consumedFrom === "paid" ? (state.paidCredits || 0) + 1 : state.paidCredits || 0,
        };
      });
      captureError(err, { scope: "createVinBackTag", uid });
      throw new HttpsError("internal", "Could not create the tag. You have not been charged a slot — please try again.");
    }
  })
);