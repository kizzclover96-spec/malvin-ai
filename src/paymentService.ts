// src/services/paymentService.ts
import { doc, runTransaction, serverTimestamp, collection } from "firebase/firestore";
import { firestore as db } from '../firebase'; // double check this path matches your setup

export const processWalletPayment = async (userId: string, businessId: string, amount: number) => {
  if (amount <= 0) throw new Error("Invalid transaction amount.");

  const userDocRef = doc(db, "users", userId);
  const businessDocRef = doc(db, "businesses", businessId);

  try {
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userDocRef);
      if (!userSnap.exists()) throw new Error("User document does not exist.");
      
      const currentBalance = userSnap.data().wallet?.balance || 0;
      if (currentBalance < amount) {
        throw new Error("Insufficient funds inside database ledger.");
      }

      const businessSnap = await transaction.get(businessDocRef);
      if (!businessSnap.exists()) throw new Error("Target counterparty business not found.");

      // Deduct from user
      transaction.update(userDocRef, {
        "wallet.balance": currentBalance - amount
      });

      // Add to business
      transaction.update(businessDocRef, {
        "wallet.balance": (businessSnap.data().wallet?.balance || 0) + amount
      });

      // Generate ledger entry
      const userTxRef = doc(collection(db, "users", userId, "walletTransactions"));
      transaction.set(userTxRef, {
        storeName: businessSnap.data().businessName || "Malvin Counterparty",
        amount: amount,
        type: "spent",
        timestamp: serverTimestamp()
      });
    });

    console.log("Transaction successfully completed!");
  } catch (error) {
    console.error("Payment pipeline execution aborted:", error);
    throw error;
  }
};