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
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh',
      // --- IMAGE BACKGROUND LOGIC ---
      backgroundImage: '\public\Malvin self.png', // Matches your filename in the public folder
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      // ------------------------------
      display: 'flex', 
      flexDirection: 'column',
      zIndex: 9999, 
      fontFamily: 'sans-serif'
    }}>
      
      {/* Spacer to push the card down */}
      <div style={{ flex: 1.5 }}></div>
      
      {/* The Frosted Glass Container */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        width: '100%',
        paddingBottom: '20px'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '50px 30px', 
          backgroundColor: 'rgba(255, 255, 255, 0.1)', // Light white tint
          width: '85%', 
          maxWidth: '450px', 
          borderRadius: '32px', 
          backdropFilter: 'blur(15px)', // This creates the "glass" look over your photo
          border: '1px solid rgba(255, 255, 255, 0.2)', 
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
        }}>
          <h1 style={{ 
            fontSize: '3rem', 
            letterSpacing: '0.8rem', 
            fontWeight: '900', 
            textTransform: 'uppercase', 
            margin: '0 0 0.5rem 0',
            color: '#fff'
          }}>
            MALVIN
          </h1>

          <p style={{ 
            opacity: 0.7, 
            marginBottom: '2.5rem', 
            fontSize: '0.8rem', 
            letterSpacing: '0.2rem' 
          }}>
            THE FUTURE IN YOUR PALMS
          </p>
          
          <button 
            onClick={handleGoogleLogin} 
            style={{
              width: '100%', 
              padding: '18px 0', 
              borderRadius: '16px', 
              border: 'none',
              backgroundColor: '#fff', 
              color: '#000', 
              fontSize: '1rem', 
              fontWeight: '800', 
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Continue with Google
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        paddingBottom: '30px' 
      }}>
        <p style={{ 
          opacity: 0.5, 
          letterSpacing: '0.3rem', 
          fontSize: '0.65rem', 
          textTransform: 'uppercase'
        }}>
          MALVIN AI • 2024
        </p>
      </div>
    </div>
  );
}