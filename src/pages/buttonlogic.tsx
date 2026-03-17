// src/pages/buttonlogic.tsx
import { useState } from 'react';

// Pass the firebaseUid into the hook
export function useMalvinActivation(firebaseUid: string | undefined) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const wakeMalvin = async () => {
    if (!firebaseUid) {
      alert("You need to be logged in first!");
      return;
    }

    setLoading(true);
    try {
      // 1. UNIQUE ROOM
      const uniqueId = Math.random().toString(36).substring(7);
      const roomName = `malvin-session-${uniqueId}`; 
      
      // 2. USE FIREBASE UID AS IDENTITY
      // We send the actual firebaseUid as the 'username' parameter
      const response = await fetch(
        `/api/get-participant-token?room=${roomName}&username=${firebaseUid}`
      ); 
      
      if (!response.ok) throw new Error(`Server responded with ${response.status}`);

      const data = await response.json();
      
      if (data.token) {
        setToken(data.token);
      } else {
        throw new Error("No token received");
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