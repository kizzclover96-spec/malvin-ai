import "dotenv/config";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";

initializeApp();

setGlobalOptions({
  maxInstances: 10,
});

// Helper functions to defer loading heavy SDKs until actual execution
const getStripe = () => {
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY || "");
};

const getDb = () => {
  const { getFirestore } = require("firebase-admin/firestore");
  return getFirestore();
};

/*
=====================================
1. CREATE STRIPE CONNECT ACCOUNT
=====================================
*/
export const createBusinessStripeAccount = onCall(async (request) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
  }
  const stripe = getStripe();
  const db = getDb();

  const { email, businessId } = request.data;
  if (!email || !businessId) { throw new HttpsError("invalid-argument", "Email and businessId required"); }

  const account = await stripe.accounts.create({
    type: "express",
    country: "DE",
    email,
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } }
  });

  await db.collection("businesses").doc(businessId).update({
    stripeAccountId: account.id,
    stripeOnboarded: false,
  });

  return { stripeAccountId: account.id };
});

/*
=====================================
2. CREATE ONBOARDING LINK
=====================================
*/
export const createStripeOnboardingLink = onCall(async (request) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
  }
  const stripe = getStripe();

  const { stripeAccountId } = request.data;
  if (!stripeAccountId) { throw new HttpsError("invalid-argument", "Stripe account missing"); }

  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: "http://localhost:5173/stripe-success",
    return_url: "http://localhost:5173/stripe-success",
    type: "account_onboarding"
  });

  return { url: link.url };
});

/*
=====================================
3. CHECK ACCOUNT STATUS
=====================================
*/
export const checkStripeAccount = onCall(async (request) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
  }
  const stripe = getStripe();
  const db = getDb();

  const { stripeAccountId, businessId } = request.data;
  if (!stripeAccountId || !businessId) {
    throw new HttpsError("invalid-argument", "Stripe account ID and Business ID are required.");
  }

  const account = await stripe.accounts.retrieve(stripeAccountId);

  await db.collection("businesses").doc(businessId).update({
    stripeOnboarded: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled
  });

  return {
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled
  };
});

/*
=====================================
4. CREATE WALLET TOP-UP SESSION
=====================================
*/
export const createWalletTopUpSession = onCall(
  { secrets: ["SECURE_STRIPE_KEY"] }, 
  async (request) => {
    if (!process.env.SECURE_STRIPE_KEY) {
      throw new HttpsError("failed-precondition", "Stripe secret key is missing on the server.");
    }
    const stripe = getStripe();

    const { amount, userId } = request.data;
    if (!amount || amount <= 0 || !userId) {
      throw new HttpsError("invalid-argument", "Valid amount and userId are required.");
    }

    const amountInCents = Math.round(amount * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Wallet Balance Top-up",
              description: "Funds added securely to your Malvin account balance.",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: { userId: userId, type: "wallet_topup" },
      success_url: "http://localhost:5173/wallet?status=success",
      cancel_url: "http://localhost:5173/wallet?status=cancel",
    });

    return { url: session.url };
  }
);

/*
=====================================
5. STRIPE WEBHOOK LISTENER
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
      const userId = session.metadata?.userId;
      const type = session.metadata?.type;
      const amountInCents = session.amount_total;

      if (type === "wallet_topup" && userId && amountInCents) {
        const amountInEuro = amountInCents / 100;
        const batch = db.batch();

        const userDocRef = db.collection("users").doc(userId);
        batch.update(userDocRef, { "wallet.balance": FieldValue.increment(amountInEuro) });

        const txRef = db.collection("users").doc(userId).collection("walletTransactions").doc();
        batch.set(txRef, {
          storeName: "Wallet Top-up",
          amount: amountInEuro,
          type: "received",
          timestamp: FieldValue.serverTimestamp()
        });

        await batch.commit();
        console.log(`Successfully credited €${amountInEuro} to user ${userId}`);
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
  // Fallback: If auth context is missing entirely from the client handshake header
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication context is missing or could not be verified by the client SDK.");
  }

  const { targetBusinessUid, amount } = request.data;
  const customerUid = request.auth.uid; // Read cleanly from the verified token context

  if (!targetBusinessUid || typeof amount !== "number" || amount <= 0) {
    throw new HttpsError("invalid-argument", "A valid business UID and payment amount are required.");
  }

  const db = getDb();
  const { FieldValue, Transaction } = require("firebase-admin/firestore");

  const userRef = db.collection("users").doc(customerUid);
  const salonRef = db.collection("salons").doc(targetBusinessUid);
  const txRef = userRef.collection("walletTransactions").doc();

  try {
    await db.runTransaction(async (transaction: typeof Transaction) => {
      const userDoc = await transaction.get(userRef);
      const salonDoc = await transaction.get(salonRef);

      if (!userDoc.exists || !salonDoc.exists) {
        throw new HttpsError("not-found", "Target user profile or salon directory node is missing.");
      }

      const userData = userDoc.data();
      const currentCustomerBalance = userData?.wallet?.balance ?? 0;

      if (currentCustomerBalance < amount) {
        throw new HttpsError("failed-precondition", "Insufficient client wallet funds available.");
      }

      transaction.update(userRef, { "wallet.balance": FieldValue.increment(-amount) });
      transaction.update(salonRef, { walletBalance: FieldValue.increment(amount) });

      transaction.set(txRef, {
        storeName: salonDoc.data()?.name || "Pamela nails",
        amount: amount,
        type: "spent",
        timestamp: FieldValue.serverTimestamp(),
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Internal billing failure trace:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "The ledger settlement failed to complete.");
  }
});