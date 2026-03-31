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
      // Corrected Image Path
      backgroundImage: 'url("/loginscreen.png")', 
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#000', // Backup color
      display: 'flex', 
      flexDirection: 'column',
      zIndex: 9999, 
      fontFamily: 'sans-serif',
      color: '#ffffff'
    }}>
      
      <div style={{ flex: 1.5 }}></div>
      {/*The frosted glass*/}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        width: '100%',
        paddingBottom: '20px'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 30px', 
          backgroundColor: 'rgba(255, 255, 255, 0.1)', 
          width: '85%', 
          maxWidth: '450px', 
          borderRadius: '32px', 
          backdropFilter: 'blur(15px)', 
          WebkitBackdropFilter: 'blur(15px)', // Fix for Safari
          border: '2px solid rgba(255, 255, 255, 0.2)', 
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
        }}>
          <h1 style={{ 
            fontSize: '3rem', 
            letterSpacing: '0.8rem', 
            fontWeight: '900', 
            textTransform: 'uppercase', 
            margin: '0 0 0.1rem 0',
            color: '#fff'
          }}>
            MALVIN
          </h1>

          <p style={{ 
            opacity: 0.7, 
            marginBottom: '4rem', 
            fontSize: '0.8rem', 
            letterSpacing: '0.2rem' 
          }}>
            THE FUTURE IN YOUR PALMS
          </p>

          {/* --- EMAIL & PASSWORD SECTION --- */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
            <input 
              type="email" 
              placeholder="Email Address" 
              style={{
                padding: '15px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                outline: 'none',
                fontSize: '1rem'
              }}
            />
            <input 
              type="password" 
              placeholder="Password" 
              style={{
                padding: '15px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                outline: 'none',
                fontSize: '1rem'
              }}
            />
            <button style={{
              padding: '15px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#0066ff', // A nice blue for the main sign-in
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: 'pointer',
              marginTop: '10px'
            }}>
              Sign In
            </button>
          </div>

          <div style={{ margin: '15px 0', opacity: 0.5, fontSize: '0.8rem' }}>OR</div>
          
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