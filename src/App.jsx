import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, firestore as db, functions } from "./firebase";
import { registerPushNotifications, clearPushToken, sendSignInNotification, resetSignInGreeting, notifyPendingWorkOnSignIn, resetPendingWorkReminder } from "./services/pushNotifications";
import { 
  collection, 
  collectionGroup, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  serverTimestamp,
  runTransaction
} from "firebase/firestore";

import Login from "./pages/auth/loginscreen"; 
import { UserOption } from "./pages/navigation/UserOption"; 
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import AdsManager from "./components/admin/AdsManagment";
import LandingPage from "./pages/system/LandingPage";
import CookieBanner from "./components/addons/CookieBanner";
import { InstallAppToast } from "./components/addons/InstallAppToast";
import PaymentResultScreen from "./components/addons/PaymentResultScreen";
import Terms from "./pages/system/Terms";
import Privacy from "./pages/system/Privacy";
import CookiePolicy from "./pages/system/CookiePolicy";
import CommunityGuidelines from "./pages/system/CommunityGuidelines";
import AiTransparencyNotice from "./pages/system/AiTransparencyNotice";
import About from "./pages/system/About";
import FAQ from "./pages/system/FAQ";
import AllAds from "./components/admin/AllAds";
import RefundPolicy from "./pages/system/RefundPolicy";
import Impressum from "./pages/system/Impressum";
import MarketFront from "./components/business/MarketFront";
import Dashboard from "./components/business/dashboard";
import DeviceSwitch from "./pages/navigation/DeviceSwitch";
import MobileView from "./components/business/MobileView";
import Category from "./pages/navigation/Category";
import BVin from "./components/business/B-Vin";
import BVinStore from "./components/business/BVinStore";
import NoticeView from "./pages/system/NoticeView";
import ScannerPairClaim from "./pages/system/ScannerPairClaim";
import VinBackScan from "./components/vinback/VinBackScan";
import { BVinDeepLinkGate, consumePendingDeepLink } from "./components/addons/AppOpenGate";
import { FloatingTeamHub } from "./components/addons/FloatingTeamHub";
import { VinBackLauncher } from "./components/vinback/VinBackLauncher";
import { WorkerDashboard } from './components/team/workerDashboard';
import { QrScannerView } from './components/addons/QR Scanner'; 
import { SystemInventory } from "./components/records/SystemInventory";
import { MalvinAiPersonnelSystem } from "./components/admin/MalvinAiPersonnelSystem";
import { Front } from './components/customer/Front';
import TicketCheckout from "./pages/auth/Ticket";
import Premium from "./components/addons/Premium";
import StripeSuccessPage from "./components/addons/StripeSuccess";
import { useSystemStatus } from "./hooks/useSystemStatus";
import { AccessGate, RestrictedScreen } from "./components/system/RestrictedScreen";
import { signOut } from "firebase/auth";
import { useAdminRole } from "./hooks/useAdminRole";
import AdminApplicationGate from "./components/admin/AdminApplicationGate";

