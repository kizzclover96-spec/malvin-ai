import { auth } from "../firebase";
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
      // Check if we are running on a real Device (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        // 1. Trigger the Native Android Account Picker
        const googleUser = await GoogleAuth.signIn();
        
        // 2. Convert the token to a Firebase Credential
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        
        // 3. Sign in to Firebase (App.jsx will detect this via onAuthStateChanged)
        await signInWithCredential(auth, credential);

      } else {
        // FALLBACK: Use standard popup for Web/Browser testing
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
      }

    } catch (error) {
      console.error("Login failed:", error);
      // Don't alert if the user just swiped the picker away
      if (error.message !== "user cancelled selection") {
        alert("Login error: " + error.message);
      }
    }
  };

  return (
    <div style={{
      height: '100vh', width: '100vw', backgroundColor: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', position: 'fixed', top: 0, left: 0, color: 'white'
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
            padding: '16px 40px', borderRadius: '50px', border: 'none',
            backgroundColor: '#fff', color: '#000', fontSize: '1rem',
            fontWeight: '600', cursor: 'pointer', transition: 'transform 0.2s'
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