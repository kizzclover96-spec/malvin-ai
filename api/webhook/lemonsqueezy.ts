import admin from "firebase-admin";
import crypto from "crypto";

// -------------------------------------------------------------
// 🚨 Vercel Config: Disable automatic parsing to keep body raw
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
  });
}

const db = admin.firestore();

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
    // 1. Read the unmutated raw text directly from the inbound pipeline
    const rawBodyBuffer = await getRawBody(req);
    const rawBodyString = rawBodyBuffer.toString("utf8");

    // 2. Fetch the signature and secret headers
    const signature = (req.headers["x-signature"] as string) || "";
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";

    // 3. Execute signature validation against the clean raw body string
    const isSignatureValid: boolean = executeSignatureCheck(rawBodyString, signature, secret);

    if (!isSignatureValid) {
      console.error("Signature verification failed.");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // 4. Manually parse the validated string into a JSON object now that it's safe
    const body = JSON.parse(rawBodyString);
    console.log("Webhook received safely & verified:", body);

    const eventName = body.meta?.event_name;
    const userId = body.meta?.custom_data?.user_id || body.meta?.custom_data?.userId;

    if (!userId) {
      console.log("Missing userId in payload meta data.");
      return res.status(200).json({ ignored: "missing userId" });
    }

    // -------------------------
    // IDEMPOTENCY (Using Firestore)
    // -------------------------
    const eventId = body.meta?.event_id;
    if (eventId) {
      const eventDocRef = db.collection("processed_events").doc(eventId);
      const eventSnap = await eventDocRef.get();

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