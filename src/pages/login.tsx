import { auth } from "./firebase"; 
import { 
  GoogleAuthProvider, 
  signInWithCredential, 
  signInWithPopup 
} from "firebase/auth";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

export default function Login() {

  const handleGoogleLogin = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // --- NATIVE LOGIC (Android/iOS) ---
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        await signInWithCredential(auth, credential);
      } else {
        // --- WEB LOGIC (Vercel/Browser) ---
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      console.error("Login failed:", error);
      if (error.message !== "user cancelled selection") {
        alert("Login error: " + error.message);
      }
    }
  };

  return (
    <div style={{
      // This part fixes the "Half Screen" issue
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      
      // Layout logic
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      zIndex: 99999, // Stays above any other app styles
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '3.5rem', 
          letterSpacing: '0.8rem', 
          marginBottom: '2.5rem', 
          fontWeight: '900',
          textTransform: 'uppercase',
          margin: 0,
          paddingLeft: '0.8rem' // Visual centering fix
        }}>
          MALVIN
        </h1>
        
        <button 
          onClick={handleGoogleLogin}
          style={{
            padding: '18px 45px', 
            borderRadius: '50px', 
            border: 'none',
            backgroundColor: '#fff', 
            color: '#000', 
            fontSize: '1.1rem',
            fontWeight: '700', 
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1)'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}