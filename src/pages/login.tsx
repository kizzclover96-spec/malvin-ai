import { auth } from "../firebase";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged 
} from "firebase/auth";
import { useEffect } from "react";
import { useRouter } from "next/router"; // Or 'next/navigation' if using App Router

export default function Login() {
  const router = useRouter();

  // 1. Listen for the login success
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User logged in:", user.uid);
        // Change '/dashboard' to whatever your main page is
        router.push('/'); 
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    
    // This force-opens the account picker, which helps bypass cache issues
    provider.setCustomParameters({ 
      prompt: 'select_account',
      auth_type: 'reauthenticate' 
    });

    try {
      // Use Popup for BOTH mobile and desktop. 
      // Modern mobile browsers handle this much better than Redirects.
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("Please allow popups for this site to log in.");
      } else {
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