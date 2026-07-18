import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export function useBusinessWallet({ merchantType }: { merchantType: "food" | "salon" }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("EUR");
  
  // 🟢 1. Initialize a safe fallback object so dashboard properties never evaluate to undefined
  const [stripeBalance, setStripeBalance] = useState<{ available: number; pending: number }>({
    available: 0,
    pending: 0,
  });

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const functions = getFunctions();
        const getStripeBalance = httpsCallable(functions, "getStripeAccountBalance");
        
        // Passing merchantType here is critical!
        const response = await getStripeBalance({ merchantType });
        
        // 🟢 2. Type-cast the response from the Cloud Function to extract the breakdown
        const data = response.data as { 
          totalBalance: number; 
          availableBalance: number; 
          pendingBalance: number; 
        };

        // This stays completely untouched, preserving your existing layout's total balance read
        setBalance(data.totalBalance);
        
        // 🟢 3. Populate the breakdown object with real numbers or fallback to 0
        setStripeBalance({
          available: data.availableBalance ?? 0,
          pending: data.pendingBalance ?? 0
        });

      } catch (error) {
        console.error("Error fetching Stripe balance:", error);
      }
    };

    fetchBalance();
  }, [merchantType]);

  // 🟢 4. Return everything safely. Your old balance is still here, plus the new breakdown properties!
  return { balance, currency, stripeBalance };
}