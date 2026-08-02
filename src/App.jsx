import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, firestore as db, functions } from "./firebase";
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
import Terms from "./pages/system/Terms";
import Privacy from "./pages/system/Privacy";
import CookiePolicy from "./pages/system/CookiePolicy";
import CommunityGuidelines from "./pages/system/CommunityGuidelines";
import AiTransparencyNotice from "./pages/system/AiTransparencyNotice";
import About from "./pages/system/About";
import AllAds from "./components/admin/AllAds";
import RefundPolicy from "./pages/system/RefundPolicy";
import Impressum from "./pages/system/Impressum";
import MarketFront from "./components/business/MarketFront";
import Dashboard from "./components/business/dashboard";
import DeviceSwitch from "./pages/navigation/DeviceSwitch";
import MobileView from "./components/business/MobileView";
import FoodDashboard from "./components/order/Food";
import SalonDashboard from "./components/appointment/salonDashboard";
import Category from "./pages/navigation/Category";
import { StoreFrontend } from './components/order/Store';
import SalonStore from "./components/appointment/salonStore";
import { FoodDeepLinkGate, SalonDeepLinkGate } from "./components/addons/AppOpenGate";
import { FloatingTeamHub } from "./components/addons/FloatingTeamHub";
import { WorkerDashboard } from './components/team/workerDashboard';
import { QrScannerView } from './components/addons/QR Scanner'; 
import { MalvinSystemDashboard } from "./components/records/MalvinSystemDashboard";
import { MalvinAiPersonnelSystem } from "./components/admin/MalvinAiPersonnelSystem";
import { Front } from './components/customer/Front';
import TicketCheckout from "./pages/auth/Ticket";
import Premium from "./components/addons/Premium";
import StripeSuccessPage from "./components/addons/StripeSuccess";

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
  // 🟢 "checking" until the signed claim resolves, then "premium" or "free".
  // UserOption reads this to decide what (if anything) to show in its
  // status pill — it never checks anything itself.
  const [premiumStatus, setPremiumStatus] = useState("checking");

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
            // url looks like "malvinai://food/abc123" or "malvinai://salon/abc123"
            const parsed = new URL(url);
            const uid = parsed.pathname.replace(/^\/+/, "") || parsed.host;
            if (parsed.protocol === "malvinai:" || url.startsWith("malvinai://")) {
              const kind = url.includes("/salon/") || url.includes("salon:") ? "salon" : "food";
              // Fall back to whatever segment actually follows the host, since
              // some Android versions parse custom-scheme URLs inconsistently.
              const segments = url.replace("malvinai://", "").split("/").filter(Boolean);
              const routeUid = segments[1] || uid;
              const routeKind = segments[0] === "salon" ? "salon" : "food";
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
    } catch (error) {
      console.error("Payment settlement error trace:", error);
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

  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
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
        
        if (currentUser.email === 'kizzclover96@gmail.com') {
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
          
          setUser(currentUser);
          setLoading(false);
        } catch (error) {
          console.error("Error executing operational worker check:", error);
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

  const isAdmin = user?.email === 'kizzclover96@gmail.com';
  const isStorefrontPath = 
    location.pathname.startsWith("/food/") || 
    location.pathname.startsWith("/salon/") || 
    location.pathname.startsWith("/chat/");

  const handleCategorySelect = (type) => {
    if (type === "food") { setFlowStep("food"); return; }
    if (type === "fashion") { setFlowStep("device"); return; }
    if (type === "explore") { setFlowStep("SalonDashboard"); return; }
    if (type === "records") { setFlowStep("recordsDashboard"); return; }
    if (type === "premium") { setFlowStep("premiumView"); return; }
  };

  const params = new URLSearchParams(location.search);
  const checkoutStatus = params.get("checkout");

  if (checkoutStatus === "success" || checkoutStatus === "cancel") {
    setFlowStep("front"); // straight to Customer Hub
    navigate(location.pathname, { replace: true, state: {} }); // clean the URL
    return;
  }

  return (
    <>
      <div className="App" style={{ minHeight: '100vh' }}>
        <Routes>
          <Route path="/chat/:brandId" element={<MarketFront />} />
          
          {/* 🟢 Passing the wallet execution mechanism directly down into routing subcomponents */}
          <Route path="/food/:Uid" element={<><FoodDeepLinkGate /><StoreFrontend onExecuteWalletPayment={handleWalletPaymentExecution} /></>} />
          <Route path="/salon/:uid" element={<><SalonDeepLinkGate /><SalonStore onExecuteWalletPayment={handleWalletPaymentExecution} /></>} />
          
          <Route path="/terms" element={<Terms />} />
          <Route path="/cookiePolicy" element={<CookiePolicy />} />
          <Route path="/communityGuidelines" element={<CommunityGuidelines />} />
          <Route path="/aiTransparencyNotice" element={<AiTransparencyNotice />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/allads" element={<AllAds />} />
          <Route path="/about" element={<About />} />
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
              ) : isAdmin ? (
                <AdsManager />
              ) : isWorker ? (
                workerSubScreen === "qr" ? (
                  <QrScannerView 
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
                  onSelectWorker={() => setFlowStep("category")} 
                  premiumStatus={premiumStatus}
                />
              ) : flowStep === "front" ? (
                <Front onExecuteWalletPayment={handleWalletPaymentExecution} />
              ) : flowStep === "category" ? (
                <Category onSelect={handleCategorySelect} />
              ) : flowStep === "food" ? (
                <FoodDashboard userEmail={user?.email} currentUserId={user?.uid} />
              ) : flowStep === "SalonDashboard" ? (
                <SalonDashboard userEmail={user?.email} currentUserId={user?.uid} />
              ) : flowStep === "recordsDashboard" ? (
                <MalvinSystemDashboard userEmail={user?.email} currentUserId={user?.uid} />
              ) : flowStep === "device" ? (
                <DeviceSwitch
                  onSelect={(mode) => {
                    setUiMode(mode);
                    setFlowStep("done");
                  }}
                />
              ) : flowStep === "premiumView" ? (
                <Premium />
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

      {user && !isAdmin && !isStorefrontPath && (isWorker || (flowStep !== "front" && flowStep !== "options")) && (
        <FloatingTeamHub managerUid={isWorker ? assignedManagerUid : user.uid} />
      )}

      <CookieBanner />

      <CookieBanner />
    </>
  );
}

export default App;