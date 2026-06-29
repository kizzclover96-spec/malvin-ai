import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase"; 
import Login from "./pages/loginscreen"; 
import Welcomeview from "./pages/welcomeview"; 
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
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
import SalonStore from "./components/salonStore"



function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasWokenUp, setHasWokenUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [dashboardToken, setDashboardToken] = useState("");
  const [uiMode, setUiMode] = useState(localStorage.getItem("ui_mode") || "");
  const resetMode = () => {
    localStorage.removeItem("ui_mode");
    setUiMode("");
  };
 
  
  const [flowStep, setFlowStep] = useState("welcome");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setHasWokenUp(false);
        setShowLogin(false);
        setDashboardToken("");
        localStorage.removeItem("ui_mode");
        setUiMode("");
      } else {
        // 🌟 Reset wake-up cycle for any fresh logins to re-run the verification screen
        setHasWokenUp(false); 
      }
      setLoading(false);
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
    setFlowStep("category"); // correct
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

    // 🟢 Safety fallback: If it's none of the above, don't blindly switch to device
    console.log("Category selected didn't match cleanly:", type);
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
              ) : flowStep === "welcome" ? (
                <Welcomeview onWakeClick={handleWakeUpSequence} />
              ) : flowStep === "welcome" ? (
                <Welcomeview onWakeClick={handleWakeUpSequence} />
              ) : flowStep === "category" ? (
                <Category onSelect={handleCategorySelect} />
              ) : flowStep === "food" ? (
                <FoodDashboard userEmail={user?.email} currentUserId={user?.uid} />
              ) : flowStep === "SalonDashboard" ? ( // 🟢 Fixed to match your handleCategorySelect state string
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
      <CookieBanner />
    </>
  );
}

export default App;