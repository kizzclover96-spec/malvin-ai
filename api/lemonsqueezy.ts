import admin from "firebase-admin";
import crypto from "crypto";

// -------------------------------------------------------------
// Vercel Config: Disable automatic parsing to capture raw stream
// -------------------------------------------------------------
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to read the raw body stream
async function getRawBody(readable: any): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// -------------------------
// Firebase Initialization
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
// Signature Verification Engine
// -------------------------
const executeSignatureCheck = (rawBody: string, signature: string, secret: string): boolean => {
  try {
    if (!secret || !signature) return false;

    const hmac = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");

    const hmacBuffer = Buffer.from(hmac, "hex");
    const signatureBuffer = Buffer.from(signature, "hex");

    if (hmacBuffer.length !== signatureBuffer.length) return false;
  
    return crypto.timingSafeEqual(hmacBuffer, signatureBuffer);
  } catch (error) {
    console.error("Signature calculation error:", error);
    return false;
  }
};

// -------------------------
// Main Webhook Handler
// -------------------------
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Process Stream Buffers
    const rawBodyBuffer = await getRawBody(req);
    const rawBodyString = rawBodyBuffer.toString("utf8");

    const signature = (req.headers["x-signature"] || req.headers["X-Signature"] || "") as string;
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";

    // 2. Validate Signature Guard
    if (!executeSignatureCheck(rawBodyString, signature, secret)) {
      console.error("Signature verification failed.");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // 3. Safe Parse Payload
    const body = JSON.parse(rawBodyString);
    const eventName = body.meta?.event_name;
    
    // Fixed: Checking both snake_case and camelCase to protect user matching
    const userId = body.meta?.custom_data?.user_id || body.meta?.custom_data?.userId;

    if (!userId) {
      console.log("Ignored webhook event: Missing target user reference identifier.");
      return res.status(200).json({ ignored: "missing userId" });
    }

    console.log(`Processing event [${eventName}] for target profile: ${userId}`);

    // 4. Handle Subscription Logic Paths (Realtime Database Execution)
    const premiumActiveEvents = [
      "subscription_created",
      "subscription_updated",
      "subscription_payment_success"
    ];

    if (premiumActiveEvents.includes(eventName)) {
      await rtdb.ref(`users/${userId}`).update({
        premium: true,
        tier: "premium",
        premiumPlan: "gold",
        premiumSince: Date.now()
      });
      console.log(`Successfully upgraded user status inside Realtime Database: ${userId}`);
    }

    if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
      await rtdb.ref(`users/${userId}`).update({
        premium: false,
        tier: "free"
      });
      console.log(`Successfully downgraded user inside Realtime Database: ${userId}`);
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Webhook processing failure:", err);
    return res.status(500).json({ error: "Server error processing payload data details" });
  }
}