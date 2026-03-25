import { useState, useEffect } from 'react';
import './App.css';
import { useMalvinActivation } from "./pages/buttonlogic";
import Welcomeview from "./components/welcome";
import Session from "./pages/session";
import Login from "./pages/login";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

// --- SUB-COMPONENT ---
// This ensures the hook only runs when we are 100% sure a user exists.
function MalvinInterface({ user, handleSignOut }) {
  // Passing user.uid here ensures the LiveKit token is linked to this specific user
  const { wakeMalvin, token, loading: sessionLoading, setToken } = useMalvinActivation(user.uid);

  return (
    <div className="app-container" style={{ backgroundColor: '#000', minHeight: '100vh', color: 'white' }}>
      
      {/* USER CAPSULE (Top Right) */}
      <div style={{
        position: 'fixed', top: '15px', right: '15px', display: 'flex',
        alignItems: 'center', gap: '8px', zIndex: 2000,
        backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '4px 10px',
        borderRadius: '20px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <span style={{ fontSize: '10px', color: '#00ff88', fontWeight: 'bold' }}>●</span>
        <button onClick={handleSignOut} style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer', fontSize: '11px', fontWeight: '500'
        }}>
          Log out
        </button>
      </div>

      {/* NAVIGATION LOGIC */}
      {token ? (
        <Session 
          token={token} 
          serverUrl={import.meta.env.VITE_LIVEKIT_URL} 
          userEmail={user.email} // Passed to the session for UI display
          onDisconnect={() => setToken(null)} 
        />
      ) : (
        <Welcomeview 
          onWakeClick={wakeMalvin} 
          isConnecting={sessionLoading} 
          userEmail={user?.email} // <--- Added this to show email on Welcome screen
        />
      )}
    </div>
  );
}

// --- MAIN APP ---
function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        console.log("🚀 Malvin User Identified:", currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  // Loading state while Firebase checks the session
  if (authLoading) {
    return (
      <div style={{ 
        backgroundColor: '#000', height: '100vh', display: 'flex', 
        alignItems: 'center', justifyContent: 'center', color: '#444',
        fontSize: '12px', letterSpacing: '2px' 
      }}>
        INITIALIZING...
      </div>
    );
  }

  // If no user is logged in, show the Login screen.
  if (!user) {
    return <Login />;
  }

  // If user exists, render the Malvin Interface.
  return <MalvinInterface user={user} handleSignOut={handleSignOut} />;
}

export default App;