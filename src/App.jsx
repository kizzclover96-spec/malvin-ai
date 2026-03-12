import './App.css';
import { useMalvinActivation } from "./pages/buttonlogic";
import Welcomeview from "./components/welcome"; // Added /pages/
import Session from "./pages/session";
function App() {
  const { wakeMalvin, token, loading, setToken } = useMalvinActivation();

  return (
    <div className="app-container">
      {token ? (
        <Session 
          token={token} 
          serverUrl={import.meta.env.VITE_LIVEKIT_URL} 
          onDisconnect={() => setToken(null)} 
        />
      ) : (
        <Welcomeview 
          onWakeClick={wakeMalvin} 
          isConnecting={loading} 
        />
      )}
    </div>
  );
}

export default App;