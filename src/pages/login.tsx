import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { useEffect } from "react";

export default function Login() {
  
  // 1. This "catches" the user after the phone redirects them back to the app
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log("Successfully logged in via redirect:", result.user);
        }
      })
      .catch((error) => {
        console.error("Redirect login error:", error);
      });
  }, []);

  const handleGoogleLogin = async () => {
    // 2. Check if the user is on a phone or tablet
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    try {
      if (isMobile) {
        // Mobile browsers handle Redirects much better than Popups
        await signInWithRedirect(auth, googleProvider);
      } else {
        // Desktop browsers work perfectly with Popups
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 0,
      padding: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      color: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '3.5rem', 
          letterSpacing: '0.8rem', 
          marginBottom: '2rem',
          fontWeight: 'bold' 
        }}>
          MALVIN
        </h1>
        <button 
          onClick={handleGoogleLogin}
          style={{
            padding: '16px 40px',
            borderRadius: '50px',
            border: 'none',
            backgroundColor: '#fff',
            color: '#000',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(255,255,255,0.1)'
          }}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}