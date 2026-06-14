import { db } from "../firebase";
import { ref, get, set } from "firebase/database";

export const updateUserTrust = async (userId: string) => {
    const trustRef = ref(db, `users/${userId}/trust`);
    const reportsRef = ref(db, `reports`);

    const trustSnap = await get(trustRef);
    const reportsSnap = await get(reportsRef);

    const trust = trustSnap.val() || {};
    const reports = reportsSnap.val() || {};

    let reportCount = 0;

    Object.values(reports).forEach((r: any) => {
        if (r.reportedUserId === userId) {
            reportCount++;
        }
    });

    const orders = trust.successfulOrders || 0;
    const accountAge = trust.accountAgeDays || 1;

    // 🧠 SIMPLE TRUST FORMULA
    let score =
        (orders * 5) +
        (accountAge * 2) -
        (reportCount * 20);

    if (score > 100) score = 100;
    if (score < 0) score = 0;

    let status: "green" | "yellow" | "red" = "yellow";

    if (score >= 70) status = "green";
    else if (score < 40) status = "red";

    await set(trustRef, {
        score,
        reports: reportCount,
        accountAgeDays: accountAge,
        status
    });
};