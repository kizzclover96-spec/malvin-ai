import { auth } from "./firebase"; 
import { 
  GoogleAuthProvider, 
  signInWithCredential, 
  signInWithRedirect 
} from "firebase/auth";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

export default function Login() {

  const handleGoogleLogin = async () => {
    console.log("Button clicked!");
    try {
      if (Capacitor.isNativePlatform()) {
        // This will now work on your phone!
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        await signInWithCredential(auth, credential);
      } else {
        // This will now work on your laptop!
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithRedirect(auth, provider);
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("Error: " + error.message);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: '#000', color: '#fff', display: 'flex', flexDirection: 'column',
      zIndex: 9999, fontFamily: 'sans-serif', margin: 0, padding: 0
    }}>
      <div style={{ flex: 1 }}></div>
      <div style={{ textAlign: 'center', padding: '0 20px' }}>
        <h1 style={{ fontSize: '4rem', letterSpacing: '1.2rem', fontWeight: '900', textTransform: 'uppercase', margin: '0 0 2rem 0' }}>
          MALVIN
        </h1>
        <button onClick={handleGoogleLogin} style={{
          padding: '20px 50px', borderRadius: '50px', border: 'none',
          backgroundColor: '#fff', color: '#000', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer'
        }}>
          Continue with Google
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '50px' }}>
        <p style={{ opacity: 0.5, letterSpacing: '0.2rem', fontSize: '0.8rem', textTransform: 'uppercase' }}>
          The future in your palms
        </p>
      </div>
    </div>
  );
}