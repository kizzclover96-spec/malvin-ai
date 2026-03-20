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
        // --- NATIVE ANDROID LOGIC ---
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        await signInWithCredential(auth, credential);
      } else {
        // --- WEB/VERCEL LOGIC ---
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
      // FIX: Pins the black background to every edge of the screen
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      height: '100vh',
      width: '100vw',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      zIndex: 9999, // Sits on top of everything
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '3.5rem', 
          letterSpacing: '0.8rem', 
          marginBottom: '2rem', 
          fontWeight: '900', // Bold/Thick "Malvin"
          textTransform: 'uppercase',
          margin: 0,
          paddingLeft: '0.8rem' // Offsets the last letter's spacing for perfect centering
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
            fontWeight: '700', 
            cursor: 'pointer', 
            transition: 'transform 0.2s ease',
            marginTop: '20px',
            boxShadow: '0 4px 15px rgba(255, 255, 255, 0.1)'
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