import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, firestore as db } from "./firebase";
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import Login from "./pages/loginscreen"; 
import Welcomeview from "./pages/welcomeview"; 
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom"; // Added useLocation
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

function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation(); // Hook to inspect current active route path
  const [loading, setLoading] = useState(true);
  const [hasWokenUp, setHasWokenUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [dashboardToken, setDashboardToken] = useState("");
  const [uiMode, setUiMode] = useState(localStorage.getItem("ui_mode") || "");
  const [isWorker, setIsWorker] = useState(false);
  const [assignedManagerUid, setAssignedManagerUid] = useState("");
  const [flowStep, setFlowStep] = useState("welcome");

  const resetMode = () => {
    localStorage.removeItem("ui_mode");
    setUiMode("");
  };

  // --- Core Authentication State Observer ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
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
          setLoading(false);
          return;
        }

        try {
          const targetEmail = currentUser.email.toLowerCase();
          const managersSnapshot = await getDocs(collection(db, "managerMembers"));
          let matchFound = false;

          for (const managerDoc of managersSnapshot.docs) {
            const managerUid = managerDoc.id;
            const membersRef = collection(db, "managerMembers", managerUid, "members");
            
            const q = query(membersRef, where("email", "==", targetEmail));
            const memberDocs = await getDocs(q);

            if (!memberDocs.empty) {
              const matchedMemberDoc = memberDocs.docs[0];
              matchFound = true;
              setAssignedManagerUid(managerUid);
              setIsWorker(true);

              if (matchedMemberDoc.data().status === "pending") {
                await updateDoc(doc(db, "managerMembers", managerUid, "members", matchedMemberDoc.id), {
                  workerUid: currentUser.uid,
                  status: "active",
                  joinedAt: serverTimestamp()
                });
              }
              break; 
            }
          }
          
          setLoading(false);
        } catch (error) {
          console.error("Error executing operational worker check:", error);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setHasWokenUp(false);
    setFlowStep("welcome");
  }, [user]);

  if (loading) {
    return <div style={{ backgroundColor: '#000', height: '100vh' }} />;
  }

  const isAdmin = user?.email === 'kizzclover96@gmail.com';

  const handleWakeUpSequence = (tokenFromWelcome) => {
    setDashboardToken(tokenFromWelcome);
    setFlowStep("category"); 
  };
  
  const handleCategorySelect = (type) => {
    if (type === "food") {
      setFlowStep("food");
      return;
    }
    if (type === "fashion") {
      setFlowStep("device");
      return;
    }
    if (type === "explore") {
      setFlowStep("SalonDashboard");
      return;
    }
  };

  // Check if current path matches any storefront/external paths
  const isStorefrontPath = 
    location.pathname.startsWith("/food/") || 
    location.pathname.startsWith("/salon/") || 
    location.pathname.startsWith("/chat/");

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
                <WorkerDashboard managerUid={assignedManagerUid} workerUid={user.uid} />
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

      {/* Show the FloatingTeamHub only if authenticated, not an admin, and not on a storefront path */}
      {user && !isAdmin && !isStorefrontPath && (
        <FloatingTeamHub managerUid={isWorker ? assignedManagerUid : user.uid} />
      )}

      <CookieBanner />
    </>
  );
}

export default App;