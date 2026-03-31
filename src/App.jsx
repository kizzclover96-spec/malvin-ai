import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase"; 
import Login from "./pages/loginscreen"; 
import Welcomeview from "./pages/welcomeview"; // Import the new welcome screen

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasWokenUp, setHasWokenUp] = useState(false); // New state to track if animation finished

  // Watcher for login status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // If user logs out, reset the welcome state for next time
      if (!currentUser) {
        setHasWokenUp(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Show a simple black screen while Firebase initialises
  if (loading) {
    return <div style={{ backgroundColor: '#000', height: '100vh' }} />;
  }

  return (
    <div className="App" style={{ backgroundColor: '#000', minHeight: '100vh' }}>
      {!user ? (
        /* 1. NOT LOGGED IN: Show Login Screen */
        <Login />
      ) : !hasWokenUp ? (
        /* 2. LOGGED IN BUT NOT "AWAKE": Show Animated Welcome */
        <Welcomeview 
          userEmail={user.email} 
          onWakeClick={() => setHasWokenUp(true)} 
        />
      ) : (
        /* 3. FULLY AUTHORIZED: Show the Main AI Interface */
        <div style={{ padding: '40px', color: 'white', textAlign: 'center' }}>
          <h1 style={{ letterSpacing: '0.5rem' }}>MALVIN SYSTEM ONLINE</h1>
          <p style={{ opacity: 0.7 }}>Welcome back, {user.displayName || user.email}</p>
          
          <button 
            onClick={() => auth.signOut()}
            style={{ 
              marginTop: '40px', 
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: '1px solid #00f2ff',
              color: '#00f2ff',
              cursor: 'pointer',
              borderRadius: '8px',
              textTransform: 'uppercase',
              fontSize: '0.7rem'
            }}
          >
            Terminate Session
          </button>
        </div>
      )}
    </div>
  );
}

export default App;