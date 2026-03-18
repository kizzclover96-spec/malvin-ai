import { auth } from "../firebase";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged 
} from "firebase/auth";
import { useEffect } from "react";

export default function Login() {

  useEffect(() => {
    // If the user is already logged in, the App.jsx state will handle it,
    // but we can log it here for debugging.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User session detected.");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      // Using Popup avoids the "missing initial state" error on mobile
      await signInWithPopup(auth, provider);
      // App.jsx will automatically see this change and swap the screen
    } catch (error) {
      console.error("Login failed:", error);
      if (error.code !== 'auth/cancelled-popup-request') {
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
          fontSize: '3.5rem', letterSpacing: '0.8rem', 
          marginBottom: '2rem', fontWeight: 'bold' 
        }}>
          MALVIN
        </h1>
        <button 
          onClick={handleGoogleLogin}
          style={{
            padding: '16px 40px', borderRadius: '50px', border: 'none',
            backgroundColor: '#fff', color: '#000', fontSize: '1rem',
            fontWeight: '600', cursor: 'pointer',
            transition: 'transform 0.2s'
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