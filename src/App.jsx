import { useState, useEffect } from 'react';
import './App.css';
import { useMalvinActivation } from "./pages/buttonlogic";
import Welcomeview from "./components/welcome";
import Session from "./pages/session";
import Login from "./pages/login";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

// --- SUB-COMPONENT ---
function MalvinInterface({ user, handleSignOut }) {
  // Logic hook for LiveKit session
  const { wakeMalvin, token, loading: sessionLoading, setToken } = useMalvinActivation(user.uid);

  return (
    <div className="app-container" style={{ backgroundColor: '#000', minHeight: '100vh', color: 'white' }}>
      
      {/* USER CAPSULE (Top Right) - Kept subtle to match new UI */}
      <div style={{
        position: 'fixed', top: '25px', right: '25px', display: 'flex',
        alignItems: 'center', gap: '8px', zIndex: 2000,
        backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px',
        borderRadius: '20px', backdropFilter: 'blur(15px)', border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#32d74b' }} />
        <button onClick={handleSignOut} style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px'
        }}>
          Sign Out
        </button>
      </div>

      {/* NAVIGATION LOGIC */}
      {token ? (
        <Session 
          token={token} 
          serverUrl={import.meta.env.VITE_LIVEKIT_URL} 
          userEmail={user.email} 
          onDisconnect={() => setToken(null)} 
        />
      ) : (
        <Welcomeview 
          onWakeClick={wakeMalvin} 
          isConnecting={sessionLoading} 
          userEmail={user?.email} 
        />
      )}
    </div>
  );
}

// --- MAIN APP ---
function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 1. Handle Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Handle PWA Service Worker (Fixed placement)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => console.log('Malvin PWA Registered'))
          .catch(err => console.error('PWA Registration failed', err));
      });
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  if (authLoading) {
    return (
      <div style={{ 
        backgroundColor: '#000', height: '100vh', display: 'flex', 
        alignItems: 'center', justifyContent: 'center', color: '#444',
        fontSize: '10px', letterSpacing: '4px' 
      }}>
        MALVIN
      </div>
    );
  }

  if (!user) return <Login />;

  return <MalvinInterface user={user} handleSignOut={handleSignOut} />;
}

export default App;