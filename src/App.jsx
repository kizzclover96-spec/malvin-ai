import React from 'react';
import { Session } from './Session'; // adjust path if needed
import Welcomeview from './Welcomeview'; // adjust path if needed
import useMalvinActivation from './hooks/useMalvinActivation'; // adjust path if needed

function MalvinInterface({ user, handleSignOut }) {
  const { wakeMalvin, token, loading: sessionLoading, setToken } =
    useMalvinActivation(user.uid);

  return (
    <div
      className="app-container"
      style={{
        backgroundColor: '#000',
        minHeight: '100vh',
        color: 'white',
      }}
    >
      {token ? (
        <Session
          token={token}
          serverUrl={import.meta.env.VITE_LIVEKIT_URL}
          userEmail={user.email}
          onDisconnect={() => setToken(null)}
          onSignOut={handleSignOut}
        />
      ) : sessionLoading ? (
        // ✅ Only show while waking AI
        <div
          style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#444',
          }}
        >
          CONNECTING...
        </div>
      ) : (
        <Welcomeview onWakeClick={wakeMalvin} userEmail={user?.email} />
      )}
    </div>
  );
}

// ✅ Export as default so main.jsx can import it
export default MalvinInterface;