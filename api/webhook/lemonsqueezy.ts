import admin from "firebase-admin";
import crypto from "crypto";

// -------------------------
// Firebase Init
// -------------------------
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

// -------------------------
// Renamed to completely bypass TypeScript collision cache
// -------------------------
const executeSignatureCheck = (rawBody: string, signature: string, secret: string): boolean => {
  try {
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");

    const hmacBuffer = Buffer.from(hmac, "hex");
    const signatureBuffer = Buffer.from(signature, "hex");

    if (hmacBuffer.length !== signatureBuffer.length) {
      return false;
    }
  
    return crypto.timingSafeEqual(hmacBuffer, signatureBuffer);
  } catch (error) {
    console.error("Error computing signature validation:", error);
    return false;
  }
};

// -------------------------
// Webhook Handler
// -------------------------
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;
    const signature = (req.headers["x-signature"] as string) || "";
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";

    const rawBodyString = typeof body === "string" ? body : JSON.stringify(body);

    // Call the newly named arrow function
    const isSignatureValid: boolean = executeSignatureCheck(rawBodyString, signature, secret);

    if (!isSignatureValid) {
      console.error("Signature verification failed.");
      return res.status(401).json({ error: "Invalid signature" });
    }

    console.log("Webhook received safely:", body);

    const eventName = body.meta?.event_name;
    const userId = body.meta?.custom_data?.user_id || body.meta?.custom_data?.userId;

    if (!userId) {
      console.log("Missing userId in payload meta data.");
      return res.status(200).json({ ignored: "missing userId" });
    }

    // -------------------------
    // IDEMPOTENCY (Using Firestore)
    // -------------------------
    // -------------------------
    // IDEMPOTENCY (Using Firestore)
    // -------------------------
    const eventId = body.meta?.event_id;
    if (eventId) {
      const eventDocRef = db.collection("processed_events").doc(eventId);
      const eventSnap = await eventDocRef.get();

      // FIXED: Removed parentheses because .exists is a property in admin SDK
      if (eventSnap.exists) { 
        console.log(`Event ${eventId} already handled.`);
        return res.status(200).json({ skipped: true });
      }

      await eventDocRef.set({ 
        processed: true, 
        timestamp: admin.firestore.FieldValue.serverTimestamp() 
      });
    }

    // -------------------------
    // 1. CREDITS (ONE-TIME PAYMENT)
    // -------------------------
    if (eventName === "order_completed") {
      const totalCents = body.data?.attributes?.total || 0;
      const amount = totalCents / 100;

      const userDocRef = db.collection("users").doc(userId);
      
      await userDocRef.set({
        treasury: {
          balance: admin.firestore.FieldValue.increment(amount)
        }
      }, { merge: true });

      await userDocRef.collection("ledger").add({
        type: "Inflow",
        amount,
        label: "Credit_TopUp",
        status: "Settled",
        timestamp: Date.now(),
      });

      console.log(`Credited €${amount} to Firestore user ${userId}`);
    }

    // -------------------------
    // 2. SUBSCRIPTION (PREMIUM SYSTEM)
    // -------------------------
    const activePremiumEvents = [
      "subscription_created",
      "subscription_updated",
      "subscription_payment_success"
    ];

    if (activePremiumEvents.includes(eventName)) {
      await db.collection("users").doc(userId).set({
        premium: true,
        tier: "premium", 
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log(`Set premium flag to true for user: ${userId}`);
    }

    if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
      await db.collection("users").doc(userId).set({
        premium: false,
        tier: "free",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`Downgraded user: ${userId}`);
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Webhook execution crash:", err);
    return res.status(500).json({ error: "Server error" });
  }
}