function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation(); 
  const [loading, setLoading] = useState(true);
  const [hasWokenUp, setHasWokenUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [dashboardToken, setDashboardToken] = useState("");
  const [uiMode, setUiMode] = useState(localStorage.getItem("ui_mode") || "");
  const [isWorker, setIsWorker] = useState(false);
  const [assignedManagerUid, setAssignedManagerUid] = useState("");
  const [flowStep, setFlowStep] = useState("options");
  const [workerSubScreen, setWorkerSubScreen] = useState("dashboard");
  // { status: 'success' | 'failed', message?: string } — drives the
  // four-second confirmation screen after any customer payment.
  const [paymentResult, setPaymentResult] = useState(null);
  // 🟢 "checking" until the signed claim resolves, then "premium" or "free".
  // UserOption reads this to decide what (if anything) to show in its
  // status pill — it never checks anything itself.
  const [premiumStatus, setPremiumStatus] = useState("checking");
  // Tracks the last signed-in uid purely so sign-out can clear that
  // device's push token — by the time onAuthStateChanged fires with
  // currentUser === null, the uid it belonged to is already gone.
  const lastUidRef = useRef(null);

  // 🔴 KILL SWITCH — live subscription, not a one-time read, so an admin
  // flipping a switch takes effect on every already-open tab instantly.
  const { status: systemStatus, loading: systemStatusLoading } = useSystemStatus();
  // Live admin standing for whoever is signed in — covers the hard-coded
  // Owner account as well as any additional admin that's been granted
  // through the invite -> application -> approve workflow (see
  // useAdminRole / AdsManagment's Admins panel). `adminRole.isAdmin` is
  // true only once a non-owner admin's status is actually "active";
  // "invited"/"pending_review"/"rejected" all render AdminApplicationGate
  // further down instead of the normal app.
  const adminRole = useAdminRole(user?.email);
  const isAdminUser = adminRole.isAdmin;

  // App-wide lock forces a real sign-out (not just a UI block) so a
  // previously-open session can't keep working from cached state, and so a
  // reload lands back on the (blocked) login screen instead of silently
  // resuming. The admin account is exempt — otherwise there'd be no way to
  // get back in to turn the switch back off.
  useEffect(() => {
    if (systemStatus.appLocked && user && !isAdminUser) {
      signOut(auth).catch((err) => console.error("Kill-switch forced sign-out failed:", err));
    }
  }, [systemStatus.appLocked, user, isAdminUser]);

  // 🟢 VINMOMENT DEEP LINK HANDLING
  // When the native app is opened via a malvinai://food/{uid} or
  // malvinai://salon/{uid} link (from a shared VinMoment card), Capacitor
  // fires 'appUrlOpen' with the raw URL. We just translate that into a
  // normal in-app route push. No-op on web (the plugin only fires natively).
  useEffect(() => {
    let removeListener;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { App: CapacitorApp } = await import("@capacitor/app");
        const handle = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
          try {
            // url looks like "malvinai://food/abc123", "malvinai://salon/abc123",
            // or "malvinai://hotel/abc123"
            const parsed = new URL(url);
            const uid = parsed.pathname.replace(/^\/+/, "") || parsed.host;
            if (parsed.protocol === "malvinai:" || url.startsWith("malvinai://")) {
              const kind = url.includes("/salon/") || url.includes("salon:")
                ? "salon"
                : url.includes("/hotel/") || url.includes("hotel:")
                ? "hotel"
                : url.includes("/mechanic/") || url.includes("mechanic:")
                ? "mechanic"
                : url.includes("/service/") || url.includes("service:")
                ? "service"
                : "food";
              // Fall back to whatever segment actually follows the host, since
              // some Android versions parse custom-scheme URLs inconsistently.
              const segments = url.replace("malvinai://", "").split("/").filter(Boolean);
              const routeUid = segments[1] || uid;
              const routeKind =
                segments[0] === "salon" ? "salon"
                : segments[0] === "hotel" ? "hotel"
                : segments[0] === "mechanic" ? "mechanic"
                : segments[0] === "service" ? "service"
                : "food";
              navigate(`/${routeKind || kind}/${routeUid}`);
            }
          } catch (err) {
            console.error("Failed to parse VinMoment deep link:", err);
          }
        });
        removeListener = () => handle.remove();
      } catch (err) {
        // @capacitor/app not installed yet, or running on web — safe to ignore.
        console.warn("Capacitor App plugin unavailable for deep links:", err);
      }
    })();
    return () => { if (removeListener) removeListener(); };
  }, [navigate]);

  // 🟢 ATOMIC BALANCE PAYMENT CONTROLLER
  // 🟢 ATOMIC BALANCE PAYMENT CONTROLLER
  // 🟢 Update handleWalletPaymentExecution in App.tsx to check a merchantType flag
  const handleWalletPaymentExecution = async (amount, targetBusinessUid, customerUid, merchantType = "salon") => {
      
    if (!customerUid) throw new Error("Customer not authenticated.");
    if (amount <= 0) throw new Error("Invalid checkout balance specification.");

    const userDocRef = doc(db, "users", customerUid);
    
    // 🟢 DYNAMIC ROUTING: Choose collection based on incoming storefront context
    const collectionName = merchantType === "food" ? "restaurantprofile" : "salons";
    const businessDocRef = doc(db, collectionName, targetBusinessUid);

    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) throw new Error("User file directory missing.");
        
        const currentBalance = userSnap.data().wallet?.balance || 0;
        if (currentBalance < amount) {
          throw new Error("Insufficient wallet balance.");
        }

        const businessSnap = await transaction.get(businessDocRef);
        if (!businessSnap.exists()) throw new Error("Merchant registration not found.");

        transaction.update(userDocRef, {
          "wallet.balance": currentBalance - amount
        });

        // Update the correct store field (Food profiles might use walletBalance or something similar)
        const currentStoreBalance = businessSnap.data().walletBalance || businessSnap.data().wallet?.balance || 0;
        transaction.update(businessDocRef, {
          "walletBalance": currentStoreBalance + amount
        });

        const userTxRef = doc(collection(db, "users", customerUid, "walletTransactions"));
        transaction.set(userTxRef, {
          storeName: businessSnap.data().brandName || businessSnap.data().salonName || "Malvin Storefront Platform",
          amount: amount,
          type: "spent",
          timestamp: serverTimestamp()
        });
      });
      console.log(`Internal transfer finalized cleanly for ${collectionName}.`);
      setPaymentResult({ status: "success" });
    } catch (error) {
      console.error("Payment settlement error trace:", error);
      // Surface the real reason where it's useful ("Insufficient wallet
      // balance."), since unlike a Stripe failure the customer can often act
      // on it directly.
      setPaymentResult({ status: "failed", message: error?.message || undefined });
      // Still rethrow — callers (salonStore, Store, Front) have their own
      // recovery to run, and swallowing it here would leave their submit
      // buttons stuck mid-flight.
      throw error;
    }
  };

  const resetMode = () => {
    localStorage.removeItem("ui_mode");
    setUiMode("");
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const scanId = urlParams.get('scanId');
    if (scanId && location.pathname === '/') {
      navigate(`/verify?scanId=${scanId}`, { replace: true });
    }
  }, [location, navigate]);

  // A payment that never reached Stripe at all: the StoreFront shell failed
  // to create the checkout session and posted the reason back down into the
  // store iframe. There's no redirect in this case, so the return handler
  // below would never fire and the customer would otherwise get nothing.
  useEffect(() => {
    const handleShellMessage = (event) => {
      if (event.data?.type !== "DIRECT_PAYMENT_FAILURE") return;
      setPaymentResult({ status: "failed", message: event.data.error || undefined });
    };
    window.addEventListener("message", handleShellMessage);
    return () => window.removeEventListener("message", handleShellMessage);
  }, []);

  // 🟢 STRIPE RETURN HANDLER
  // Stripe sends the customer back to /?checkout=success|cancel (see
  // success_url / cancel_url in malvinbackend). Land them on the Customer
  // Hub, strip the query param, and raise the confirmation screen.
  //
  // This runs in an effect rather than in the render body, where it used to
  // live: setFlowStep + navigate during render are side effects, and the
  // bare `return` that followed them handed React an undefined render
  // result. It also has to be an effect now because it sets the payment
  // result state that PaymentResultScreen reads.
  useEffect(() => {
    const checkoutStatus = new URLSearchParams(location.search).get("checkout");
    if (checkoutStatus !== "success" && checkoutStatus !== "cancel") return;

    setFlowStep("front"); // straight to Customer Hub
    setPaymentResult(
      checkoutStatus === "success"
        ? { status: "success" }
        : // Stripe's cancel_url means the customer backed out at the payment
          // sheet, not that a charge was attempted and rejected — so say that
          // rather than claiming a failure they didn't cause.
          { status: "failed", message: "Payment was cancelled. Nothing was charged." }
    );
    navigate(location.pathname, { replace: true, state: {} }); // clean the URL
  }, [location.search, location.pathname, navigate]);

  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        if (lastUidRef.current) {
          // clearPushToken() is NOT called here on purpose — by the time
          // onAuthStateChanged fires with currentUser === null, Firebase
          // has already fully torn down the session, so request.auth is
          // null and Firestore's customers/{uid} write rule (rightly)
          // denies it every single time. It has to run BEFORE signOut(),
          // which is why every signOut(auth) call site now calls it
          // first — see e.g. Front.tsx's handleSignOut.
          // Signing out re-arms both, so the next sign-in on this device gets
          // them even without restarting the app.
          resetSignInGreeting(lastUidRef.current);
          resetPendingWorkReminder(lastUidRef.current);
          lastUidRef.current = null;
        }
        setUser(null);
        setHasWokenUp(false);
        setShowLogin(false);
        setDashboardToken("");
        setPremiumStatus("checking");
        setIsWorker(false);
        setAssignedManagerUid("");
        localStorage.removeItem("ui_mode");
        setUiMode("");
        setLoading(false);
      } else {
        setHasWokenUp(false);

        // One per sign-in, ahead of the role branching below so every kind of
        // account gets it. Both self-guard against repeat fires.
        sendSignInNotification(currentUser.uid, currentUser.displayName);
        // Merchants also get their outstanding orders/appointments/chats now,
        // rather than waiting up to an hour for the scheduled reminder.
        notifyPendingWorkOnSignIn(currentUser.uid);

        if (currentUser.email === 'kizzclover96@gmail.com') {
          lastUidRef.current = currentUser.uid;
          registerPushNotifications(currentUser.uid);
          setUser(currentUser);
          setLoading(false);
          return;
        }

        try {
          await currentUser.getIdToken(true); 
          
          // 🟢 SAFELY GUARD BOTH EMAIL VARIABLES AGAINST NULL VALUES
          const targetEmail = currentUser.email?.trim() || "";
          const targetEmailLower = currentUser.email?.toLowerCase().trim() || "";
          
          // Only run the query if a valid email address exists
          if (targetEmail) {
            const memberQuery = query(
              collectionGroup(db, "members"), 
              where("email", "in", [targetEmail, targetEmailLower])
            );
            
            const memberDocsSnapshot = await getDocs(memberQuery);

            if (!memberDocsSnapshot.empty) {
              const matchedMemberDoc = memberDocsSnapshot.docs[0];
              const memberData = matchedMemberDoc.data();
              
              if (memberData.role !== 'Manager') { 
                const matchedDocId = matchedMemberDoc.id;
                const currentStatus = memberData.status;
                const pathSegments = matchedMemberDoc.ref.path.split('/');
                const foundManagerUid = pathSegments[1]; 

                setAssignedManagerUid(foundManagerUid);
                setIsWorker(true);

                if (currentStatus === "pending") {
                  await updateDoc(doc(db, "managerMembers", foundManagerUid, "members", matchedDocId), {
                    workerUid: currentUser.uid,
                    uid: currentUser.uid,
                    status: "active",
                    joinedAt: serverTimestamp()
                  });
                }
              } else {
                setIsWorker(false);
                setAssignedManagerUid("");
              }
            } else {
              setIsWorker(false);
              setAssignedManagerUid("");
            }
          } else {
            // Fallback if the user logged in without an email address
            setIsWorker(false);
            setAssignedManagerUid("");
          }
          
          lastUidRef.current = currentUser.uid;
          registerPushNotifications(currentUser.uid);
          setUser(currentUser);
          setLoading(false);
        } catch (error) {
          console.error("Error executing operational worker check:", error);
          lastUidRef.current = currentUser.uid;
          registerPushNotifications(currentUser.uid);
          setUser(currentUser);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 🟢 PREMIUM STATUS — lives here, not in any one screen, so it runs once
  // per login no matter which flowStep the user lands on. Reads the signed
  // custom claim off the ID token (tamper-proof — the client can't alter
  // it), and falls back to the syncPremiumClaims Cloud Function once if the
  // claim isn't there yet (covers the brief gap right after a webhook
  // fires, or a legacy account that predates this system). Never blocks
  // the UI: UserOption mounts immediately regardless of how long this
  // takes, it just updates the status pill whenever this resolves.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        let tokenResult = await user.getIdTokenResult(true);
        let isPremium = tokenResult.claims.premium === true;

        if (!isPremium) {
          const syncPremiumClaims = httpsCallable(functions, "syncPremiumClaims");
          const result = await syncPremiumClaims();
          isPremium = result?.data?.premium === true;
        }

        if (!cancelled) {
          setPremiumStatus(isPremium ? "premium" : "free");
          setDashboardToken(isPremium ? "MVN_PRM_VALID_2026_A9X7" : "");
        }
      } catch (error) {
        console.error("Premium status check failed:", error);
        if (!cancelled) setPremiumStatus("free");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Resume whatever business page the person scanned before they'd logged
  // in — AppOpenGate stashes it in localStorage the moment it shows the
  // login-required popup (see consumePendingDeepLink there). Runs once
  // right after login succeeds, and takes priority over the normal
  // flowStep default below since navigating away from "/" makes that
  // effect a no-op anyway.
  useEffect(() => {
    if (!user || isWorker) return;
    const pendingPath = consumePendingDeepLink();
    if (pendingPath) {
      // skipGate: this navigation IS the resumption of a scan the person
      // already went through the login-prompt/install-toast flow for —
      // showing AppOpenGate's popups a second time right after they just
      // finished logging in would be a jarring, pointless repeat.
      navigate(pendingPath, { replace: true, state: { skipGate: true } });
    }
  }, [user, isWorker, navigate]);

  useEffect(() => {
    if (!user || isWorker) return;

    // 🟢 Check if we were redirected with a specific flow step state (e.g. from Ticket.tsx)
    if (location.state?.flowStep) {
      setFlowStep(location.state.flowStep);
    } else {
      setFlowStep("options"); // Keeps your default startup screen
    }
  }, [user, isWorker, location.state]);

  if (loading) {
    return <div style={{ backgroundColor: '#000', height: '100vh' }} />;
  }

  const isAdmin = adminRole.isAdmin;
  // A signed-in user whose email has an admin record that isn't active yet
  // (invited/pending_review/rejected/revoked) — they get the invitation /
  // application / status screen instead of the normal app or the console.
  const isPendingAdmin = !isAdmin && !!adminRole.record && adminRole.status !== "none";

  // App-wide kill switch. Only gates content for an already-signed-in,
  // non-admin user — the Login/Landing screen below always stays reachable
  // (including for the admin, who needs to be able to sign in and turn
  // this back off). A non-admin who is signed in gets this restricted
  // screen instantly and is force-signed-out a moment later by the effect
  // above; this check covers that brief window and any case where the
  // sign-out itself is slow (e.g. flaky connection).
  if (user && !isAdmin && systemStatus.appLocked) {
    return <RestrictedScreen message={systemStatus.message} />;
  }

  const isStorefrontPath = 
    location.pathname.startsWith("/food/") || 
    location.pathname.startsWith("/salon/") || 
    location.pathname.startsWith("/hotel/") ||
    location.pathname.startsWith("/mechanic/") ||
    location.pathname.startsWith("/service/") ||
    location.pathname.startsWith("/store/") ||
    location.pathname.startsWith("/vinback/") ||
    location.pathname.startsWith("/chat/");

  const handleCategorySelect = (type) => {
    if (type === "fashion") { setFlowStep("device"); return; }
    if (type === "records") { setFlowStep("recordsDashboard"); return; }
    if (type === "premium") { setFlowStep("premiumView"); return; }
  };

  return (
    <>
      <div className="App" style={{ minHeight: '100vh' }}>
        <Routes>
          <Route path="/chat/:brandId" element={<MarketFront />} />
          
          <Route path="/vinback/:tagId" element={<VinBackScan />} />
          <Route path="/pair-scanner/:businessId/:sessionId" element={<ScannerPairClaim />} />
          <Route path="/store/:uid" element={<AccessGate locked={systemStatus.storesLocked} message={systemStatus.message}><BVinDeepLinkGate /><BVinStore /></AccessGate>} />
          <Route path="/notice/:businessId" element={<NoticeView />} />
          
          <Route path="/terms" element={<Terms />} />
          <Route path="/cookiePolicy" element={<CookiePolicy />} />
          <Route path="/communityGuidelines" element={<CommunityGuidelines />} />
          <Route path="/aiTransparencyNotice" element={<AiTransparencyNotice />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/allads" element={<AllAds />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/verify" element={<MalvinAiPersonnelSystem userEmail={user?.email || ""} currentUserId={user?.uid || ""} />} />
          <Route path="/ticket-checkout" element={<TicketCheckout onExecuteWalletPayment={handleWalletPaymentExecution} />} />
          <Route path="/stripe-success" element={<StripeSuccessPage />} />
          
          <Route path="/customerchat" element={<MarketFront />} />

          <Route
            path="/"
            element={
              !user ? (
                !showLogin ? (
                  <LandingPage onLoginClick={() => setShowLogin(true)} />
                ) : (
                  <Login />
                )
              ) : isPendingAdmin ? (
                <AdminApplicationGate record={adminRole.record} />
              ) : isAdmin ? (
                <AdsManager />
              ) : systemStatus.businessLocked && (isWorker || (flowStep !== "options" && flowStep !== "front")) ? (
                <RestrictedScreen message={systemStatus.message} />
              ) : isWorker ? (
                workerSubScreen === "qr" ? (
                  <QrScannerView 
                    businessUid={assignedManagerUid}
                    onScanSuccess={(decodedText) => {
                      console.log("Scanned QR Text:", decodedText);
                      setWorkerSubScreen("dashboard");
                    }}
                    onBack={() => setWorkerSubScreen("dashboard")}
                  />
                ) : (
                  <WorkerDashboard 
                    businessUid={assignedManagerUid} 
                    onNavigate={(screen) => {
                      if (screen === 'qr') {
                        setWorkerSubScreen("qr");
                      }
                    }} 
                  />
                )
              ) : flowStep === "options" ? (
                <UserOption 
                  onSelectCustomer={() => setFlowStep("front")} 
                  onSelectWorker={() => setFlowStep("BVin")} 
                  premiumStatus={premiumStatus}
                />
              ) : flowStep === "front" ? (
                <AccessGate locked={systemStatus.customerHubLocked} message={systemStatus.message}>
                  <Front onExecuteWalletPayment={handleWalletPaymentExecution} />
                </AccessGate>
              ) : flowStep === "BVin" ? (
                <BVin
                  businessId={user?.uid}
                  businessName={user?.displayName || "My Business"}
                  logoUrl={user?.photoURL}
                />
              ) : flowStep === "category" ? (
                // Legacy category picker — no longer reachable from "I'm a
                // business" (that now opens BVin directly above), kept only
                // so nothing breaks if something else still points here.
                <Category onSelect={handleCategorySelect} />
              ) : flowStep === "recordsDashboard" ? (
                <SystemInventory userEmail={user?.email} currentUserId={user?.uid} />
              ) : flowStep === "device" ? (
                <DeviceSwitch
                  onSelect={(mode) => {
                    setUiMode(mode);
                    setFlowStep("done");
                  }}
                />
              ) : flowStep === "premiumView" ? (
                <Premium onBack={() => setFlowStep("options")} />
              ) : uiMode === "mobile" ? (
                <MobileView brandId={user.uid} />
              ) : (
                <Dashboard userEmail={user.email} validationToken={dashboardToken} />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>

      {user && !isAdmin && !isStorefrontPath && flowStep !== "BVin" &&
        (isWorker || (flowStep !== "front" && flowStep !== "options")) && (
        <FloatingTeamHub managerUid={isWorker ? assignedManagerUid : user.uid} />
      )}

      {/* VinBack tag creation/management — same "currently on a business
          dashboard" gate as FloatingTeamHub above, so every pre-B-Vin
          business type (salon/hotel/mechanic/service/food) still gets it.
          Excluded from the BVin flow itself: its VinBack Tags bento card
          opens the same VinBackTagCreate/VinBackTagList modals directly,
          so this floating circle would just be a redundant duplicate. */}
      {user && !isAdmin && !isStorefrontPath && flowStep !== "BVin" &&
        (isWorker || (flowStep !== "front" && flowStep !== "options")) && (
        <VinBackLauncher />
      )}

      <CookieBanner />
      <InstallAppToast />

      {/* Four-second payment confirmation. Mounted last so it layers over
          every flow, and outside <Routes> so a redirect on return from
          Stripe can't unmount it mid-countdown. */}
      <PaymentResultScreen result={paymentResult} onDismiss={() => setPaymentResult(null)} />
    </>
  );
}

export default App;