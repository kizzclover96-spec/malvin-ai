import React, { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // MATRIX EFFECT
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };

    const chars = "010101010101010101";
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,102,255,0.35)";
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    return () => clearInterval(interval);
  }, []);

  // GOOGLE LOGIN
  const handleGoogleLogin = async () => {
    if (!agreed) return;

    try {
      if (Capacitor.isNativePlatform()) {
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(
          googleUser.authentication.idToken
        );
        await signInWithCredential(auth, credential);
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(auth, provider);
      }
    } catch (error: any) {
      alert("Login failed: " + error.message);
    }
  };

  // EMAIL LOGIN
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', margin: '5px 0' }}>
              <div style={{ fontSize: "0.8rem" }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />{" "}
                I agree to{" "}
                <span onClick={() => window.open("/terms", "_blank")} style={{ color: "#00d4ff", cursor: "pointer" }}>
                  Terms
                </span>{" "}
                and{" "}
                <span onClick={() => window.open("/privacy", "_blank")} style={{ color: "#00d4ff", cursor: "pointer" }}>
                  Privacy Policy
                </span>
              </div>
            </div>
            <button 
              type="submit"
              disabled={!agreed} // DISABLES BUTTON
              style={{
                padding: '15px', borderRadius: '12px', border: '2px solid #ffffff', 
                backgroundColor: agreed ? '#0066ff' : '#333', // Changes color when disabled
                color: agreed ? '#fff' : '#888', 
                fontWeight: 'bold', 
                fontSize: '1rem', cursor: agreed ? 'pointer' : 'not-allowed', 
                marginTop: '10px',
                transition: '0.3s'
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
            disabled={!agreed}
            onClick={handleGoogleLogin} 
            style={{
              width: '100%', padding: '15px 0', borderRadius: '16px', border: 'none',
              backgroundColor: agreed ? '#fff' : '#222', 
              color: agreed ? '#000' : '#666', 
              fontSize: '1rem', fontWeight: '800', 
              cursor: agreed ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              transition: '0.3s'
            }}
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google Logo" 
              style={{ width: '20px', height: '20px', opacity: agreed ? 1 : 0.3 }} 
            />
            Continue with Google
          </button>
          {/* ✅ IMPRESSUM LINK */}
          <p style={{ marginTop: "15px", fontSize: "0.75rem", opacity: 0.7 }}>
            <span
              onClick={() => window.open("/impressum", "_blank")}
              style={{ cursor: "pointer", textDecoration: "underline" }}
            >
              Impressum
            </span>
          </p>
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