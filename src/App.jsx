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

  const [showWelcome, setShowWelcome] = useState(true);

  // Called after 6s animation
  const handleWelcomeFinish = async () => {
    setShowWelcome(false);
    await wakeMalvin();
  };

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', color: 'white' }}>

      {/* Top right logout */}
      <div style={{
        position: 'fixed', top: '15px', right: '15px',
        zIndex: 2000
      }}>
        <button onClick={handleSignOut} style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          cursor: 'pointer',
          fontSize: '12px'
        }}>
          Log out
        </button>
      </div>

      {/* FLOW CONTROL */}
      {showWelcome ? (
        <Welcomeview 
          onFinish={handleWelcomeFinish}
          userEmail={user?.email}
        />
      ) : token ? (
        <Session 
          token={token}
          serverUrl={import.meta.env.VITE_LIVEKIT_URL}
          userEmail={user.email}
          onDisconnect={() => {
            setToken(null);
            setShowWelcome(true); // go back to welcome when session ends
          }}
        />
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#555',
          fontSize: '12px',
          letterSpacing: '2px'
        }}>
          CONNECTING...
        </div>
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

  if (!user) {
    return <Login />;
  }

  return <MalvinInterface user={user} handleSignOut={handleSignOut} />;
}

export default App;