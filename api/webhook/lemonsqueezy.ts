import admin from "firebase-admin";
import crypto from "crypto";

// -------------------------------------------------------------
// Vercel Config: Disable automatic parsing to keep body raw
// -------------------------------------------------------------
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to read the raw body buffer from the request stream
async function getRawBody(readable: any): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

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
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
  });
}

const rtdb = admin.database();

// -------------------------
// Signature Verification
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
    const rawBodyBuffer = await getRawBody(req);
    const rawBodyString = rawBodyBuffer.toString("utf8");

    const signature = (req.headers["x-signature"] as string) || "";
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

    const isSignatureValid: boolean = executeSignatureCheck(rawBodyString, signature, secret);

    if (!isSignatureValid) {
      console.error("Signature verification failed.");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const body = JSON.parse(rawBodyString);
    console.log("Webhook received safely & verified:", body);

    const eventName = body.meta?.event_name;
    const userId = body.meta?.custom_data?.user_id || body.meta?.custom_data?.userId;
    const planFromWebhook = body.meta?.custom_data?.plan || "premium"; 

    if (!userId) {
      console.log("Missing userId in payload meta data.");
      return res.status(200).json({ ignored: "missing userId" });
    }

    // -------------------------
    // IDEMPOTENCY (Using RTDB)
    // -------------------------
    const eventId = body.meta?.event_id;
    if (eventId) {
      const eventRef = rtdb.ref(`processed_events/${eventId}`);
      const snap = await eventRef.get();

      if (snap.exists()) {
        console.log(`Event ${eventId} already handled.`);
        return res.status(200).json({ skipped: true });
      }

      await eventRef.set({
        processed: true,
        timestamp: admin.database.ServerValue.TIMESTAMP
      });
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
        timestamp: admin.database.ServerValue.TIMESTAMP,
      });

      console.log(`Credited €${amount} to RTDB user ${userId}`);
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
      await rtdb.ref(`users/${userId}`).update({
        premium: true,
        tier: planFromWebhook, 
        premiumPlan: planFromWebhook,
        premiumSince: Date.now(),
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });
      console.log(`Successfully upgraded user ${userId} to plan: ${planFromWebhook}`);
    }

    if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
      await rtdb.ref(`users/${userId}`).update({
        premium: false,
        tier: "free",
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });
      console.log(`Downgraded user in RTDB: ${userId}`);
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Webhook execution crash:", err);
    return res.status(500).json({ error: "Server error" });
  }
}