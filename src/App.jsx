import { useState, useEffect } from 'react';
import './App.css';
import { useMalvinActivation } from "./pages/buttonlogic";
import Welcomeview from "./components/welcome";
import Session from "./pages/session";
import Login from "./pages/login";
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { auth } from './firebase';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Use user?.uid (lowercase) to avoid 'undefined' errors
  const { wakeMalvin, token, loading: sessionLoading, setToken } = useMalvinActivation(user?.uid);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // 1. Check for redirect result first
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("Redirect login success:", result.user.email);
          setUser(result.user);
        }
      } catch (error) {
        console.error("Error processing redirect:", error);
      }

      // 2. Listen for auth state changes
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
        } else {
          setUser(null);
        }
        setAuthLoading(false);
      });

      return unsubscribe;
    };

    const unsubscribePromise = handleAuth();
    
    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setToken(null); 
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  if (authLoading) {
    return <div style={{ backgroundColor: '#000', height: '100vh' }} />;
  }

  return (
    <div className="app-container" style={{ backgroundColor: '#000', minHeight: '100vh', color: 'white' }}>
      
      {/* --- Global Status Bar --- */}
      {user && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', display: 'flex',
          alignItems: 'center', gap: '15px', zIndex: 2000,
          backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '8px 16px',
          borderRadius: '30px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <span style={{ fontSize: '12px', color: '#00ff88' }}>● Live</span>
          <button onClick={handleSignOut} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer', fontSize: '12px', textDecoration: 'underline'
          }}>
            Sign Out
          </button>
        </div>
      )}

      {/* --- THE NAVIGATION SWITCH --- */}
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