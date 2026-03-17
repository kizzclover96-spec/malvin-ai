// src/pages/buttonlogic.tsx
import { useState } from 'react';

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
      // 1. GET GPS COORDINATES
      const getPosition = (): Promise<{lat: number, lng: number} | null> => {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            console.log("Geolocation not supported");
            resolve(null);
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => {
              console.warn(`Location blocked or error: ${err.message}`);
              resolve(null); // Return null so the session can still start without GPS
            },
            { timeout: 5000, enableHighAccuracy: true }
          );
        });
      };

      const coords = await getPosition();

      // 2. GENERATE SESSION INFO
      const uniqueId = Math.random().toString(36).substring(7);
      const roomName = `malvin-session-${uniqueId}`; 
      
      // Pack the UID and Location into one metadata string
      const metadataStr = JSON.stringify({ 
        location: coords, 
        firebaseUid: firebaseUid 
      });

      // 3. SINGLE FETCH CALL
      // We send the room, the identity (firebaseUid), and the encoded metadata
      const response = await fetch(
        `/api/get-participant-token?room=${roomName}&username=${firebaseUid}&metadata=${encodeURIComponent(metadataStr)}`
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