import admin from "firebase-admin";

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

export default async function handler(req: any, res: any) {
  try {
    const body = req.body;

    console.log("Webhook received:", body);

    const eventName = body.meta?.event_name;

    // PAYMENT SUCCESS
    if (eventName === "subscription_created") {
      const userId =
        body.meta?.custom_data?.userId;

      if (!userId) {
        return res.status(400).json({
          error: "Missing userId",
        });
      }

      await db.collection("users").doc(userId).update({
        premium: true,
        premiumPlan: "gold",
        premiumSince: new Date(),
      });

      console.log("User upgraded:", userId);
    }

    // SUBSCRIPTION CANCELLED
    if (eventName === "subscription_cancelled") {
      const userId =
        body.meta?.custom_data?.userId;

      if (userId) {
        await db.collection("users").doc(userId).update({
          premium: false,
        });
      }
    }

    return res.status(200).json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Server error",
    });
  }
}