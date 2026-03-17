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
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white'
    }}>
      <h1>MALVIN</h1>
      <button 
        onClick={handleGoogleLogin}
        style={{
          padding: '16px 32px',
          borderRadius: '30px',
          cursor: 'pointer'
        }}
      >
        Continue with Google
      </button>
    </div>
  );
}