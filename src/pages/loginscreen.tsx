import React, { useState, useEffect, useRef } from "react"; // Added useEffect & useRef
import { auth } from "../firebase";
import { 
  GoogleAuthProvider, 
  signInWithCredential, 
  signInWithPopup 
} from "firebase/auth";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const canvasRef = useRef(null);

  // --- MATRIX RAIN EFFECT LOGIC ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = "01010101010101010101010101010101"; // Binary for AI feel
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // Trails
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0, 102, 255, 0.35)"; // Soft AI Blue
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    const interval = setInterval(draw, 33);
    return () => clearInterval(interval);
  }, []);

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

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Account Created:", userCredential.user);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged In:", userCredential.user);
      }
    } catch (error) {
      console.error("Auth Error:", error.code);
      alert(error.message);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: '#000',
      display: 'flex', flexDirection: 'column',
      zIndex: 9999, fontFamily: 'sans-serif', color: '#ffffff',
      overflow: 'hidden' // Keeps everything inside
    }}>

      {/* --- ROTATION ANIMATIONS --- */}
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes spinRev { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
      `}</style>

      {/* 1. BASE IMAGE (Your main background) */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        backgroundImage: 'url("/Malvin self.png")',
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.6, zIndex: -3
      }} />

      {/* 2. MATRIX CANVAS (Data reading effect) */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        zIndex: -2, pointerEvents: 'none'
      }} />

      {/* 3. ROTATING TECH RINGS (HUD effect) */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', width: '500px', height: '500px',
        border: '1px dashed rgba(0, 102, 255, 0.4)', borderRadius: '50%',
        marginLeft: '-250px', marginTop: '-250px',
        animation: 'spin 15s linear infinite', zIndex: -1
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', width: '400px', height: '400px',
        border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '50%',
        marginLeft: '-200px', marginTop: '-200px',
        animation: 'spinRev 10s linear infinite', zIndex: -1
      }} />
      
      {/* --- YOUR ORIGINAL LOGIN UI --- */}
      <div style={{ flex: 1.5 }}></div>
      
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', paddingBottom: '20px', zIndex: 10 }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 30px', 
          backgroundColor: 'rgba(0, 0, 0, 0.4)', // Slightly darker for better contrast
          width: '85%', maxWidth: '450px', 
          borderRadius: '32px', 
          backdropFilter: 'blur(30px)', 
          WebkitBackdropFilter: 'blur(30px)',
          border: '1.5px solid rgba(255, 255, 255, 0.4)', 
          boxShadow: '0 0 40px rgba(0, 102, 255, 0.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
          <h1 style={{ fontSize: '3rem', letterSpacing: '0.8rem', fontWeight: '900', textTransform: 'uppercase', margin: '0 0 0.5rem 0', color: '#fff' }}>
            MALVIN
          </h1>

          <p style={{ opacity: 0.7, marginBottom: '3rem', fontSize: '0.8rem', letterSpacing: '0.2rem' }}>
            THE FUTURE IN YOUR PALMS
          </p>

          <form onSubmit={handleAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '10px' }}>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                padding: '15px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#fff', outline: 'none'
              }}
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                padding: '15px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#fff', outline: 'none'
              }}
            />
            <button 
              type="submit"
              style={{
                padding: '15px', borderRadius: '12px', border: '2px solid #ffffff', 
                backgroundColor: '#0066ff', color: '#fff', fontWeight: 'bold', 
                fontSize: '1rem', cursor: 'pointer', marginTop: '10px'
              }}
            >
              {isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p 
            onClick={() => setIsSignUp(!isSignUp)} 
            style={{ fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', opacity: 0.8, marginBottom: '10px' }}
          >
            {isSignUp ? "Already have an account? Sign In" : "New here? Create an account"}
          </p>

          <div style={{ margin: '10px 0', opacity: 0.3, fontSize: '0.8rem' }}>OR</div>

          <button 
            type="button"
            onClick={handleGoogleLogin} 
            style={{
              width: '100%', padding: '15px 0', borderRadius: '16px', border: 'none',
              backgroundColor: '#fff', color: '#000', fontSize: '1rem', fontWeight: '800', 
              cursor: 'pointer', transition: 'transform 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
            }}
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google Logo" 
              style={{ width: '20px', height: '20px' }} 
            />
            Continue with Google
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '30px' }}>
        <p style={{ opacity: 0.5, letterSpacing: '0.3rem', fontSize: '0.65rem', textTransform: 'uppercase' }}>
          MALVIN AI • 2026
        </p>
      </div>
    </div>
  );
}