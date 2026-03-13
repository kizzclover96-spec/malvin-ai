// src/pages/buttonlogic.tsx
import { useState } from 'react';

export function useMalvinActivation() {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const wakeMalvin = async () => {
    setLoading(true);
    try {
      // 1. Call your Vercel backend to get a token
      // We use a relative path so it works on both localhost and Vercel.
      // We pass a room name and username to ensure the token is valid.
      const roomName = "malvin-room"; 
      const participantName = "User-" + Math.floor(Math.random() * 1000);

      const response = await fetch(`/api/get-participant-token?room=${roomName}&username=${participantName}`); 
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      
      // 2. Set the token to trigger the UI switch
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