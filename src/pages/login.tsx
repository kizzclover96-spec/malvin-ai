import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

export default function Login() {
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Logged in as:", result.user.displayName);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Login failed:", error.message);
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
    alignItems: 'center',    // Horizontal centering
    justifyContent: 'center',   // Vertical centering
    margin: 0,               // Kill any default browser margins
    padding: 0,
    overflow: 'hidden',      // Prevent accidental scrollbars
    position: 'fixed',       // Ensure it stays relative to the screen
    top: 0,
    left: 0
  }}>
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ 
        fontSize: '3rem', 
        letterSpacing: '0.5rem', 
        marginBottom: '2rem',
        color: '#fff',
        fontWeight: 'bold'
      }}>
        MALVIN
      </h1>
      
      <button 
        onClick={handleGoogleLogin}
        style={{
          padding: '16px 40px',
          borderRadius: '50px',
          border: '1px solid rgba(255,255,255,0.2)',
          backgroundColor: '#fff',
          color: '#000',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        Continue with Google
      </button>
    </div>
  </div>
);