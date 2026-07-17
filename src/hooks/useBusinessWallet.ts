import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export function useBusinessWallet({ merchantType }: { merchantType: "food" | "salon" }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("EUR");

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const functions = getFunctions();
        const getStripeBalance = httpsCallable(functions, "getStripeAccountBalance");
        
        // Passing merchantType here is critical!
        const response = await getStripeBalance({ merchantType });
        
        const data = response.data as { availableBalance: number };
        setBalance(data.availableBalance);
      } catch (error) {
        console.error("Error fetching Stripe balance:", error);
      }
    };

    fetchBalance();
  }, [merchantType]);

  return { balance, currency };
}