import React from "react";
import { auth } from "../firebase";
import { 
  GoogleAuthProvider, 
  signInWithCredential, 
  signInWithRedirect 
} from "firebase/auth";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

export default function Login() {

  const handleGoogleLogin = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        await signInWithCredential(auth, credential);
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        // This triggers the redirect
        await signInWithRedirect(auth, provider);
      }
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  return (
    <div style={{ /* ... your container styles ... */ }}>
      <div style={{ flex: 1 }}></div>
      <div style={{ textAlign: 'center', padding: '0 20px' }}>
        <h1 style={{ // Fixed: lowercase h1 and style
          fontSize: '4rem', 
          letterSpacing: '1.2rem', 
          fontWeight: '900', 
          textTransform: 'uppercase', 
          margin: '0 0 2rem 0' 
        }}>
          MALVIN
        </h1>
        <button onClick={handleGoogleLogin} style={{ /* ... button styles ... */ }}>
          Continue with Google
        </button>
      </div>
      {/* ... rest of your footer ... */}
    </div>
  );
}