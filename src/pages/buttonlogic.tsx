// src/pages/buttonlogic.tsx
import { useState } from 'react';

export function useMalvinActivation() {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const wakeMalvin = async () => {
    setLoading(true);
    try {
      // 1. GENERATE A UNIQUE ROOM NAME
      // This prevents multiple users from ending up in the same session.
      const uniqueId = Math.random().toString(36).substring(7);
      const roomName = `malvin-session-${uniqueId}`; 
      
      // Keep the unique participant name as well
      const participantName = "User-" + Math.floor(Math.random() * 1000);

      // 2. Call the Vercel backend using the dynamic roomName
      // The API will now create a token specifically for this unique room.
      const response = await fetch(`/api/get-participant-token?room=${roomName}&username=${participantName}`); 
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      
      // 3. Set the token to trigger the UI switch to the Session component
      if (data.token) {
        setToken(data.token);
      } else {
        throw new Error("No token received from server");
      }

    } catch (error) {
      console.error("Could not wake Malvin:", error);
      alert("Malvin is oversleeping. Try again!");
    } finally {
      setLoading(false);
    }
  };

  return { wakeMalvin, token, loading, setToken };
}