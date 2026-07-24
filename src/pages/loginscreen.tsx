import React, { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { ref, update, serverTimestamp } from "firebase/database";
import { db } from "../firebase";
import { initializeUser } from "../services/initializeUser";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // MATRIX EFFECT
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chars = "010101010101010101";
    const fontSize = 14;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();

    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

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

    window.addEventListener("resize", resize);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const saveUserMetadata = async (userUid: string) => {
    try {
      // Get public IP
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipRes.json();
      
      // Get Device/Browser info
      const userAgent = navigator.userAgent;

      // Update the user's security node
      const userRef = ref(db, `users/${userUid}/security`);
      await update(userRef, {
        lastIp: ip,
        userAgent: userAgent,
        lastLogin: serverTimestamp(),
      });
    } catch (err) {
      console.error("Security logging failed:", err);
    }
  };

  // PASSWORD RESET HANDLER
  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      alert("Error sending reset email: " + error.message);
    }
  };

  // GOOGLE LOGIN
  const handleGoogleLogin = async () => {
    if (!agreed) return;
    try {
      let userCredential;
      if (Capacitor.isNativePlatform()) {
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        userCredential = await signInWithCredential(auth, credential);
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        userCredential = await signInWithPopup(auth, provider);
      }
      
      // Capture metadata after success
      if (userCredential.user) {
        await saveUserMetadata(userCredential.user.uid);
        await initializeUser(userCredential.user);
      }
    } catch (error: any) {
      alert("Login failed: " + error.message);
    }
  };

  // EMAIL AUTH
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;

    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      // Capture metadata after success
      if (userCredential.user) {
        await saveUserMetadata(userCredential.user.uid);
        await initializeUser(userCredential.user);
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
      overflow: 'hidden'
    }}>

      {/* --- ROTATION ANIMATIONS --- */}
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes spinRev { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
      `}</style>

      {/* 1. BASE IMAGE */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        backgroundImage: 'url("/Malvin self.png")',
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.6, zIndex: -3
      }} />

      {/* 2. MATRIX CANVAS */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        zIndex: -2, pointerEvents: 'none'
      }} />

      {/* 3. ROTATING TECH RINGS */}
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
      
      {/* LOGIN UI */}
      <div style={{ flex: 1.5 }}></div>
      
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', paddingBottom: '20px', zIndex: 10 }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 30px', 
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
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

          <p style={{ opacity: 0.7, marginBottom: '2rem', fontSize: '0.8rem', letterSpacing: '0.2rem' }}>
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

            {/* REMEMBER ME TOGGLE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', textAlign: 'left' }}>
              <input 
                type="checkbox" 
                id="rememberMe"
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)} 
              />
              <label htmlFor="rememberMe" style={{ cursor: 'pointer', opacity: 0.8 }}>
                Remember my login
              </label>
            </div>

            {/* TERMS & POLICIES */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', margin: '5px 0' }}>
              <div style={{ fontSize: "0.8rem" }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />{" "}
                I agree to{" "}
                <span onClick={() => navigate("/terms")} style={{ color: "#00d4ff", cursor: "pointer" }}>
                  Terms
                </span>{" "}
                and{" "}
                <span onClick={() => navigate("/privacy")} style={{ color: "#00d4ff", cursor: "pointer" }}>
                  Privacy Policy
                </span>{" "}
                and{" "}
                <span onClick={() => navigate("/refund-policy")} style={{ color: "#00d4ff", cursor: "pointer" }}>
                  Refund, Cancellation & Withdrawal Policy
                </span>{" "}
                and{" "}
                <span onClick={() => navigate("/cookiePolicy")} style={{ color: "#00d4ff", cursor: "pointer" }}>
                  Cookie Policy
                </span>{" "}
                and{" "}
                <span onClick={() => navigate("/communityGuidelines")} style={{ color: "#00d4ff", cursor: "pointer" }}>
                  Community Guidelines
                </span>{" "}
                and{" "}
                <span onClick={() => navigate("/aiTransparencyNotice")} style={{ color: "#00d4ff", cursor: "pointer" }}>
                  AI Transparency Notice
                </span>
              </div>
            </div>

            <button 
              type="submit"
              disabled={!agreed}
              style={{
                padding: '15px', borderRadius: '12px', border: '2px solid #ffffff', 
                backgroundColor: agreed ? '#0066ff' : '#333', 
                color: agreed ? '#fff' : '#888', 
                fontWeight: 'bold', 
                fontSize: '1rem', cursor: agreed ? 'pointer' : 'not-allowed', 
                marginTop: '5px',
                transition: '0.3s'
              }}
            >
              {isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          {/* TOGGLE SIGN-IN / SIGN-UP */}
          <p 
            onClick={() => setIsSignUp(!isSignUp)} 
            style={{ fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', opacity: 0.8, marginBottom: '8px' }}
          >
            {isSignUp ? "Already have an account? Sign In" : "New here? Create an account"}
          </p>

          {/* FORGOT PASSWORD BUTTON */}
          {!isSignUp && (
            <p 
              onClick={handleForgotPassword} 
              style={{ fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', color: '#00d4ff', opacity: 0.9, marginBottom: '10px' }}
            >
              Forgot Password?
            </p>
          )}

          <div style={{ margin: '5px 0', opacity: 0.3, fontSize: '0.8rem' }}>OR</div>

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

          {/* IMPRESSUM LINK */}
          <p style={{ marginTop: "15px", fontSize: "0.75rem", opacity: 0.7 }}>
            <span
              onClick={() => navigate("/impressum")}
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