import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase"; 
import Login from "./pages/loginscreen"; 
import Welcomeview from "./pages/welcomeview"; 
import Malvinui from "./components/malvinui"; 
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerChat from './components/CustomerChat';
import AdsManager from "./components/AdsManagment";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasWokenUp, setHasWokenUp] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) setHasWokenUp(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ backgroundColor: '#000', height: '100vh' }} />;
  }

  const isAdmin = user?.email === 'kizzclover96@gmail.com';
  return (
    <Router>
      <div className="App" style={{ minHeight: '100vh' }}>
        <Routes>
          {/* 1. PUBLIC ROUTE: Customers can access this WITHOUT logging in */}
          <Route path="/chat/:brandId" element={<CustomerChat />} />

          {/* 2. PROTECTED ROUTE: Your internal UI logic */}
          <Route path="/" element={
            !user ? (
              <Login />
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

          {/* Fallback: Redirect anything else to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;