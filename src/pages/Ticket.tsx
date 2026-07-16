import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeSVG } from 'qrcode.react'; 
import { Download, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react'; 
import { firestore as db, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import { auth } from "../firebase";

export default function TicketCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null); 
  
  const [paymentStatus, setPaymentStatus] = useState("processing"); 
  const [errorMessage, setErrorMessage] = useState("");
  const [ticketDetails, setTicketDetails] = useState<any>(null);

  const payload = location.state || (() => {
    const saved = localStorage.getItem("pending_checkout_payload");
    return saved ? JSON.parse(saved) : null;
  })();
  
  const paymentTriggered = useRef(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeSuccess = urlParams.get("redirect_status") === "succeeded" || urlParams.get("session_id") !== null;

    if (!payload) {
      setPaymentStatus("error");
      setErrorMessage("No active checkout session data was found.");
      return;
    }

    if (paymentTriggered.current) return;
    paymentTriggered.current = true;

    const processCheckout = async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Unauthenticated user context.");

        if (payload.gateway === "stripe" && !stripeSuccess) {
          const createDirectPaymentSession = httpsCallable(functions, "createDirectPaymentSession");
          const res: any = await createDirectPaymentSession({
            amount: payload.amount,
            targetBusinessUid: payload.targetBusinessUid,
            merchantType: payload.merchantType || "salon",
            appointmentDetails: payload.appointmentDetails
          });

          if (res.data?.url) {
            window.location.href = res.data.url;
          } else {
            throw new Error("Unable to initialize direct Stripe session.");
          }
        } else if (payload.gateway === "wallet") {
          const processPaymentFn = httpsCallable(functions, "processPayment");
          const res: any = await processPaymentFn({
            targetBusinessUid: payload.targetBusinessUid,
            amount: payload.amount,
            merchantType: payload.merchantType || "salon",
            appointmentDetails: payload.appointmentDetails
          });

          if (res.data?.success) {
            setTicketDetails({
              ticketId: res.data.ticketId,
              ...payload
            });
            setPaymentStatus("success");
            localStorage.removeItem("pending_checkout_payload");
          } else {
            throw new Error("Wallet execution failed.");
          }
        } else {
          setTicketDetails(payload);
          setPaymentStatus("success");
          localStorage.removeItem("pending_checkout_payload");
        }
      } catch (err: any) {
        setPaymentStatus("error");
        setErrorMessage(err.message || "An unexpected transaction error occurred.");
      }
    };

    processCheckout();
  }, [payload]);

  const getQrCodeDataString = () => {
    if (!ticketDetails) return "";
    return JSON.stringify({
      ticketId: ticketDetails.ticketId,
      businessId: ticketDetails.targetBusinessUid,
      merchantType: ticketDetails.merchantType || "salon",
      amount: ticketDetails.amount
    });
  };

  const handleDownloadReceipt = () => {
    window.print();
  };

  if (paymentStatus === "processing") {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', background: '#f5f5f7' }}>
        <RefreshCw className="animate-spin" size={40} color="#000" />
        <p style={{ fontWeight: 'bold', fontSize: '15px' }}>Verifying your payment, please wait...</p>
      </div>
    );
  }

  if (paymentStatus === "error") {
    return (
      <div style={{ padding: '24px', textAlign: 'center', background: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 style={{ color: '#E53935' }}>Transaction Error</h2>
        <p>{errorMessage}</p>
        <button onClick={() => navigate("/")} style={{ marginTop: '20px', padding: '12px', background: '#111', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", padding: "20px", fontFamily: "system-ui", background: "#f8f9fa", minHeight: "100vh" }}>
      <header style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer" }}><ArrowLeft size={20} /></button>
        <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>Checkout Confirmed</h1>
      </header>

      <div ref={receiptRef} style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #eee", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          <CheckCircle size={48} color="#2e7d32" style={{ marginBottom: "12px" }} />
          <h2 style={{ fontSize: "20px", margin: "0 0 4px 0", color: "#2e7d32" }}>Payment Received</h2>
          <span style={{ fontSize: "12px", color: "#666" }}>Ticket ID: {ticketDetails?.ticketId}</span>
        </div>

        <div style={{ borderTop: "1px dashed #ddd", borderBottom: "1px dashed #ddd", padding: "16px 0", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#111", margin: "0 0 12px 0" }}>Order Summary</h3>
          {ticketDetails?.appointmentDetails?.services?.map((svc: any, idx: number) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
              <span>{svc.serviceName}</span>
              <span style={{ fontWeight: "bold" }}>€{svc.price.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "bold", marginTop: "16px", color: "#000" }}>
            <span>Total Paid</span>
            <span>€{ticketDetails?.amount?.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          {ticketDetails && (
            <QRCodeSVG 
              value={getQrCodeDataString()} 
              size={150}
              level={"M"}
              includeMargin={false}
            />
          )}
          <span style={{ fontSize: "11px", fontWeight: "bold", marginTop: "12px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>Scan at Counter</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
          <button 
            onClick={handleDownloadReceipt} 
            style={{ width: "100%", padding: "12px", background: "#111", color: "#fff", border: "1px solid #222", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "13px" }}
          >
            <Download size={14} /> Print Receipt / Pass
          </button>

          <button 
            onClick={() => navigate("/")} 
            style={{ width: "100%", padding: "14px", background: "#fff", color: "#000", border: "none", borderRadius: "12px", fontWeight: 900, cursor: "pointer", fontSize: "13px" }}
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}