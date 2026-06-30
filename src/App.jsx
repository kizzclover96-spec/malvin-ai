import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, firestore as db } from "./firebase";
import { collection, collectionGroup, getDocs, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import Login from "./pages/loginscreen"; 
import Welcomeview from "./pages/welcomeview"; 
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import AdsManager from "./components/AdsManagment";
import LandingPage from "./pages/LandingPage";
import CookieBanner from "./components/CookieBanner";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
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
import { QrScannerView } from './components/QR Scanner'; // Make sure the path matches your filename

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

  // Tracks the sub-screen inside the worker dashboard flow
  const [workerSubScreen, setWorkerSubScreen] = useState("dashboard");

  const resetMode = () => {
    localStorage.removeItem("ui_mode");
    setUiMode("");
  };

  // --- Core Authentication State Observer ---
 // --- Core Authentication State Observer ---
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
          // 🟢 FORCE Firestore to wait until the Auth Token is completely synchronized
          await currentUser.getIdToken(true); 

          const targetEmail = currentUser.email.trim();
          const targetEmailLower = currentUser.email.toLowerCase().trim();
          
          // Query ALL "members" subcollections everywhere safely
          const memberQuery = query(
            collectionGroup(db, "members"), 
            where("email", "in", [targetEmail, targetEmailLower])
          );
          
          const memberDocsSnapshot = await getDocs(memberQuery);

          if (!memberDocsSnapshot.empty) {
            const matchedMemberDoc = memberDocsSnapshot.docs[0];
            const matchedDocId = matchedMemberDoc.id;
            const currentStatus = matchedMemberDoc.data().status;
            
            // 🌟 Extract the managerUid safely from the reference path
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

  // Sync welcome flow step ONLY for normal management accounts
  useEffect(() => {
    if (!user || isWorker) return;
    setFlowStep("welcome");
  }, [user, isWorker]);

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
    setFlowStep("category"); 
  };
  
  const handleCategorySelect = (type) => {
    if (type === "food") { setFlowStep("food"); return; }
    if (type === "fashion") { setFlowStep("device"); return; }
    if (type === "explore") { setFlowStep("SalonDashboard"); return; }
  };

  return (
    <>
      <div className="App" style={{ minHeight: '100vh' }}>
        <Routes>
          <Route path="/chat/:brandId" element={<MarketFront />} />
          <Route path="/food/:Uid" element={<StoreFrontend/>} />
          <Route path="/salon/:uid" element={<SalonStore />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/allads" element={<AllAds />} />
          <Route path="/about" element={<About />} />

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
                // Check if the worker clicked to open the scanner
                workerSubScreen === "qr" ? (
                  <QrScannerView 
                    onScanSuccess={(decodedText) => {
                      console.log("Scanned QR Text:", decodedText);
                      // Do your verification or processing with 'decodedText' here
                      
                      // Return to main dashboard after a successful scan
                      setWorkerSubScreen("dashboard");
                    }}
                    onBack={() => setWorkerSubScreen("dashboard")}
                  />
                ) : (
                  // Otherwise show the normal dashboard layout
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
              ) : flowStep === "category" ? (
                <Category onSelect={handleCategorySelect} />
              ) : flowStep === "food" ? (
                <FoodDashboard userEmail={user?.email} currentUserId={user?.uid} />
              ) : flowStep === "SalonDashboard" ? (
                <SalonDashboard userEmail={user?.email} currentUserId={user?.uid} />
              ) : flowStep === "device" ? (
                <DeviceSwitch
                  onSelect={(mode) => {
                    setUiMode(mode);
                    setFlowStep("done");
                  }}
                />
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

      {user && !isAdmin && !isStorefrontPath && (
        <FloatingTeamHub managerUid={isWorker ? assignedManagerUid : user.uid} />
      )}

      <CookieBanner />
    </>
  );
}

export default App;