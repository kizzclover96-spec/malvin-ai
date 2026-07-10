import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, firestore as db } from "../firebase";
import { doc, collection, runTransaction, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function TicketCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState("processing"); // 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [ticketDetails, setTicketDetails] = useState<any>(null);

  // Secure Cloud Function Runner
  const handleWalletPayment = async (targetBusinessUid: string, amount: number) => {
    const functions = getFunctions();
    const processPayment = httpsCallable(functions, 'processPayment');

    try {
      console.log("Sending transaction request to secure backend...");
      const response = await processPayment({
        targetBusinessUid: targetBusinessUid,
        amount: amount
      });

      if (response.data && (response.data as any).success) {
        console.log("Payment settled successfully via Cloud Functions!");
        return { success: true };
      }
      return { success: false };
    } catch (error: any) {
      console.error("Payment transaction failed:", error.message);
      return { success: false, error: error.message };
    }
  };

  const payload = location.state;

    useEffect(() => {
        if (!payload || !payload.targetBusinessUid) {
            setPaymentStatus("error");
            setErrorMessage("No active checkout details found.");
            return;
        }

        setTicketDetails(payload);

        const processAutoPayment = async () => {
            try {
            // 1. Force check the current memory state first
            let currentUser = auth.currentUser;

            // 2. If it's lagging, wait for it to hydrate up to 3 seconds before failing
            if (!currentUser) {
                await new Promise<void>((resolve) => {
                const unsubscribe = auth.onAuthStateChanged((user) => {
                    if (user) currentUser = user;
                    unsubscribe();
                    resolve();
                });
                setTimeout(resolve, 3000); // safety fallback timeout
                });
            }

            if (!currentUser) {
                setPaymentStatus("error");
                setErrorMessage("Payment failed: Firebase Auth session not initialized in time.");
                return;
            }

            console.log(`Auth synchronized for UID: ${currentUser.uid}. Triggering function...`);
            
            const paymentResult = await handleWalletPayment(payload.targetBusinessUid, payload.totalPrice);

            if (!paymentResult.success) {
                setPaymentStatus("error");
                setErrorMessage(paymentResult.error || "Wallet payment rejected.");
                return;
            }
            
            const ticketId = `SAL-${Math.floor(100000 + Math.random() * 900000)}`;
            const appointmentRef = doc(collection(db, "salonAppointments", currentUser.uid, "appointments"));
            
            await runTransaction(db, async (transaction) => {
                transaction.set(appointmentRef, {
                ticketId: ticketId,
                businessId: payload.targetBusinessUid,
                services: payload.services,
                stylist: payload.stylist,
                duration: payload.duration,
                totalPaid: payload.totalPrice,
                status: "paid",
                createdAt: serverTimestamp()
                });
            });

            setTicketDetails(prev => ({ ...prev, ticketId }));
            setPaymentStatus("success");
            } catch (error: any) {
            setPaymentStatus("error");
            setErrorMessage(error.message || "An unexpected error occurred during checkout.");
            }
        };

        processAutoPayment();
    }, [payload]);

  if (paymentStatus === "processing") {
    return (
      <div style={{ background: "#000", height: "100vh", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h2>Securing your booking and processing wallet payment...</h2>
      </div>
    );
  }

  if (paymentStatus === "error") {
    return (
      <div style={{ padding: "20px", background: "#000", color: "#fff", height: "100vh" }}>
        <h2 style={{ color: "red" }}>Checkout Failed</h2>
        <p>{errorMessage}</p>
        <button onClick={() => navigate(-1)} style={{ padding: "10px 20px", background: "#fff", color: "#000", border: "none", cursor: "pointer" }}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", background: "#000", color: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ border: "2px dashed #fff", padding: "30px", borderRadius: "12px", width: "100%", maxWidth: "400px", background: "#111" }}>
        <h1 style={{ textAlign: "center", color: "#4BB543", fontSize: "20px" }}>✓ APPOINTMENT CONFIRMED</h1>
        <hr style={{ borderColor: "#333", margin: "20px 0" }} />
        
        <p><strong>Ticket ID:</strong> {ticketDetails?.ticketId}</p>
        <p><strong>Total Paid:</strong> €{ticketDetails?.totalPrice}</p>
        <p><strong>Stylist:</strong> {ticketDetails?.stylist || "Any available"}</p>
        <p><strong>Duration:</strong> {ticketDetails?.duration} mins</p>
        
        {/* 📲 QR CODE PLACEHOLDER SECTION */}
        <div style={{ background: "#fff", color: "#000", padding: "20px", margin: "20px 0", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "150px", height: "150px", background: "#ccc", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
            [ QR Code Component ]
          </div>
          <span style={{ fontSize: "11px", marginTop: "8px", color: "#666" }}>Scan at reception desk</span>
        </div>

        <button onClick={() => navigate("/")} style={{ width: "100%", padding: "12px", marginTop: "10px", background: "#fff", color: "#000", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          Return to Home
        </button>
      </div>
    </div>
  );
}