// src/pages/buttonlogic.tsx
import { useState } from 'react';

export function useMalvinActivation() {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const wakeMalvin = async () => {
    setLoading(true);
    try {
      // 1. Call your backend to get a token
      // This automatically creates the room if it doesn't exist
      const response = await fetch('http://localhost:3001/token'); 
      const data = await response.json();
      
      // 2. Set the token to trigger the UI switch
      setToken(data.token);
    } catch (error) {
      console.error("Could not wake Malvin:", error);
      alert("Malvin is oversleeping. Try again!");
    } finally {
      setLoading(false);
    }
  };

  return { wakeMalvin, token, loading, setToken };
}