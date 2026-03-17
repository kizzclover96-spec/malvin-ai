import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

export default function Login() {
  // REMOVED: const router = useRouter(); 
  // We don't need this because App.jsx automatically switches views when you log in.

  const handleGoogleLogin = async () => {
    try {
      // Switched to Popup for better Vite compatibility
      const result = await signInWithPopup(auth, googleProvider);
      
      const user = result.user;
      console.log("User logged in:", user.displayName);
      
      // No manual redirect needed! App.jsx handles the 'user' state.
    } catch (error: any) {
      console.error("Login failed:", error.message);
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
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '10px', letterSpacing: '-1px' }}>
        MALVIN
      </h1>
      <p style={{ color: '#666', marginBottom: '40px', fontSize: '14px' }}>
        Your AI agent is waiting.
      </p>

      <button 
        onClick={handleGoogleLogin}
        style={{
          backgroundColor: '#fff',
          color: '#000',
          border: 'none',
          padding: '16px 32px',
          borderRadius: '30px',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(255,255,255,0.1)'
        }}
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="Google" />
        Continue with Google
      </button>
    </div>
  );
}