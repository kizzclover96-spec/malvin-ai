import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { QRCodeSVG } from 'qrcode.react'; 
import { Download, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react'; 

export default function TicketCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null); 
  
  const [paymentStatus, setPaymentStatus] = useState("processing"); 
  const [errorMessage, setErrorMessage] = useState("");
  const [ticketDetails, setTicketDetails] = useState<any>(null);

  const payload = location.state;
  // 🛑 GUARD AGAINST DOUBLE MOUNT INJECTIONS:
  const paymentTriggered = useRef(false);

  useEffect(() => {
    if (!payload || !payload.targetBusinessUid) {
      setPaymentStatus("error");
      setErrorMessage("No active checkout details found.");
      return;
    }

    setTicketDetails(payload);

    const processAutoPayment = async () => {
      // Prevent subsequent parallel execution calls
      if (paymentTriggered.current) return;
      paymentTriggered.current = true;

      try {
        // Enforce pulling the authentic context UID from the active session loop
        // Simplified safety check: just ensure it is a non-empty string
        const activeUid = auth.currentUser?.uid || payload?.customerUid || payload?.userUid;

        if (!activeUid || typeof activeUid !== 'string' || activeUid.trim() === '') {
            setPaymentStatus("error");
            setErrorMessage("Payment failed: Customer identity verification missing.");
            return;
        }

        console.log(`Identity verified: ${activeUid}. Triggering function...`);
        
        const functions = getFunctions();
        const processPayment = httpsCallable(functions, 'processPayment');

        const response = await processPayment({
          targetBusinessUid: payload.targetBusinessUid,
          amount: payload.totalPrice,
          fallbackCustomerUid: activeUid, 
          appointmentDetails: {
            services: payload.services,
            stylist: payload.stylist,
            duration: payload.duration
          }
        });

        const resultData = response.data as any;

        if (resultData && resultData.success) {
          if (payload.fromStore) {
            navigate(`/store/${payload.targetBusinessUid}`, { 
              state: { paymentConfirmed: true, orderPayload: payload },
              replace: true 
            });
          } else {
            setTicketDetails((prev: any) => ({ ...prev, ticketId: resultData.ticketId }));
            setPaymentStatus("success");
          }
        } else {
          setPaymentStatus("error");
          setErrorMessage("Wallet payment processing was rejected by the server ledger.");
        }
      } catch (error: any) {
        setPaymentStatus("error");
        setErrorMessage(error.message || "An unexpected error occurred during checkout.");
      }
    };

    processAutoPayment();
  }, [payload, navigate]);

  const handleDownloadReceipt = () => {
    if (!ticketDetails) return;

    const receiptText = `
========================================
         MALVIN APPOINTMENT PASS        
========================================
Ticket ID: ${ticketDetails.ticketId || "N/A"}
Stylist: ${ticketDetails.stylist || "Any Available"}
Duration: ${ticketDetails.duration} mins
Total Paid: €${ticketDetails.totalPrice}

SERVICES CHOSEN:
${ticketDetails.services?.map((s: any) => `- ${s.serviceName || s.name} (€${s.price})`).join("\n")}

----------------------------------------
Scan the QR code on your app frame at 
the store reception front desk to check-in.
========================================
    `;

    const blob = new Blob([receiptText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Malvin-Ticket-${ticketDetails.ticketId || "Receipt"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getQrCodeDataString = () => {
    if (!ticketDetails) return "";
    return JSON.stringify({
      tId: ticketDetails.ticketId,
      bId: ticketDetails.targetBusinessUid,
      cId: auth.currentUser?.uid || ticketDetails.customerUid,
      stylist: ticketDetails.stylist,
      price: ticketDetails.totalPrice
    });
  };

  if (paymentStatus === "processing") {
    return (
      <div style={{ background: "#050505", height: "100vh", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <RefreshCw style={{ animation: "spin 2s linear infinite", marginBottom: "16px", color: "#E53935" }} size={32} />
        <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Processing settlement ledger...</h2>
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