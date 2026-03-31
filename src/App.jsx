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

  return (
    <div className="app-container" style={{ 
      backgroundColor: '#000', 
      minHeight: '100vh', 
      color: 'white',
      transition: 'opacity 0.8s ease-in-out' 
    }}>
      {token ? (
        <Session 
          token={token} 
          serverUrl={import.meta.env.VITE_LIVEKIT_URL} 
          userEmail={user.email}
          onDisconnect={() => setToken(null)} 
          onSignOut={handleSignOut} // Pass signout to session
        />
      ) : (
        <Welcomeview 
          onWakeClick={wakeMalvin} 
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
    try { await signOut(auth); } catch (err) { console.error(err); }
  };

  if (authLoading) return <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>INITIALIZING...</div>;
  if (!user) return <Login />;

  return <MalvinInterface user={user} handleSignOut={handleSignOut} />;
}

export default App;