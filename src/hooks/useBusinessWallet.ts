import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore, auth } from "../firebase";

export function useBusinessWallet() {
    const [balance, setBalance] = useState(0);
    const [currency, setCurrency] = useState("EUR");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (!user) {
                setLoading(false);
                return;
            }

            // 🟢 FIXED: Listen to the "salons" collection using the logged-in merchant's UID
            const unsubscribeWallet = onSnapshot(
                doc(firestore, "salons", user.uid),
                (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        
                        // 🟢 FIXED: Read directly from the updated "walletBalance" property
                        setBalance(data.walletBalance ?? 0);
                        setCurrency(data.currency ?? "EUR");
                    }
                    setLoading(false);
                },
                (error) => {
                    console.error("Error listening to business wallet:", error);
                    setLoading(false);
                }
            );

            return unsubscribeWallet;
        });

        return unsubscribeAuth;
    }, []);

    return {
        balance,
        currency,
        loading
    };
}