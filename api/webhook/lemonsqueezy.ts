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

const rtdb = admin.database();

// -------------------------
// Signature Verification
// -------------------------
function verifySignature(rawBody: string, signature: string, secret: string) {
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  return hmac === signature;
}

// -------------------------
// Webhook Handler
// -------------------------
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;

    const signature = req.headers["x-signature"] as string;

    // IMPORTANT: raw body should ideally be used here in production
    const isValid = verifySignature(
      JSON.stringify(body),
      signature,
      process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!
    );

    if (!isValid) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    console.log("Webhook received:", body);

    const eventName = body.meta?.event_name;

    const userId =
      body.meta?.custom_data?.user_id ||
      body.meta?.custom_data?.userId;

    if (!userId) {
      return res.status(200).json({ ignored: "missing userId" });
    }

    // -------------------------
    // IDEMPOTENCY (prevent double processing)
    // -------------------------
    const eventId = body.meta?.event_id;

    if (eventId) {
      const eventRef = rtdb.ref(`processed_events/${eventId}`);
      const snap = await eventRef.get();

      if (snap.exists()) {
        return res.status(200).json({ skipped: true });
      }

      await eventRef.set(true);
    }

    // -------------------------
    // 1. CREDITS (ONE-TIME PAYMENT)
    // -------------------------
    if (eventName === "order_completed") {
      const totalCents = body.data?.attributes?.total || 0;
      const amount = totalCents / 100;

      const balanceRef = rtdb.ref(`users/${userId}/treasury/balance`);
      const ledgerRef = rtdb.ref(`users/${userId}/treasury/ledger`);

      await balanceRef.transaction((current) => (current || 0) + amount);

      await ledgerRef.push({
        type: "Inflow",
        amount,
        label: "Credit_TopUp",
        status: "Settled",
        timestamp: Date.now(),
      });

      console.log(`Credited €${amount} to ${userId}`);
    }

    // -------------------------
    // 2. SUBSCRIPTION (PREMIUM SYSTEM)
    // -------------------------
    if (eventName === "subscription_created") {
      await rtdb.ref(`users/${userId}/premium`).set(true);
    }

    if (eventName === "subscription_updated") {
      await rtdb.ref(`users/${userId}/premium`).set(true);
    }

    if (eventName === "subscription_cancelled") {
      await rtdb.ref(`users/${userId}/premium`).set(false);
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}