import { useState, useEffect } from 'react';
import './App.css';
import { useMalvinActivation } from "./pages/buttonlogic";
import Welcomeview from "./components/welcome";
import Session from "./pages/session";
import Login from "./pages/login";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';


// --- MALVIN INTERFACE ---
function MalvinInterface({ user, handleSignOut }) {
  const { wakeMalvin, token, loading: sessionLoading, setToken } =
    useMalvinActivation(user.uid);

  const [showWelcome, setShowWelcome] = useState(true);

  // Called after welcome animation
  const handleWelcomeFinish = async () => {
    try {
      await wakeMalvin(); // get token
      setShowWelcome(false); // switch AFTER token starts loading
    } catch (e) {
      console.error("Wake failed:", e);
    }
  };

  return (
    <div style={{
      backgroundColor: '#000',
      minHeight: '100vh',
      color: 'white'
    }}>

      {/* LOG OUT BUTTON */}
      <div style={{
        position: 'fixed',
        top: '15px',
        right: '15px',
        zIndex: 2000
      }}>
        <button
          onClick={handleSignOut}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Log out
        </button>
      </div>

      {/* FLOW CONTROL */}
      {showWelcome && !token ? (
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
            setShowWelcome(true); // go back to welcome
          }}
        />
      ) : (
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#aaa',
          fontSize: '14px',
          letterSpacing: '2px'
        }}>
          Connecting to Malvin...
        </div>
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
        console.log("🚀 Malvin User:", currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  // LOADING SCREEN
  if (authLoading) {
    return (
      <div style={{
        backgroundColor: '#000',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: '12px',
        letterSpacing: '2px'
      }}>
        INITIALIZING MALVIN...
      </div>
    );
  }

  // NOT LOGGED IN
  if (!user) {
    return <Login />;
  }

  // LOGGED IN
  return (
    <MalvinInterface
      user={user}
      handleSignOut={handleSignOut}
    />
  );
}

export default App;