import { useState } from 'react';
import Welcomeview from '../components/welcome'; // Adjust path if needed 
import Session from './session'; // Adjust path if needed 

export default function Page() {
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // This is the actual logic that we "pass" to the button 
  const handleWakeMalvin = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/get-participant-token');
      const data = await response.json();

      if (data.token) {
        setToken(data.token);
      } else {
        console.error("No token received:", data.error);
      }
    } catch (e) {
      console.error("Failed to wake Malvin:", e);
    } finally {
      setIsConnecting(false);
    }
  };

  // If we have a token, show the Chat Session. If not, show Welcome. 
  return (
    <main>
      {token ? (
        <Session
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || ''}
          onDisconnect={() => setToken(null)}
        />
      ) : (
        <Welcomeview
          onWakeClick={handleWakeMalvin}
          isConnecting={isConnecting}
        />
      )}
    </main>
  );
}