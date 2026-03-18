import { auth, googleProvider } from "../firebase"; // Fixed the extra space in path
import { signInWithPopup } from "firebase/auth";

export default function Login() {
  const handleGoogleLogin = async () => {
    try {
      // FIX: Changed 'provider' to 'googleProvider' to match your import
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Logged in:", result.user);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: '#000',
      display: 'flex',          // FIX: lowercase 'display'
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 0,
      padding: 0,
      position: 'fixed',         // FIX: lowercase 'position'
      top: 0,
      left: 0,
      color: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        {/* FIX: lowercase 'h1' and lowercase 'style' */}
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
          style={{             // FIX: lowercase 'style'
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