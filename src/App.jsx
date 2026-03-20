// Inside your Login.jsx component
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase';

const Login = () => {
  const handleLogin = async () => {
    try {
      // 1. Trigger the native Android account selector
      const googleUser = await GoogleAuth.signIn();
      
      // 2. Create a Firebase credential from the native token
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
      
      // 3. Sign in to Firebase with that credential
      // This will trigger the 'onAuthStateChanged' in your App.jsx!
      await signInWithCredential(auth, credential);
      
    } catch (error) {
      console.error("Native Google Login Failed:", error);
      // Fallback for web testing if needed
    }
  };

  return (
    <div className="login-screen">
       <button onClick={handleLogin}>Sign in with Google</button>
    </div>
  );
};