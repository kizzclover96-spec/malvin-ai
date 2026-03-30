import { useState, useEffect } from 'react';
import './App.css';
import { useMalvinActivation } from "./pages/buttonlogic";
import Welcomeview from "./components/welcome";
import Session from "./pages/session";
import Login from "./pages/login";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

// --- SUB-COMPONENT: The Main App Interface ---
function MalvinInterface({ user, handleSignOut }) {
  // Logic hook for LiveKit session linked to Firebase UID
  const { wakeMalvin, token, loading: sessionLoading, setToken } = useMalvinActivation(user.uid);

  return (
    <div className="app-container" style={{ backgroundColor: '#000', minHeight: '100vh', color: 'white' }}>
      
      {/* NAVIGATION LOGIC */}
      {token ? (
        /* The Sign Out button is now handled INSIDE Session.tsx */
        <Session 
          token={token} 
          serverUrl={import.meta.env.VITE_LIVEKIT_URL} 
          userEmail={user.email} 
          onDisconnect={() => setToken(null)} 
          onSignOut={handleSignOut} 
        />
      ) : (
        /* Welcomeview auto-triggers wakeMalvin via its own useEffect */
        <Welcomeview 
          onWakeClick={wakeMalvin} 
          isConnecting={sessionLoading} 
          userEmail={user?.email} 
        />
      )}
    </div>
  );
}

// --- MAIN APP ENTRY ---
function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 1. Monitor Firebase Auth State
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

  // 2. Register PWA Service Worker
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

  // Global Auth Loading Screen
  if (authLoading) {
    return (
      <div style={{ 
        backgroundColor: '#000', height: '100vh', display: 'flex', 
        alignItems: 'center', justifyContent: 'center', color: '#333',
        fontSize: '10px', letterSpacing: '5px', fontWeight: 'bold'
      }}>
        MALVIN
      </div>
    );
  }

  // Route to Login if not authenticated
  if (!user) {
    return <Login />;
  }

  // Standard flow
  return <MalvinInterface user={user} handleSignOut={handleSignOut} />;
}

export default App;