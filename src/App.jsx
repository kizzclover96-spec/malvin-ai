import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, firestore as db } from "./firebase";
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

import Login from "./pages/loginscreen"; 
import Welcomeview from "./pages/welcomeview"; 
import { UserOption } from "./components/UserOption"; 
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import AdsManager from "./components/AdsManagment";
import LandingPage from "./pages/LandingPage";
import CookieBanner from "./components/CookieBanner";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CookiePolicy from "./pages/CookiePolicy";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import AiTransparencyNotice from "./pages/AiTransparencyNotice";
import About from "./pages/About";
import AllAds from "./components/AllAds";
import RefundPolicy from "./pages/RefundPolicy";
import Impressum from "./pages/Impressum";
import MarketFront from "./components/MarketFront";
import Dashboard from "./components/dashboard";
import DeviceSwitch from "./pages/DeviceSwitch";
import MobileView from "./pages/MobileView";
import FoodDashboard from "./components/Food";
import SalonDashboard from "./components/salonDashboard";
import Category from "./pages/Category";
import { StoreFrontend } from './components/Store';
import SalonStore from "./components/salonStore";
import { FloatingTeamHub } from "./components/FloatingTeamHub";
import { WorkerDashboard } from './components/workerDashboard';
import { QrScannerView } from './components/QR Scanner'; 
import { MalvinSystemDashboard } from "./components/MalvinSystemDashboard";
import { MalvinAiPersonnelSystem } from "./components/MalvinAiPersonnelSystem";
import { Front } from './pages/Front';
import TicketCheckout from "./pages/Ticket";
import Premium from "./components/Premium";
import StripeSuccessPage from "./components/StripeSuccess";

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
  const [flowStep, setFlowStep] = useState("welcome");
  const [workerSubScreen, setWorkerSubScreen] = useState("dashboard");

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
          const targetEmail = currentUser.email.trim();
          const targetEmailLower = currentUser.email.toLowerCase().trim();
          
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

  useEffect(() => {
    if (!user || isWorker) return;

    // 🟢 Check if we were redirected with a specific flow step state (e.g. from Ticket.tsx)
    if (location.state?.flowStep) {
      setFlowStep(location.state.flowStep);
    } else {
      setFlowStep("welcome"); // Keeps your default startup screen
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

  const handleWakeUpSequence = (tokenFromWelcome) => {
    setDashboardToken(tokenFromWelcome);
    setFlowStep("options"); 
  };
  
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
          <Route path="/food/:Uid" element={<StoreFrontend onExecuteWalletPayment={handleWalletPaymentExecution} />} />
          <Route path="/salon/:uid" element={<SalonStore onExecuteWalletPayment={handleWalletPaymentExecution} />} />
          
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
              ) : flowStep === "welcome" ? (
                <Welcomeview onWakeClick={handleWakeUpSequence} />
              ) : flowStep === "options" ? (
                <UserOption 
                  onSelectCustomer={() => setFlowStep("front")} 
                  onSelectWorker={() => setFlowStep("category")} 
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

      {user && !isAdmin && !isStorefrontPath && (isWorker || (flowStep !== "welcome" && flowStep !== "front" && flowStep !== "options")) && (
        <FloatingTeamHub managerUid={isWorker ? assignedManagerUid : user.uid} />
      )}

      <CookieBanner />

      <CookieBanner />
    </>
  );
}

export default App;