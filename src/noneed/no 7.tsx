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
        //const stripeAccountId = data?.stripeAccountId;
        //const payoutsEnabled = data?.payoutsEnabled ?? data?.payouts_enabled;
        
        // Unified Hash Verification
        const { hashedPin, salt } = securityData!;
        const incomingPinHash = hashPin(pin, salt);

        if (!hashedPin || incomingPinHash !== hashedPin) {
          throw new HttpsError("permission-denied", "Incorrect secret PIN.");
        }
        /*
        if (!stripeAccountId || !payoutsEnabled) {
          throw new HttpsError("failed-precondition", "Stripe payout account is not fully setup.");
        }
        */

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
