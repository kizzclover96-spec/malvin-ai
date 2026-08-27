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

    const reports = trust.reports || 0;
    const orders = trust.successfulOrders || 0;
    const accountAge = trust.accountAgeDays || 1;

    // 🔥 MONTH RESET (ONLY SOURCE OF RESET)
    if (trust.lastResetMonth !== currentMonth) {
        const resetData = {
            ...trust,
            score: 100,
            status: "green",
            reports: 0,
            lastResetMonth: currentMonth
        };

        await set(trustRef, resetData);
        return;
    }

    // 🧠 TRUST CALCULATION
    let score =
        (orders * 5) +
        (accountAge * 2) -
        (reports * 20);

    score = Math.max(0, Math.min(100, score));

    let status: "green" | "yellow" | "red" = "yellow";

    if (score >= 70) status = "green";
    else if (score < 40) status = "red";

    await set(trustRef, {
        ...trust,
        score,
        reports,
        accountAgeDays: accountAge,
        status,
        lastResetMonth: currentMonth
    });
};