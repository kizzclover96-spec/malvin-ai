import { useState, useEffect } from 'react';
import './App.css';
import { useMalvinActivation } from "./pages/buttonlogic";
import Welcomeview from "./components/welcome";
import Session from "./pages/session";

function App() {
  // We'll use a hardcoded ID for now so the backend tools still function
  const dummyUser = { uid: "guest_user_123" };

  // Hook now uses the dummy ID instead of Firebase user?.uid
  const { wakeMalvin, token, loading: sessionLoading, setToken } = useMalvinActivation(dummyUser.uid);

  return (
    <div className="app-container" style={{ backgroundColor: '#000', minHeight: '100vh', color: 'white' }}>
      
      {/* --- STATUS BAR (Simplified) --- */}
      <div style={{
        position: 'fixed', top: '20px', right: '20px',
        display: 'flex', alignItems: 'center', gap: '15px',
        zIndex: 2000, backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: '8px 16px', borderRadius: '30px',
        backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '10px', height: '10px', backgroundColor: '#00ff88',
            borderRadius: '50%', boxShadow: '0 0 10px #00ff88'
          }} />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#00ff88' }}>Guest Mode</span>
        </div>
      </div>

      {/* --- CONDITIONAL SCREEN LOGIC --- */}
      {token ? (
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