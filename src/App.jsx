import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase"; 
import Login from "./pages/loginscreen"; 
import Welcomeview from "./pages/welcomeview"; 
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdsManager from "./components/AdsManagment";
import LandingPage from "./pages/LandingPage"; // Import your new page
import CookieBanner from "./components/CookieBanner";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Impressum from "./pages/Impressum";
import MarketFront from "./components/MarketFront";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "./firebase";
import Dashboard from "./components/dashboard";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasWokenUp, setHasWokenUp] = useState(false);
  // New state to toggle between the Landing Display and the Login Form
  const [showLogin, setShowLogin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Updated 'db' to 'firestore' here
          const userRef = doc(firestore, "users", currentUser.uid); 
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            setIsPremium(userData?.premium === true);
          }
        } catch (err) {
          console.error("Premium check failed:", err);
        }
      } else {
        setHasWokenUp(false);
        setShowLogin(false);
        setIsPremium(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ backgroundColor: '#000', height: '100vh' }} />;
  }

  const isAdmin = user?.email === 'kizzclover96@gmail.com';

  return (
    <>
      <Router>
        <div className="App" style={{ minHeight: '100vh' }}>
          <Routes>
            <Route path="/chat/:brandId" element={<MarketFront />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/impressum" element={<Impressum />} />


            <Route path="/" element={
              !user ? (
                // If not logged in, show LandingPage UNLESS they clicked the login button
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
                  onWakeClick={() => setHasWokenUp(true)} 
                />
              ) : (
                <Dashboard
                  userEmail={user.email}
                  isPremium={isPremium}
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