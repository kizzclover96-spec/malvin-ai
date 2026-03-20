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
      height: '100vh', 
      width: '100vw', 
      backgroundColor: '#000',
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      justifyContent: 'center', 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      <div style={{ textAlign: 'center', width: '100%' }}>
        <h1 style={{ 
          fontSize: 'clamp(2.5rem, 8vw, 4rem)', // Responsive sizing
          letterSpacing: '1rem', // Wide spacing for the "premium" look
          marginBottom: '3rem', 
          fontWeight: '900', // Max thickness
          textTransform: 'uppercase',
          paddingLeft: '1rem' // Balances the letter spacing on the right
        }}>
          MALVIN
        </h1>
        <button 
          onClick={handleGoogleLogin}
          style={{
            padding: '20px 50px', // Bigger padding
            borderRadius: '50px', 
            border: 'none',
            backgroundColor: '#fff', 
            color: '#000', 
            fontSize: '1.1rem',
            fontWeight: '700', 
            cursor: 'pointer', 
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(255, 255, 255, 0.1)',
            minWidth: '280px' // Prevents the button from looking too small
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 255, 255, 0.2)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 255, 255, 0.1)';
          }}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}