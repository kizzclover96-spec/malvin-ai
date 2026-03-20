import { useState } from 'react';

export function useMalvinActivation(firebaseUid) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);

  const wakeMalvin = async () => {
    if (!firebaseUid) {
      alert("You need to be logged in first!");
      return;
    }

    setLoading(true);
    
    try {
      // 1. GET GPS COORDINATES
      const getPosition = () => {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            console.log("Geolocation not supported");
            resolve(null);
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => {
              console.warn(`Location blocked: ${err.message}`);
              resolve(null); 
            },
            { timeout: 5000, enableHighAccuracy: true }
          );
        });
      };

      const coords = await getPosition();

      // 2. GENERATE SESSION INFO
      const uniqueId = Math.random().toString(36).substring(7);
      const roomName = `malvin-session-${uniqueId}`; // FIXED: Used backticks
      
      const metadataStr = JSON.stringify({ 
        location: coords, 
        firebaseUid: firebaseUid 
      });

      // 3. SINGLE FETCH CALL
      // If running locally, you might need http://localhost:3000/api...
      // On Vercel, /api/ works automatically.
      const response = await fetch(
        `/api/get-participant-token?room=${roomName}&username=${firebaseUid}&metadata=${encodeURIComponent(metadataStr)}`
      ); 
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // FIXED: matched variable name to typical backend response (data.token)
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