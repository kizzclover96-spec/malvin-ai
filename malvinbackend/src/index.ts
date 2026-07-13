import "dotenv/config";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import * as crypto from "crypto";

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

// Helper function to hash PINs securely
function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 1000, 64, "sha512").toString("hex");
}
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
  // 1. 🟢 Destructure merchantType along with the other payload items
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
  
  // 2. 🟢 Explicitly choose collections based on the incoming storefront variant flag
  const isFood = merchantType === "food";
  const targetCollection = isFood ? "restaurantprofile" : "salons";
  const appointmentCollection = isFood ? "foodOrders" : "salonAppointments"; // Adjust "foodOrders" to your actual restaurant order collection name

  const businessRef = db.collection(targetCollection).doc(targetBusinessUid);
  const ticketId = isFood 
    ? `FOOD-${Math.floor(100000 + Math.random() * 900000)}` 
    : `SAL-${Math.floor(100000 + Math.random() * 900000)}`;

  // Move this inside or dynamically resolve the collection reference path
  const appointmentRef = db.collection(appointmentCollection).doc(customerUid).collection("appointments").doc();

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

      // 3. Deduct from customer wallet
      transaction.update(userRef, { "wallet.balance": FieldValue.increment(-amount) });
      
      // 4. Update balance directly on the cleanly dynamically routed business node
      transaction.update(businessRef, { walletBalance: FieldValue.increment(amount) });

      // 5. Save user transaction statement logs with accurate fallback metadata strings
      transaction.set(txRef, {
        storeName: businessDoc.data()?.brandName || businessDoc.data()?.name || businessDoc.data()?.salonName || "Malvin Storefront Platform",
        amount: amount,
        type: "spent",
        timestamp: FieldValue.serverTimestamp(),
      });

      // 6. 🟢 SECURE DYNAMIC TICKET CREATION
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
    // Unified: Point to the private subcollection instead of root document properties
    const securityRef = businessDocRef.collection("private").doc("security");

    try {
      const result = await db.runTransaction(async (transaction: typeof Transaction) => {
        const docSnap = await transaction.get(businessDocRef);
        const securitySnap = await transaction.get(securityRef);

        if (!docSnap.exists) {
          throw new HttpsError("not-found", "Business profile not found.");
        }
        if (!securitySnap.exists) {
          throw new HttpsError("failed-precondition", "Security PIN setup is incomplete.");
        }

        const data = docSnap.data();
        const securityData = securitySnap.data();

        const currentBalance = data?.walletBalance ?? 0;
        const stripeAccountId = data?.stripeAccountId;
        const payoutsEnabled = data?.payoutsEnabled ?? data?.payouts_enabled;
        
        // Unified Hash Verification
        const { hashedPin, salt } = securityData!;
        const incomingPinHash = hashPin(pin, salt);

        if (!hashedPin || incomingPinHash !== hashedPin) {
          throw new HttpsError("permission-denied", "Incorrect secret PIN.");
        }

        if (!stripeAccountId || !payoutsEnabled) {
          throw new HttpsError("failed-precondition", "Stripe payout account is not fully setup.");
        }

        if (currentBalance < amount) {
          throw new HttpsError("failed-precondition", "Insufficient funds in your wallet.");
        }

        return { stripeAccountId };
      });

      const amountInCents = Math.round(amount * 100);
      const transfer = await stripe.transfers.create({
        amount: amountInCents,
        currency: "eur",
        destination: result.stripeAccountId,
        description: `Payout withdrawal for UID: ${uid}`,
      });

      const batch = db.batch();
      batch.update(businessDocRef, {
        walletBalance: FieldValue.increment(-amount),
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
export const requestPinReset = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication context is missing.");
  }

  // Support multi-merchant routing
  const { merchantType } = request.data;
  const targetCollection = merchantType === "food" ? "restaurantprofile" : "salons";

  const { getAuth } = require("firebase-admin/auth");
  const db = getDb();

  const userRecord = await getAuth().getUser(uid);
  const email = userRecord.email;

  if (!email) {
    throw new HttpsError("failed-precondition", "No email associated with this merchant account.");
  }

  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000;

  await db.collection(targetCollection).doc(uid).collection("private").doc("security").set({
    resetToken,
    tokenExpires: expiresAt
  }, { merge: true });

  // TODO: Implement email sending logic here (SendGrid/Nodemailer)
  console.log(`Reset token for ${email}: ${resetToken}`);

  return { success: true, message: "A secure reset code has been sent to your email." };
});

/*
=====================================
9. CONFIRM PIN RESET (V2)
=====================================
*/
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

  const { resetToken: storedToken, tokenExpires } = securitySnap.data()!;

  if (storedToken !== resetToken || Date.now() > tokenExpires) {
    throw new HttpsError("permission-denied", "The token is invalid or has expired.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPin = hashPin(newPin, salt);

  await securityRef.set({
    hashedPin,
    salt,
    resetToken: null, 
    tokenExpires: null 
  });

  return { success: true, message: "Security PIN updated successfully!" };
});