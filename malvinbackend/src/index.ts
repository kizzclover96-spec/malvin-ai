import "dotenv/config";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import * as crypto from "crypto";

initializeApp();

setGlobalOptions({
  maxInstances: 10,
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

/*
=====================================
1. CREATE STRIPE CONNECT ACCOUNT
=====================================
*/
export const createBusinessStripeAccount = onCall(
  { secrets: ["SECURE_STRIPE_KEY"] },
  async (request) => {
    if (!process.env.SECURE_STRIPE_KEY) {
      throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
    }
    const stripe = getStripe();
    const db = getDb();

    const { email, businessId, merchantType } = request.data;
    if (!email || !businessId || !merchantType) { 
      throw new HttpsError("invalid-argument", "Email, businessId, and merchantType are required"); 
    }

    const targetCollection = merchantType === "food" ? "restaurantprofile" : "salons";

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
  }
);

/*
=====================================
2. CREATE ONBOARDING LINK
=====================================
*/
export const createStripeOnboardingLink = onCall(
  { secrets: ["SECURE_STRIPE_KEY"] }, // 🟢 Added secure secret binding
  async (request) => {
    if (!process.env.SECURE_STRIPE_KEY) {
      throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
    }
    const stripe = getStripe();

    const { stripeAccountId } = request.data;
    if (!stripeAccountId) { throw new HttpsError("invalid-argument", "Stripe account missing"); }

    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: "http://malvinai.com/stripe-success",
      return_url: "http://malvinai.com/stripe-success",
      type: "account_onboarding"
    });

    return { url: link.url };
  }
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
    const targetCollection = merchantType === "food" ? "restaurantprofile" : "salons";

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
  async (request) => {
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

    const isFood = merchantType === "food";
    const targetCollection = isFood ? "restaurantprofile" : "salons";
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
              name: businessData?.brandName || businessData?.name || businessData?.salonName || "Malvin Service Payment",
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
  }
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
            storeName: isFood ? "Food Order" : "Direct Payment",
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
export const processPayment = onCall({ cors: true }, async (request) => {
  const { targetBusinessUid, amount, fallbackCustomerUid, appointmentDetails, merchantType } = request.data;
  
  const customerUid = request.auth?.uid || fallbackCustomerUid;

  if (!customerUid) {
    throw new HttpsError("unauthenticated", "Authentication identity context is missing.");
  }

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
});

/*
=====================================
7. SECURE ACCOUNT WITHDRAWAL (PAYOUT)
=====================================
*/
export const requestPayout = onCall(
  { secrets: ["SECURE_STRIPE_KEY"] },
  async (request) => {
    if (!process.env.SECURE_STRIPE_KEY) {
      throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
    }

    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication is required to initiate a payout.");
    }

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
  }
);

/*
=====================================
8. REQUEST PIN RESET (V2)
=====================================
*/
const RESET_REQUEST_COOLDOWN_MS = 60 * 1000; // 1 request per minute per merchant

export const requestPinReset = onCall(
  { secrets: ["RESEND_API_KEY"] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication context is missing.");
    }

    const { merchantType } = request.data;
    const targetCollection = merchantType === "food" ? "restaurantprofile" : "salons";

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
  }
);

/*
=====================================
9. CONFIRM PIN RESET (V2)
=====================================
*/
const RESET_TOKEN_MAX_ATTEMPTS = 5;

export const confirmPinReset = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication context is missing.");
  }

  const { resetToken, newPin, merchantType } = request.data;
  if (!resetToken || !newPin || newPin.length !== 4) {
    throw new HttpsError("invalid-argument", "Valid validation token and a 4-digit PIN are required.");
  }

  const targetCollection = merchantType === "food" ? "restaurantprofile" : "salons";
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
});

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

  const targetCollection = merchantType === "food" ? "restaurantprofile" : "salons";
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

    const targetCollection = merchantType === "food" ? "restaurantprofile" : "salons";
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
  async (request) => {
    if (!process.env.SECURE_STRIPE_KEY) {
      throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
    }

    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

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
  }
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