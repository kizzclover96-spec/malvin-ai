import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

interface StoreFrontProps {
  businessUid: string;
  onExit: () => void;
  // Passed by Front.tsx alongside businessUid/onExit — accepted here so the
  // component's prop type actually matches how it's called. Not wired into
  // any behavior yet (see note below); currently REQUEST_DIRECT_PAYMENT
  // always goes through the internal createDirectPaymentSession + Stripe
  // redirect path regardless of these.
  userUid?: string;
  userWalletBalance?: number;
  onExecutePayment?: (amount: number, targetBusinessUid: string, customerUid: string) => Promise<void>;
}

export const StoreFront: React.FC<StoreFrontProps> = ({ businessUid, onExit, userUid, userWalletBalance, onExecutePayment }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUntrustedDomain, setIsUntrustedDomain] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // 1. Sanitize & Parse Target URL
  const targetUrl = businessUid.startsWith('http://') || businessUid.startsWith('https://') 
    ? businessUid 
    : `https://${businessUid}`;

  // 🛡️ SECURITY FILTER: Check if destination domain is trusted
  useEffect(() => {
    try {
      const parsedUrl = new URL(targetUrl);

      // Add your official domains or allowed host pattern rules here
      const isAllowedDomain = 
        parsedUrl.hostname.endsWith('malvin.app') || 
        parsedUrl.hostname.endsWith('web.app') ||
        parsedUrl.hostname.endsWith('firebaseapp.com') ||
        parsedUrl.hostname === 'malvinai.com' ||
        parsedUrl.hostname === 'www.malvinai.com' ||
        parsedUrl.hostname === 'localhost';

      if (!isAllowedDomain) {
        console.warn("Security Alert: Attempted to load untrusted origin into auth shell:", parsedUrl.hostname);
        setIsUntrustedDomain(true);
      } else {
        setIsUntrustedDomain(false);
      }
    } catch (e) {
      setIsUntrustedDomain(true);
    }
  }, [targetUrl]);

  // 2. Real-time Firebase Auth state listener
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 3. Secure Handshake Event Listener
  useEffect(() => {
    const listener = async (event: MessageEvent) => {
      // 🛑 Block handshake if target domain was marked dangerous
      if (isUntrustedDomain) return;

      // 🛑 Ensure message originates from our expected iframe domain
      try {
        const expectedOrigin = new URL(targetUrl).origin;
        if (event.origin !== expectedOrigin && expectedOrigin !== "*") {
          return; // Ignore messages from unexpected sources
        }
      } catch (e) {
        return;
      }

      // Handshake Request from Child (SalonStore / Store / HotelStore / MarketFront)
      if (event.data?.type === "SALON_READY" || event.data?.type === "STORE_READY" || event.data?.type === "HOTEL_READY") {
        if (!currentUser) {
          console.warn("Storefront requested identity, but user is not authenticated.");
          return;
        }

        // Post identity securely back to iframe using strict target origin
        const targetOrigin = new URL(targetUrl).origin;
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "MALVIN_USER",
            uid: currentUser.uid,
            email: currentUser.email,
            isGuest: currentUser.isAnonymous
          },
          targetOrigin // 🔒 Safe: Replaces "*" with exact origin
        );
      }

      // Handle Direct Stripe Payment Delegation
      if (event.data?.type === "REQUEST_DIRECT_PAYMENT") {
        const payload = event.data.payload;

        try {
          const auth = getAuth();
          if (!auth.currentUser) throw new Error("User session expired. Please re-login.");

          const functions = getFunctions();
          const createDirectPaymentSession = httpsCallable(functions, 'createDirectPaymentSession');

          const response = await createDirectPaymentSession({
            amount: payload.amount,
            targetBusinessUid: payload.targetBusinessUid,
            merchantType: payload.merchantType,
            appointmentDetails: payload.appointmentDetails
          });

          const resultData = response.data as any;
          if (resultData?.url) {
            window.top!.location.href = resultData.url;
          } else {
            throw new Error("Invalid checkout response.");
          }
        } catch (error: any) {
          iframeRef.current?.contentWindow?.postMessage({
            type: "DIRECT_PAYMENT_FAILURE",
            error: error.message || "Failed to initialize payment."
          }, "*");
        }
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [currentUser, targetUrl, isUntrustedDomain]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="fixed inset-0 w-screen h-[100dvh] bg-white text-black font-sans z-50 flex flex-col overflow-hidden"
    >
      {/* HEADER */}
      <div className="w-full h-14 border-b border-neutral-100 px-4 flex items-center justify-between shrink-0 bg-white">
        <button 
          onClick={onExit}
          className="p-2.5 -ml-2.5 hover:bg-neutral-100 active:scale-95 text-neutral-800 rounded-full transition-all"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Malvin Secure View
        </span>
        <div className="w-10 h-10" />
      </div>

      {/* VIEWPORT AREA */}
      <div className="flex-1 w-full relative bg-neutral-50 overflow-hidden">
        {isUntrustedDomain ? (
          /* 🚨 UNTRUSTED ORIGIN WARNING SCREEN */
          <div className="p-8 h-full flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Untrusted Store Link</h3>
            <p className="text-sm text-neutral-600 max-w-xs mb-6">
              For your safety, Malvin has blocked passing your authentication session to an unverified external website.
            </p>
            <button 
              onClick={onExit}
              className="px-6 py-2.5 bg-neutral-900 text-white font-medium rounded-xl text-sm"
            >
              Return Safely
            </button>
          </div>
        ) : (
          /* ✅ VALIDATED IFRAME CONTAINER */
          <iframe 
            ref={iframeRef}
            src={targetUrl}
            title="In-App Store Webview Content"
            className="w-full h-full border-none m-0 p-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation allow-top-navigation-by-user-activation"
            allow="clipboard-write; camera; microphone; geolocation"
          />
        )}
      </div>
    </motion.div>
  );
};