import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase"; 
import Login from "./pages/loginscreen"; 
import Welcomeview from "./pages/welcomeview"; 
import Malvinui from "./components/malvinui"; 
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerChat from './components/CustomerChat';
import AdsManager from "./components/AdsManagment";
import LandingPage from "./pages/LandingPage"; // Import your new page
import CookieBanner from "./components/CookieBanner";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Impressum from "./pages/Impressum";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasWokenUp, setHasWokenUp] = useState(false);
  // New state to toggle between the Landing Display and the Login Form
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setHasWokenUp(false);
        setShowLogin(false); // Reset to landing page on logout
      }
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
            <Route path="/chat/:brandId" element={<CustomerChat />} />
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
                <Malvinui userEmail={user.email} />
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