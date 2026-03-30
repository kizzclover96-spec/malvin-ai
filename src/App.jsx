import { useState, useEffect } from 'react';
import './App.css';
import { useMalvinActivation } from "./pages/buttonlogic";
import Welcomeview from "./components/welcome";
import Session from "./pages/session";
import Login from "./pages/login";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

function MalvinInterface({ user, handleSignOut }) {
  const { wakeMalvin, token, loading: sessionLoading, setToken } = useMalvinActivation(user.uid);

  // Moved Service Worker registration inside a proper useEffect
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => console.log('Malvin PWA Registered'))
          .catch(err => console.error('PWA Registration failed', err));
      });
    }
  }, []);

  return (
    <div className="app-container" style={{ backgroundColor: '#000', minHeight: '100vh', color: 'white' }}>
      {token ? (
        <Session 
          token={token} 
          serverUrl={import.meta.env.VITE_LIVEKIT_URL} 
          userEmail={user.email} 
          onDisconnect={() => setToken(null)} 
          onSignOut={handleSignOut} // Passed to session
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

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

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

  if (!user) return <Login />;

  return <MalvinInterface user={user} handleSignOut={handleSignOut} />;
}

export default App;