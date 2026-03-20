import { useState, useEffect } from 'react';
import './App.css';
import { useMalvinActivation } from "./pages/buttonlogic";
import Welcomeview from "./components/welcome";
import Session from "./pages/session";
import Login from "./pages/login";
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth'; // Added getRedirectResult
import { auth } from './firebase';
import { Capacitor } from '@capacitor/core';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // FIXED: Changed UID to uid (lowercase)
  const { wakeMalvin, token, loading: sessionLoading, setToken } = useMalvinActivation(user?.uid);

  useEffect(() => {
    // 1. FOR LAPTOP: Catch the redirect result immediately on page load
    if (!Capacitor.isNativePlatform()) {
      getRedirectResult(auth)
        .then((result) => {
          if (result) {
            console.log("Redirect catch success:", result.user.email);
            setUser(result.user);
          }
        })
        .catch((err) => {
          console.error("Redirect handshake failed:", err.message);
        });
    }

    // 2. FOR BOTH: Standard listener for login state
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth detected user:", currentUser?.email);
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = () => {
    signOut(auth).catch((err) => console.error("Sign out failed", err));
  };

  if (authLoading) return <div style={{ backgroundColor: '#000', height: '100vh' }} />;

  return (
    <div className="app-container" style={{ backgroundColor: '#000', minHeight: '100vh', color: 'white' }}>
      
      {/* --- STATUS BAR --- */}
      {user && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          zIndex: 2000,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          padding: '8px 16px',
          borderRadius: '30px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              backgroundColor: '#00ff88',
              borderRadius: '50%',
              boxShadow: '0 0 10px #00ff88'
            }} />
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#00ff88' }}>Live</span>
          </div>
          <div style={{ width: '1px', height: '15px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <button 
            onClick={handleSignOut}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '12px',
              padding: 0,
              textDecoration: 'underline'
            }}
          >
            Sign Out
          </button>
        </div>
      )}

      {/* --- NAVIGATION --- */}
      {!user ? (
        <Login />
      ) : token ? (
        <Session 
          token={token} 
          serverUrl={import.meta.env.VITE_LIVEKIT_URL} 
          onDisconnect={() => setToken(null)} 
        />
      ) : (
        <Welcomeview 
          onWakeClick={wakeMalvin} 
          isConnecting={sessionLoading} 
        />
      )}
    </div>
  );
}

export default App;