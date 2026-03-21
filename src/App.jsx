import { useState, useEffect } from 'react';
import './App.css';
import { useMalvinActivation } from "./pages/buttonlogic";
import Welcomeview from "./components/welcome";
import Session from "./pages/session";
import Login from "./pages/login";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // FIXED: Ensure uid is lowercase to match Firebase User object
  const { wakeMalvin, token, loading: sessionLoading, setToken } = useMalvinActivation(user?.uid);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
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
    return <div style={{ backgroundColor: '#000', height: '100vh' }} />;
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
          padding: '4px 10px', // Smaller padding
          borderRadius: '20px', // Tighter curve
          backdropFilter: 'blur(10px)', 
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <span style={{ fontSize: '10px', color: '#00ff88', fontWeight: 'bold' }}>●</span>
          <button onClick={handleSignOut} style={{
            background: 'none', 
            border: 'none', 
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer', 
            fontSize: '11px', // Smaller text
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