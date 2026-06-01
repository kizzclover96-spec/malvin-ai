import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();
const db = admin.firestore();

// We will set this environment variable in the next step
const LEMON_SQUEEZY_WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

export const lemonSqueezyWebhook = onRequest({ cors: true }, async (req, res) => {
  try {
    // 1. Verify the signature
    const secret = LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("Missing LEMON_SQUEEZY_WEBHOOK_SECRET environment variable.");
      res.status(500).send("Configuration Error");
      return;
    }

    const hmac = crypto.createHmac("sha256", secret);
    // Cloud Functions v2 stores the unparsed body in req.rawBody
    const digest = Buffer.from(hmac.update((req as any).rawBody).digest("hex"), "utf8");
    const signature = Buffer.from(req.get("X-Signature") || "", "utf8");

    if (digest.length !== signature.length || !crypto.timingSafeEqual(digest, signature)) {
      res.status(401).send("Unauthorized Signature");
      return;
    }

    const eventName = req.body.meta?.event_name;
    const customData = req.body.meta?.custom_data;
    const userId = customData ? customData.user_id : null;

    if (!userId) {
      console.log("No user_id found in custom data.");
      res.status(200).send("No user_id provided.");
      return;
    }

    // 2. Process events
    if (eventName === "order_created" || eventName === "subscription_created") {
      await db.collection("users").doc(userId).set({
        premium: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`Successfully upgraded user ${userId} to Premium.`);
    } 
    else if (eventName === "subscription_expired" || eventName === "subscription_cancelled") {
      await db.collection("users").doc(userId).update({
        premium: false
      });
      console.log(`Downgraded user ${userId} from Premium.`);
    }

    res.status(200).send("Webhook processed successfully.");
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Internal Server Error");
  }
});