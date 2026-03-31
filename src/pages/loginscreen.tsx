import React from "react";
import { auth } from "../firebase"; // Ensure this path is correct
import { 
  GoogleAuthProvider, 
  signInWithCredential, 
  signInWithPopup 
} from "firebase/auth";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

export default function Login() {

  const handleGoogleLogin = async () => {
    console.log("Login button clicked!");
    
    try {
      if (Capacitor.isNativePlatform()) {
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const result = await signInWithCredential(auth, credential);
        console.log("Native Login Success:", result.user);
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        const result = await signInWithPopup(auth, provider);
        console.log("Web Login Success:", result.user);
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert(`Login failed: ${error.message}`);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: '#ffffff', color: '#000000', display: 'flex', flexDirection: 'column',
      zIndex: 9999, fontFamily: 'sans-serif'
    }}>
      {/* Top Spacer to push content towards center */}
      <div style={{ flex: 1 }}></div>
      
      {/* The Grey Rectangle Container */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        width: '100%' 
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          backgroundColor: 'rgba(50, 50, 50, 0.8)', 
          width: '80%', 
          maxWidth: '800px', 
          borderRadius: '24px', 
          backdropFilter: 'blur(10px)',
          color: '#fff' // Ensures text inside the dark grey box is white
        }}>
          <h1 style={{ 
            fontSize: '4rem', 
            letterSpacing: '1.2rem', 
            fontWeight: '900', 
            textTransform: 'uppercase', 
            margin: '0 0 2.5rem 0' 
          }}>
            MALVIN
          </h1>
          
          <button 
            onClick={handleGoogleLogin} 
            style={{
              padding: '20px 50px', 
              borderRadius: '50px', 
              border: 'none',
              backgroundColor: '#fff', 
              color: '#000', 
              fontSize: '1.1rem', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Continue with Google
          </button>
        </div>
      </div>

      {/* Bottom Footer Section */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'flex-end', 
        alignItems: 'center', 
        paddingBottom: '50px' 
      }}>
        <p style={{ 
          opacity: 0.5, 
          letterSpacing: '0.2rem', 
          fontSize: '0.8rem', 
          textTransform: 'uppercase',
          color: '#000' // Keeps footer black to match your white background
        }}>
          The future in your palms
        </p>
      </div>
    </div>
  );
}