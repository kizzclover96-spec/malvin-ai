import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase"; 
import Login from "./pages/loginscreen"; 
import Welcomeview from "./pages/welcomeview"; 
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdsManager from "./components/AdsManagment";
import LandingPage from "./pages/LandingPage";
import CookieBanner from "./components/CookieBanner";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AllAds from "./components/AllAds";
import RefundPolicy from "./pages/RefundPolicy";
import Impressum from "./pages/Impressum";
import MarketFront from "./components/MarketFront";
import Dashboard from "./components/dashboard";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasWokenUp, setHasWokenUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [dashboardToken, setDashboardToken] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setHasWokenUp(false);
        setShowLogin(false);
        setDashboardToken("");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ backgroundColor: '#000', height: '100vh' }} />;
  }

  const isAdmin = user?.email === 'kizzclover96@gmail.com';

  const handleWakeUpSequence = (tokenFromWelcome) => {
    setDashboardToken(tokenFromWelcome);
    setHasWokenUp(true);
  };

  return (
    <>
      <Router>
        <div className="App" style={{ minHeight: '100vh' }}>
          <Routes>
            <Route path="/chat/:brandId" element={<MarketFront />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/allads" element={<AllAds />} />

            <Route path="/" element={
              !user ? (
                !showLogin ? (
                  <LandingPage onLoginClick={() => setShowLogin(true)} />
                ) : (
                  <Login />
                )
              ) : isAdmin ? (
                <AdsManager />
              ) : !hasWokenUp ? (
                <Welcomeview 
                  userEmail={user.email} 
                  onWakeClick={handleWakeUpSequence} 
                />
              ) : (
                <Dashboard
                  userEmail={user.email}
                  validationToken={dashboardToken}
                />
              )
            } />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
      <CookieBanner />
    </>
  );
}

export default App;