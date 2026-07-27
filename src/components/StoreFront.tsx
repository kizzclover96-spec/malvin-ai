import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions'; // 👈 Added Firebase imports
import { getAuth } from 'firebase/auth';

interface StoreFrontProps {
  businessUid: string;
  userUid: string;
  userWalletBalance: number;
  onExecutePayment: (
    amount: number,
    businessId: string
  ) => Promise<void>;
  onExit: () => void;
}

export const StoreFront: React.FC<StoreFrontProps> = ({ businessUid, userUid, onExit }) => {
  const targetUrl = businessUid.startsWith('http://') || businessUid.startsWith('https://') ? businessUid : `https://${businessUid}`;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
 
  useEffect(() => {
    const listener = async (event: MessageEvent) => {
      // 1. Identity handshake when the iframe loaded is ready
      if (event.data?.type === "SALON_READY") {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "MALVIN_USER",
            uid: userUid
          },
          "*"
        );
        console.log("Salon requested identity:", userUid);
      }

      // 2. 🔐 SECURE PARENT PAYMENT DELEGATION (Option C)
      if (event.data?.type === "REQUEST_DIRECT_PAYMENT") {
        console.log("Parent received payment request. Verifying authentication...");
        const payload = event.data.payload;

        try {
          const auth = getAuth();
          
          // Ensure Firebase Auth client state is populated
          if (!auth.currentUser) {
            throw new Error("Authentication state is not ready or user is logged out.");
          }

          const functions = getFunctions();
          const createDirectPaymentSession = httpsCallable(functions, 'createDirectPaymentSession');

          // Run function securely from parent shell. 
          // Firebase SDK now properly attaches the ID token.
          const response = await createDirectPaymentSession({
            amount: payload.amount,
            targetBusinessUid: payload.targetBusinessUid,
            merchantType: payload.merchantType,
            appointmentDetails: payload.appointmentDetails
          });

          const resultData = response.data as any;

          if (resultData && resultData.url) {
            console.log("Stripe Session successfully created. Redirecting top-level screen...");
            window.top!.location.href = resultData.url;
          } else {
            throw new Error("Invalid payment gateway URL returned.");
          }
        } catch (error: any) {
          console.error("Parent payment setup failure:", error);
          
          iframeRef.current?.contentWindow?.postMessage({
            type: "DIRECT_PAYMENT_FAILURE",
            error: error.message || "An error occurred starting checkout."
          }, "*");
        }
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [userUid]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="fixed inset-0 w-screen h-[100dvh] bg-white text-black font-sans z-50 flex flex-col overflow-hidden overscroll-y-contain"
    >
      {/* MINIMAL MOBILE TOP HEADER BAR */}
      <div className="w-full h-14 border-b border-neutral-100 px-4 flex items-center justify-between shrink-0 bg-white">
        <button 
          onClick={onExit}
          className="p-2.5 -ml-2.5 hover:bg-neutral-100 active:scale-95 text-neutral-800 rounded-full transition-all flex items-center justify-center"
          aria-label="Go Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <div className="w-10 h-10" />
      </div>

      {/* MOBILE OPTIMIZED IFRAME VIEWPORT */}
      <div className="flex-1 w-full relative bg-neutral-50 overflow-hidden">
        <iframe 
            ref={iframeRef}
            src={targetUrl}
            title="In-App Store Webview Content"
            className="w-full h-full border-none m-0 p-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation allow-top-navigation-by-user-activation"
            allow="clipboard-write; camera; microphone; geolocation"
        />
      </div>
    </motion.div>
  );
};