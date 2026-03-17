import { useState, useEffect } from 'react';
import './App.css';
import { useMalvinActivation } from "./pages/buttonlogic";
import Welcomeview from "./components/welcome";
import Session from "./pages/session";
import Login from "./pages/login"; // Import your new login page
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase'; // Path to your firebase.ts

function App() {
  const { wakeMalvin, token, loading: sessionLoading, setToken } = useMalvinActivation();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 1. Listen for the User
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. While checking Firebase, show nothing or a splash screen
  if (authLoading) return <div style={{ backgroundColor: '#000', height: '100vh' }} />;

  // 3. The Guard Logic
  return (
    <div className="app-container">
      {!user ? (
        /* Not logged in? Show Login */
        <Login />
      ) : token ? (
        /* Logged in AND has LiveKit token? Show Session */
        <Session 
          token={token} 
          serverUrl={import.meta.env.VITE_LIVEKIT_URL} 
          onDisconnect={() => setToken(null)} 
        />
      ) : (
        /* Logged in but NO token yet? Show Welcome */
        <Welcomeview 
          onWakeClick={wakeMalvin} 
          isConnecting={sessionLoading} 
        />
      )}
    </div>
  );
}

export default App;