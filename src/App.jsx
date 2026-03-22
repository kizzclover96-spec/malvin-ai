import { useState, useEffect } from 'react';
import './App.css';
import { useMalvinActivation } from "./pages/buttonlogic";
import Welcomeview from "./components/welcome";
import Session from "./pages/session";
import Login from "./pages/login";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- IDENTITY DECISION ---
  // We use user?.uid here. Ensure your token-saving logic (where you get Gmail tokens) 
  // also saves the Firebase UID into the 'user_id' column of your database.
  const { wakeMalvin, token, loading: sessionLoading, setToken } = useMalvinActivation(user?.uid);

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
      setToken(null); 
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  if (authLoading) {
    return (
      <div style={{ 
        backgroundColor: '#000', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#444',
        fontSize: '12px',
        letterSpacing: '2px'
      }}>
        INITIALIZING...
      </div>
    );
  }

  return (
    <div className="app-container" style={{ backgroundColor: '#000', minHeight: '100vh', color: 'white' }}>
      
      {/* --- REFINED MINI CAPSULE (Top Right) --- */}
      {user && (
        <div style={{
          position: 'fixed', 
          top: '15px', 
          right: '15px', 
          display: 'flex',
          alignItems: 'center', 
          gap: '8px', 
          zIndex: 2000,
          backgroundColor: 'rgba(255, 255, 255, 0.08)', 
          padding: '4px 10px', 
          borderRadius: '20px', 
          backdropFilter: 'blur(10px)', 
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <span style={{ fontSize: '10px', color: '#00ff88', fontWeight: 'bold' }}>●</span>
          <button onClick={handleSignOut} style={{
            background: 'none', 
            border: 'none', 
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer', 
            fontSize: '11px', 
            fontWeight: '500',
            padding: '2px 0'
          }}>
            Log out
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
          userEmail={user.email} // Passed for Malvin's context
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