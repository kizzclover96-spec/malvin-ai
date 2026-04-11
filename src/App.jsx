import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase"; 
import Login from "./pages/loginscreen"; 
import Welcomeview from "./pages/welcomeview"; 
import Malvinui from "./components/malvinui"; // Import the session room we just built
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CustomerChat from './components/CustomerChat';
import CustomerChatWrapper from './components/CustomerChat'; // Or wherever your wrapper is
import MainDashboard from './components/MainDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasWokenUp, setHasWokenUp] = useState(false);

  <Router>
    <Routes>
      {/* This is the route for your Manager Dashboard */}
      <Route path="/dashboard" element={<MainDashboard />} />

      {/* This is the "Entry Point" for customers clicking your ads */}
      <Route path="/chat/:brandId" element={<CustomerChatWrapper />} />
    </Routes>
  </Router>

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (!currentUser) {
        setHasWokenUp(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ backgroundColor: '#000', height: '100vh' }} />;
  }

  return (
    <div className="App" style={{ 
      // The background is black for Login/Welcome, but white for the Session
      backgroundColor: (!user || !hasWokenUp) ? '#000' : '#fff', 
      minHeight: '100vh' 
    }}>
      {!user ? (
        /* 1. NOT LOGGED IN */
        <Login />
      ) : !hasWokenUp ? (
        /* 2. AUTHENTICATED - LOADING ANIMATION */
        <Welcomeview 
          userEmail={user.email} 
          onWakeClick={() => setHasWokenUp(true)} 
        />
      ) : (
        /* 3. SESSION ACTIVE */
        <Malvinui userEmail={user.email} />
      )}
    </div>
  );
}

export default App;