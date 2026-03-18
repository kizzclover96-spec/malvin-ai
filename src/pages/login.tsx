import { auth } from "../firebase";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged 
} from "firebase/auth";
import { useEffect } from "react";

export default function Login() {

  useEffect(() => {
    // This checks if the user is already logged in when the page loads
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User detected, refreshing to home...");
        // This force-reloads the page to your base URL
        window.location.href = "/"; 
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      // Popup is the safest bet for mobile without a router setup
      await signInWithPopup(auth, provider);
      // Once the popup closes, the useEffect above will handle the redirect
    } catch (error: any) {
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
            fontWeight: '600', cursor: 'pointer'
          }}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}