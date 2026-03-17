import { auth, googleProvider } from "../firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithRedirect(auth, googleProvider);
      // This gives you a Google Access Token. You can use it to access the Google API.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      // The signed-in user info.
      const user = result.user;
      
      console.log("User logged in:", user.displayName);
      
      // Redirect to the main app/session after login
      router.push("/"); 
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