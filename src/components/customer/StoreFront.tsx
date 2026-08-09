import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { STORE_ORIGIN } from '../../services/vinLink';

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
  // 🚨 Called once, at most, if the iframe never announces itself ready
  // within a few seconds, or if we can tell (same-origin only) that it
  // ended up on "/" instead of the storefront it was pointed at. This is
  // the "escaped the sandbox and landed on the marketing page" case —
  // Front.tsx uses this to close the frame and show the retry popup
  // instead of silently leaving a dead landing page on screen.
  onLoadFailure?: () => void;
}

// How long we give the iframe to announce itself (SALON_READY / STORE_READY
// / HOTEL_READY / MECHANIC_READY / CHAT_READY) before assuming something
// went wrong — a route that quietly bounced to "/", a doc that doesn't
// exist, a network hiccup, etc.
const READY_TIMEOUT_MS = 4500;

export const StoreFront: React.FC<StoreFrontProps> = ({ businessUid, onExit, userUid, userWalletBalance, onExecutePayment, onLoadFailure }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUntrustedDomain, setIsUntrustedDomain] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Guards against firing onLoadFailure more than once for the same load,
  // and against firing it after the frame already proved itself fine.
  const settledRef = useRef(false);
  // Caches the in-flight/resolved custom-token mint per uid, so a retried
  // or duplicate *_READY (StrictMode double-invoke, a flaky first load)
  // doesn't mint a fresh token every time — and so a mid-session account
  // switch can't accidentally hand a NEW user the previous one's token.
  const storefrontTokenCacheRef = useRef<{ uid: string; promise: Promise<string | null> } | null>(null);

  // Mints a short-lived Firebase custom token for `uid` via the
  // mintStorefrontToken callable (malvinbackend/src/index.ts) and caches
  // it. See the long comment on that function for why this exists: a bare
  // uid over postMessage is just data, not a real session, so Firestore's
  // security rules reject it inside the store's own (different-origin)
  // Firebase Auth context without this.
  const getStorefrontToken = (uid: string): Promise<string | null> => {
    if (storefrontTokenCacheRef.current?.uid === uid) {
      return storefrontTokenCacheRef.current.promise;
    }
    const promise = (async () => {
      try {
        const functions = getFunctions();
        const mint = httpsCallable(functions, 'mintStorefrontToken');
        const res = await mint();
        return (res.data as any)?.token ?? null;
      } catch (err) {
        console.error('Failed to mint storefront auth token — store will fall back to unauthenticated/guest access:', err);
        return null;
      }
    })();
    storefrontTokenCacheRef.current = { uid, promise };
    return promise;
  };

  // 1. Sanitize & Parse Target URL
  const targetUrl = businessUid.startsWith('http://') || businessUid.startsWith('https://') 
    ? businessUid 
    : `https://${businessUid}`;

  // 🛡️ SECURITY FILTER: Check if destination domain is trusted
  useEffect(() => {
    try {
      const parsedUrl = new URL(targetUrl);

      // Tightened now that stores live on their own origin (STORE_ORIGIN,
      // stores.malvinai.com in production — see services/vinLink.ts): the
      // bare main-shell domain (malvinai.com / www.malvinai.com) is
      // deliberately NOT in this list anymore. Nothing should ever load
      // the main app shell into this "store" frame; every real store link
      // this component is handed points at the stores subdomain, Firebase
      // preview channels, or localhost during dev.
      const storeHostname = (() => {
        try { return new URL(STORE_ORIGIN).hostname; } catch { return 'stores.malvinai.com'; }
      })();
      const isAllowedDomain = 
        parsedUrl.hostname === storeHostname ||
        parsedUrl.hostname.endsWith('malvin.app') || 
        parsedUrl.hostname.endsWith('web.app') ||
        parsedUrl.hostname.endsWith('firebaseapp.com') ||
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

  // 3. ⏱️ READY TIMEOUT + SAME-ORIGIN FAST CHECK
  // Two independent ways to catch "this didn't actually open the store":
  //  a) if nothing ever announces *_READY within READY_TIMEOUT_MS, and
  //  b) on web (same-origin), the instant the iframe's own address bar
  //     shows it landed on "/" instead of the path we sent it to — this
  //     fires immediately rather than waiting out the timeout.
  // (b) can't run cross-origin — e.g. inside the native app, where the
  // outer shell and malvinai.com are different origins — so (a) is the
  // real safety net there.
  //
  // onLoadFailure is kept in a ref rather than an effect dependency. It's
  // passed down as an inline arrow function from Front.tsx, so it's a new
  // reference on every one of Front.tsx's re-renders — and Front.tsx
  // re-renders constantly in the background (receipts/notifications/nearby
  // listeners). Depending on it directly meant any of those unrelated
  // updates canceled and restarted this whole effect, resetting
  // settledRef back to false and silently discarding a handshake that had
  // already succeeded — a real store visibly loading, then bouncing back
  // out to the retry popup moments later for no reason tied to the link
  // itself.
  const onLoadFailureRef = useRef(onLoadFailure);
  useEffect(() => { onLoadFailureRef.current = onLoadFailure; }, [onLoadFailure]);

  useEffect(() => {
    settledRef.current = false;
    if (isUntrustedDomain) return;

    let expectedPath = '/';
    try {
      expectedPath = new URL(targetUrl).pathname;
    } catch {
      /* malformed — isUntrustedDomain already handles this case */
    }

    const fail = () => {
      if (settledRef.current) return;
      settledRef.current = true;
      onLoadFailureRef.current?.();
    };

    const timer = setTimeout(fail, READY_TIMEOUT_MS);

    const handleIframeLoad = () => {
      try {
        const actualPath = iframeRef.current?.contentWindow?.location?.pathname;
        // Same-origin read succeeded. If it lands exactly on root while we
        // asked for a deeper path, that's the router's catch-all bouncing
        // an unmatched/failed route back to the marketing landing page.
        if (actualPath === '/' && expectedPath !== '/') {
          clearTimeout(timer);
          fail();
        }
      } catch {
        // Cross-origin — can't peek, fall back to the *_READY timeout above.
      }
    };
    iframeRef.current?.addEventListener('load', handleIframeLoad);

    return () => {
      clearTimeout(timer);
      iframeRef.current?.removeEventListener('load', handleIframeLoad);
    };
  }, [targetUrl, isUntrustedDomain]);

  // 4. Secure Handshake Event Listener
  useEffect(() => {
    const listener = async (event: MessageEvent) => {
      // 🛑 Block handshake if target domain was marked dangerous
      if (isUntrustedDomain) return;

      // 🛑 Verify the message actually came from OUR iframe — by identity
      // AND by origin, belt-and-suspenders. `event.source` identifies the
      // exact window object that sent it (works regardless of sandboxing,
      // can't be spoofed by another frame/tab). `event.origin` is a real,
      // matchable origin string again now that the sandbox grants
      // allow-same-origin — checked as a second, independent factor.
      // Computed from targetUrl (not hardcoded to STORE_ORIGIN) so this
      // still works against the other hosts isAllowedDomain trusts —
      // Firebase preview channels (*.web.app/*.firebaseapp.com) and
      // localhost during dev — not just the production stores subdomain.
      let expectedOrigin: string;
      try {
        expectedOrigin = new URL(targetUrl).origin;
      } catch {
        return;
      }
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.origin !== expectedOrigin) return;

      // Handshake Request from Child (SalonStore / Store / HotelStore /
      // MechanicStore / MarketFront chat) — matched generically on the
      // "*_READY" suffix so a new store type doesn't need this file
      // touched, just its own postMessage call.
      if (typeof event.data?.type === 'string' && event.data.type.endsWith('_READY')) {
        // The frame proved itself alive and on the right page — cancel the
        // failure timeout/fast-check above.
        settledRef.current = true;

        const targetWindow = iframeRef.current?.contentWindow;
        const targetOrigin = expectedOrigin;
        const uid = currentUser?.uid ?? null;
        const identityBase = {
          type: "MALVIN_USER",
          uid,
          email: currentUser?.email ?? null,
          isGuest: currentUser?.isAnonymous ?? true,
        };

        // Post identity IMMEDIATELY, synchronously, with customToken left
        // null for now — NOT awaited on the mint below. Each store's own
        // AuthRequiredPopup no longer depends on this message arriving at
        // all (it gates on window.top === window.self instead, a
        // synchronous structural check with nothing to race — see that
        // file), but write actions inside the store still want identity
        // as early as possible, and there's no reason to hold this back
        // for a Cloud Functions round trip that can take a couple seconds
        // on a cold start.
        targetWindow?.postMessage({ ...identityBase, customToken: null }, targetOrigin);

        // Mint (or reuse the cached) real Firebase custom token for this
        // uid and send it as a FOLLOW-UP message once it's ready — see
        // getStorefrontToken above for why a bare uid alone isn't enough
        // for the store's own Firestore queries to be trusted. Each
        // store's MALVIN_USER handler re-runs on every message of this
        // type (applyStorefrontIdentity in services/storefrontAuth.ts
        // already de-dupes on the token value), so a second message with
        // just customToken filled in is picked up the same way the first
        // one was.
        if (uid) {
          getStorefrontToken(uid)
            .then((customToken) => {
              if (!customToken) return;
              targetWindow?.postMessage({ ...identityBase, customToken }, targetOrigin);
            })
            .catch((err) => {
              console.error('Failed to mint storefront auth token — store will fall back to unauthenticated/guest access:', err);
            });
        }
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
          }, expectedOrigin);
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
          /* ✅ VALIDATED IFRAME CONTAINER
             🔒 SANDBOX — allow-same-origin is back, deliberately, and it's
             SAFE here for a reason that's easy to miss: store pages are
             served from STORE_ORIGIN (stores.malvinai.com), a genuinely
             different origin than this shell (malvinai.com/app.malvinai.com)
             — see services/vinLink.ts and firebase.json's two Hosting
             targets. Once that separation is real, the browser's own
             Same-Origin Policy is what keeps a store from reaching
             window.parent.document — that protection comes from the two
             origins actually differing, not from the sandbox attribute.
             allow-same-origin only controls whether the framed document
             gets ITS OWN real origin or a forced-opaque one; it was never
             what stood between a same-origin child and this shell's DOM,
             and granting it back doesn't reopen that door now that the
             origins genuinely differ.

             What granting it back buys: without it, a sandboxed frame gets
             an opaque origin UNCONDITIONALLY per the HTML spec — even once
             genuinely cross-origin — and an opaque origin can't call
             history.pushState()/replaceState() (React Router uses these
             internally for every client-side navigation) or touch
             localStorage/IndexedDB/navigator.serviceWorker. Store pages
             are this same React bundle and rely on all of that working
             normally, so keeping allow-same-origin here avoids a real
             functional cost (silently-broken in-store navigation) in
             exchange for a security property that real origin separation
             already provides independently. The pushState guard in
             main.jsx and the Firestore memory-cache fallback in
             firebase.ts stay in place regardless, as a safety net for
             STORE_ORIGIN ever accidentally pointing at this same origin.

             If STORE_ORIGIN ever points back at this shell's own origin
             (e.g. a misconfigured .env), the isAllowedDomain check above
             is what catches it — it validates against STORE_ORIGIN's
             actual hostname, not a hostname that happens to equal this
             page's own, so a same-origin misconfiguration fails that
             check rather than silently reintroducing the risk this whole
             separation exists to avoid.

             allow-top-navigation / allow-top-navigation-by-user-activation
             stay OUT — that's what let a store hijack the ENTIRE app by
             navigating window.top away, the original "stores escaping the
             frame" bug, unrelated to the origin-separation work above.
             allow-popups stays (no store screen calls window.open today,
             but a genuinely cross-origin popup can't reach this shell's
             session either way). allow-modals stays for alert()/confirm()
             calls stores already use. */
          <iframe 
            ref={iframeRef}
            src={targetUrl}
            title="In-App Store Webview Content"
            className="w-full h-full border-none m-0 p-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            allow="clipboard-write; camera; microphone; geolocation"
          />
        )}
      </div>
    </motion.div>
  );
};