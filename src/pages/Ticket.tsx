import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, firestore as db } from "../firebase";
import { doc, collection, runTransaction, serverTimestamp } from "firebase/firestore";

export default function TicketCheckout({ onExecuteWalletPayment }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState("processing"); // 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [ticketDetails, setTicketDetails] = useState<any>(null);

  // Extract payload state safely when page mounts
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
        // Trigger the shared balance deduction handler using fresh auth context
        await onExecuteWalletPayment(payload.totalPrice, payload.targetBusinessUid);
        
        // 🟢 Generate the digital ticket node in Firestore right here
        const currentUser = auth.currentUser;
        if (currentUser) {
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

          // Update localized state to append ticket tracking token to receipt UI
          setTicketDetails(prev => ({ ...prev, ticketId }));
        }

        setPaymentStatus("success");
      } catch (error: any) {
        setPaymentStatus("error");
        setErrorMessage(error.message || "Wallet transaction rejected.");
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
        <button onClick={() => navigate(-1)} style={{ padding: "10px 20px", background: "#fff", color: "#000" }}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", background: "#000", color: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ border: "2px dashed #fff", padding: "30px", borderRadius: "12px", width: "100%", maxWidth: "400px", background: "#111" }}>
        <h1 style={{ textAlign: "center", color: "#4BB543" }}>✓ APPOINTMENT CONFIRMED</h1>
        <hr style={{ borderColor: "#333" }} />
        <p><strong>Ticket ID:</strong> {ticketDetails?.ticketId}</p>
        <p><strong>Total Paid:</strong> ${ticketDetails?.totalPrice}</p>
        <p><strong>Stylist:</strong> {ticketDetails?.stylist?.name || "Any available"}</p>
        <p><strong>Duration:</strong> {ticketDetails?.duration} mins</p>
        <button onClick={() => navigate("/")} style={{ width: "100%", padding: "12px", marginTop: "20px", background: "#fff", color: "#000", border: "none", borderRadius: "6px", fontWeight: "bold" }}>
          Return to Home
        </button>
      </div>
    </div>
  );
}