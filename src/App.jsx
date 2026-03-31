function MalvinInterface({ user, handleSignOut }) {
  const { wakeMalvin, token, loading: sessionLoading, setToken } =
    useMalvinActivation(user.uid);

  return (
    <div className="app-container" style={{
      backgroundColor: '#000',
      minHeight: '100vh',
      color: 'white'
    }}>
      {token ? (
        <Session
          token={token}
          serverUrl={import.meta.env.VITE_LIVEKIT_URL}
          userEmail={user.email}
          onDisconnect={() => setToken(null)}
        />
      ) : sessionLoading ? (
        // ✅ Only show while waking AI
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#444'
        }}>
          CONNECTING...
        </div>
      ) : (
        <Welcomeview
          onWakeClick={wakeMalvin}
          userEmail={user?.email}
        />
      )}
    </div>
  );
}