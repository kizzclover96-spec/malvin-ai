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
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        await signInWithCredential(auth, credential);
      } else {
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
      // FORCE FULL SCREEN
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      color: '#fff',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 999999,
      fontFamily: 'sans-serif',
      boxSizing: 'border-box'
    }}>
      
      {/* 1. TOP SPACER (Pushes content down) */}
      <div style={{ flex: 1 }}></div>

      {/* 2. CENTER CONTENT (MALVIN + BUTTON) */}
      <div style={{ textAlign: 'center', padding: '0 20px' }}>
        <h1 style={{ 
          fontSize: '4rem', 
          letterSpacing: '1.2rem', 
          fontWeight: '900', 
          margin: '0 0 2rem 0',
          paddingLeft: '1.2rem', // Offset for perfect center
          textTransform: 'uppercase'
        }}>
          MALVIN
        </h1>
        
        <button 
          onClick={handleGoogleLogin}
          style={{
            padding: '20px 50px', 
            borderRadius: '50px', 
            border: 'none',
            backgroundColor: '#fff', 
            color: '#000', 
            fontSize: '1.1rem',
            fontWeight: 'bold', 
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(255,255,255,0.2)'
          }}
        >
          Continue with Google
        </button>
      </div>

      {/* 3. BOTTOM CONTENT (SLOGAN) */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'flex-end', 
        alignItems: 'center',
        paddingBottom: '50px' // Space from bottom of phone
      }}>
        <p style={{ 
          margin: 0, 
          opacity: 0.5, 
          letterSpacing: '0.2rem', 
          fontSize: '0.8rem',
          textTransform: 'uppercase'
        }}>
          The future in your palms
        </p>
      </div>

    </div>
  );
}