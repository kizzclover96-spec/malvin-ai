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
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center', // Centers the main content (Title + Button)
      zIndex: 99999,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box'
    }}>
      
      {/* Main Content: Title & Button */}
      <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{ 
          fontSize: '3.5rem', 
          letterSpacing: '1rem', 
          marginBottom: '2rem', 
          fontWeight: '900',
          textTransform: 'uppercase',
          margin: 0,
          paddingLeft: '1rem' 
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
            fontSize: '1rem',
            fontWeight: '700', 
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            alignSelf: 'center'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Continue with Google
        </button>
      </div>

      {/* Footer Text: Fixed at the bottom */}
      <div style={{ 
        paddingBottom: '40px', // Distance from the very bottom of the screen
        opacity: 0.6, // Makes it look subtle and elegant
        fontSize: '0.9rem',
        letterSpacing: '0.1rem',
        fontWeight: '300'
      }}>
        The future in your palms
      </div>

    </div>
  );
}