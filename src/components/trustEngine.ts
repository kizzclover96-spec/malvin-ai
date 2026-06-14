import { db } from "../firebase";
import { ref, get, set } from "firebase/database";

const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
};

export const updateUserTrust = async (userId: string) => {
    const trustRef = ref(db, `users/${userId}/trust`);

    const snap = await get(trustRef);
    const trust = snap.val() || {};

    const currentMonth = getCurrentMonth();

    // ✅ RESET LOGIC
    if (trust.lastResetMonth !== currentMonth) {
        await set(trustRef, {
            ...trust,
            score: 100,
            reports: 0,
            lastResetMonth: currentMonth,
            status: "green"
        });
        return;
    }

    // continue normal calculation
    const reports = trust.reports || 0;
    const orders = trust.successfulOrders || 0;
    const accountAge = trust.accountAgeDays || 1;

    let reportCount = reports;

    let score =
        (orders * 5) +
        (accountAge * 2) -
        (reportCount * 20);

    score = Math.max(0, Math.min(100, score));

    let status: "green" | "yellow" | "red" = "yellow";

    if (score >= 70) status = "green";
    else if (score < 40) status = "red";

    await set(trustRef, {
        ...trust,
        score,
        reports: reportCount,
        accountAgeDays: accountAge,
        status,
        lastResetMonth: currentMonth
    });
};