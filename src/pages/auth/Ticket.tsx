import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeSVG } from 'qrcode.react'; 
import { Download, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react'; 

// 1. IMPORT FIRESTORE DEPENDENCIES
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { firestore as db } from "../../firebase"; // Adjust path to match your configuration

export default function TicketCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null); 
  
  const [paymentStatus, setPaymentStatus] = useState("processing"); 
  const [errorMessage, setErrorMessage] = useState("");
  const [ticketDetails, setTicketDetails] = useState<any>(null);

  // 🟢 State Recovery: Check location state first. If empty, check localStorage.
  const payload = location.state || (() => {
    const saved = localStorage.getItem("pending_checkout_payload");
    return saved ? JSON.parse(saved) : null;
  })();
  
  const paymentTriggered = useRef(false);

  useEffect(() => {
    // Check if we came back from a successful Stripe session in the URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const stripeSuccess = urlParams.get("redirect_status") === "succeeded" || urlParams.get("session_id") !== null;

    if (!payload || !payload.targetBusinessUid) {
      setPaymentStatus("error");
      setErrorMessage("No active checkout details found.");
      return;
    }

    setTicketDetails(payload);

    // 🟢 STRIPE REDIRECT SUCCESS HANDOFF:
    if (stripeSuccess) {
      localStorage.removeItem("pending_checkout_payload");

      const confirmPaymentInFirestore = async () => {
        try {
          const isFoodStore = payload.fromStore === true || payload.merchantType === "food";

          if (isFoodStore) {
            // 🍔 FOOD STOREFLOW: Write the food order directly to the 'orders' database collection
            const { collection, addDoc } = await import("firebase/firestore");
            const fourDigitPin = Math.floor(1000 + Math.random() * 9000).toString();
            
            // Cache customer name locally so they can track their active orders on next load
            if (payload.customerName) {
              localStorage.setItem('saved_customer_name', payload.customerName.trim());
            }

            await addDoc(collection(db, 'orders'), {     // Used by Food.tsx (Merchant Dashboard)
              targetBusinessUid: payload.targetBusinessUid,
              restaurantUid: payload.targetBusinessUid,
              customerName: payload.customerName,
              pickupTime: payload.time || payload.pickupTime || "",
              status: 'pending',
              items: (payload.services || []).map((s: any) => ({
                name: s.serviceName || s.name,
                quantity: s.quantity || 1,
                price: s.price
              })),
              fourDigitCode: fourDigitPin,
              totalPaid: payload.totalPrice || payload.amount,
              paymentStatus: 'paid',
              userMobilityStatus: payload.userMobilityStatus || "home",
              tableNumber: payload.tableNumber || "",
              customerUid: payload.customerUid,
              createdAt: new Date().toISOString()
            });

            // 🍔 FOOD COOLDOWN TRACKING:
            const restaurantDocRef = doc(db, 'restaurants', payload.targetBusinessUid);
            const restaurantSnap = await getDoc(restaurantDocRef);

            if (restaurantSnap.exists()) {
              const restData = restaurantSnap.data();
              let currentCycleCount = (restData.currentCycleCount || 0) + 1;
              let cooldownExpiresAt = restData.cooldownExpiresAt || null;

              if (cooldownExpiresAt && new Date() > new Date(cooldownExpiresAt)) {
                currentCycleCount = 1; 
                cooldownExpiresAt = null;
              }

              // Cooldown starts on the 10th order
              if (currentCycleCount >= 10 && !cooldownExpiresAt) {
                const tomorrow = new Date();
                tomorrow.setHours(tomorrow.getHours() + 24);
                cooldownExpiresAt = tomorrow.toISOString();
              }

              await updateDoc(restaurantDocRef, {
                currentCycleCount: currentCycleCount,
                cooldownExpiresAt: cooldownExpiresAt,
                orderLimitReached: currentCycleCount >= 10
              });
            }

          } else {
            // 💇 SALON FLOW: Update the existing, pre-staged appointment document status to paid
            const customerUid = payload.customerUid || payload.userUid;
            const appointmentId = payload.appointmentId || payload.ticketId;

            if (customerUid && appointmentId) {
              const appointmentDocRef = doc(db, 'customers', customerUid, 'appointments', appointmentId);
              await updateDoc(appointmentDocRef, { paymentStatus: true, status: "paid" });
            }

            // 💇 SALON COOLDOWN TRACKING:
            const salonDocRef = doc(db, 'salons', payload.targetBusinessUid);
            const salonSnap = await getDoc(salonDocRef);

            if (salonSnap.exists()) {
              const salonData = salonSnap.data();
              let currentCycleCount = (salonData.currentCycleCount || 0) + 1;
              let cooldownExpiresAt = salonData.cooldownExpiresAt || null;

              // Check if active cooldown has already finished
              if (cooldownExpiresAt && new Date() > new Date(cooldownExpiresAt)) {
                currentCycleCount = 1;
                cooldownExpiresAt = null;
              }

              // Cooldown starts on the 10th order/appointment
              if (currentCycleCount >= 10 && !cooldownExpiresAt) {
                const tomorrow = new Date();
                tomorrow.setHours(tomorrow.getHours() + 24);
                cooldownExpiresAt = tomorrow.toISOString();
              }

              await updateDoc(salonDocRef, {
                currentCycleCount: currentCycleCount,
                cooldownExpiresAt: cooldownExpiresAt,
                appointmentLimitReached: currentCycleCount >= 10 // Aligns with salon UI blocks
              });
            }
          }
        } catch (error) {
          console.error("Failed to write/update checkout logs in Firestore:", error);
        } finally {
          // 🏠 Navigate back to Front.tsx ("/") immediately after database operations complete
          navigate("/", {
            state: {
              flowStep: "front",
              paymentConfirmed: true
            }
          });
        }
      };

      confirmPaymentInFirestore();
      return;
    }
    // 1. Delegate Payment Request to Parent (Iframe setup)
    const delegatePaymentToParent = () => {
      if (paymentTriggered.current) return;
      paymentTriggered.current = true;

      setPaymentStatus("redirecting");
      console.log("Delegating secure payment session creation to parent container...");

      // Save the payload to localStorage right before leaving the app for Stripe
      localStorage.setItem("pending_checkout_payload", JSON.stringify(payload));

      const inferredMerchantType = payload.fromStore ? "food" : "salon";

      // Post payload securely up to the Parent Shell
      window.parent.postMessage({
        type: "REQUEST_DIRECT_PAYMENT",
        payload: {
          amount: payload.totalPrice,
          targetBusinessUid: payload.targetBusinessUid,
          merchantType: inferredMerchantType,
          appointmentDetails: {
            services: payload.services || [],
            stylist: payload.stylist || "any",
            duration: payload.duration || 0,
            pickupTime: payload.pickupTime || "",
            tableNumber: payload.tableNumber || ""
          }
        }
      }, "*");
    };

    // 2. Listen for Parent-side errors
    const handleParentResponse = (event: MessageEvent) => {
      if (event.data?.type === "DIRECT_PAYMENT_FAILURE") {
        setPaymentStatus("error");
        setErrorMessage(event.data.error || "An error occurred starting checkout.");
        localStorage.removeItem("pending_checkout_payload"); 
        paymentTriggered.current = false; 
      }
    };

    window.addEventListener("message", handleParentResponse);
    delegatePaymentToParent();

    return () => window.removeEventListener("message", handleParentResponse);
  }, [payload, navigate]);

  // Helper QR string function
  const getQrCodeDataString = () => {
    return JSON.stringify({
      ticketId: ticketDetails?.ticketId,
      businessUid: ticketDetails?.targetBusinessUid
    });
  };

  const handleDownloadReceipt = () => {
    // Implement your download code here
  };

  if (paymentStatus === "redirecting" || paymentStatus === "processing") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#000", color: "#fff" }}>
        <RefreshCw className="animate-spin" size={40} style={{ marginBottom: "16px" }} />
        <h2>Redirecting to Secure Payment...</h2>
        <p style={{ color: "#888" }}>We are launching Stripe to safely process your payment.</p>
      </div>
    );
  }

  if (paymentStatus === "error") {
    return (
      <div style={{ padding: "24px", background: "#050505", color: "#fff", height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", fontFamily: "sans-serif" }}>
        <h2 style={{ color: "#E53935", fontSize: "24px", fontWeight: 900 }}>Checkout Failed</h2>
        <p style={{ color: "#aaa", fontSize: "14px", margin: "12px 0 24px", textAlign: "center", maxWidth: "320px" }}>{errorMessage}</p>
        <button onClick={() => navigate(-1)} style={{ padding: "12px 24px", background: "#fff", color: "#000", border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 16px", background: "#050505", color: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", fontFamily: "sans-serif" }}>
      <div ref={receiptRef} style={{ border: "1px solid #222", padding: "clamp(16px, 5vw, 32px)", borderRadius: "24px", width: "95%", maxWidth: "460px", background: "#0c0c0c", boxShadow: "0 20px 40px rgba(0,0,0,0.5)", boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(75,181,67,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
            <CheckCircle color="#4BB543" size={24} />
          </div>
          <h1 style={{ textTransform: "uppercase", letterSpacing: "1px", color: "#4BB543", fontSize: "14px", fontWeight: 900, textAlign: "center" }}>Appointment Confirmed</h1>
        </div>

        <hr style={{ borderColor: "#1a1a1a", margin: "20px 0" }} />
        
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "14px" }}>
          <p style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: 0 }}><span style={{ color: "#666" }}>Ticket ID:</span> <span style={{ fontWeight: "bold", textAlign: "right", wordBreak: "break-all", marginLeft: "16px" }}>{ticketDetails?.ticketId}</span></p>
          <p style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: 0 }}><span style={{ color: "#666" }}>Stylist:</span> <span style={{ fontWeight: "bold", textAlign: "right", marginLeft: "16px" }}>{ticketDetails?.stylist || "Any available"}</span></p>
          <p style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: 0 }}><span style={{ color: "#666" }}>Duration:</span> <span style={{ fontWeight: "bold", textAlign: "right", marginLeft: "16px" }}>{ticketDetails?.duration} mins</span></p>
          
          <div style={{ margin: "8px 0", borderTop: "1px dashed #222", paddingTop: "12px" }}>
            <span style={{ color: "#666", fontSize: "12px", display: "block", marginBottom: "6px" }}>Services:</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {ticketDetails?.services?.map((service: any, index: number) => (
                <div key={index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", background: "#111", padding: "8px 12px", borderRadius: "8px", gap: "8px" }}>
                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{service.serviceName || service.name}</span>
                  <span style={{ fontWeight: "bold", flexShrink: 0 }}>€{service.price}</span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0 0", paddingTop: "12px", borderTop: "1px solid #1a1a1a" }}>
            <span style={{ color: "#fff", fontWeight: "bold" }}>Total Amount Paid:</span> 
            <span style={{ fontWeight: 900, color: "#fff", fontSize: "18px" }}>€{ticketDetails?.totalPrice}</span>
          </p>
        </div>
        
        <div style={{ background: "#fff", color: "#000", padding: "24px", margin: "24px 0 16px", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {ticketDetails && (
            <QRCodeSVG 
              value={getQrCodeDataString()} 
              size={150}
              level={"M"}
              includeMargin={false}
            />
          )}
          <span style={{ fontSize: "11px", fontWeight: "bold", marginTop: "12px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>Scan at reception front desk</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
          <button 
            onClick={handleDownloadReceipt} 
            style={{ width: "100%", padding: "12px", background: "#111", color: "#fff", border: "1px solid #222", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "13px" }}
          >
            <Download size={14} /> Download Pass
          </button>

          <button 
            onClick={() => navigate("/")} 
            style={{ width: "100%", padding: "14px", background: "#fff", color: "#000", border: "none", borderRadius: "12px", fontWeight: 900, cursor: "pointer", fontSize: "13px" }}
          >
            Return to Home
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}