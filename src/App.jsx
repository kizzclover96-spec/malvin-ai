import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase'; // Fixed path: changed ../ to ./
import { Capacitor } from '@capacitor/core';

const Login = () => {
  const handleLogin = async () => {
    try {
      // Check if we are on Android/iOS
      if (Capacitor.isNativePlatform()) {
        // 1. Native Android account selector
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        await signInWithCredential(auth, credential);
      } else {
        // 2. Web Fallback (so Vercel/Browser testing still works)
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      console.error("Google Login Failed:", error);
    }
  };

  return (
    <div className="login-screen" style={{ backgroundColor: '#000', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
       <button 
         onClick={handleLogin}
         style={{ padding: '15px 30px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Sign in with Google
       </button>
    </div>
  );
};

export default Login;