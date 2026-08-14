import React, { useState } from "react";
import { auth, functions } from "../../firebase";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import * as Sentry from "@sentry/react";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { ref, update, serverTimestamp } from "firebase/database";
import { db } from "../../firebase";
import { initializeUser } from "../../services/initializeUser";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const ACCENT = "#4F9CF9"; // same blue used across B-Vin

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  // Client-side only — this doesn't stop a scripted attacker (they don't
  // click buttons), it just stops a real user's browser from firing five
  // signups on one double-click. The actual abuse protection is the
  // beforeUserCreated/beforeUserSignedIn blocking functions and the
  // requestAccountPasswordReset rate limit on the server.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

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
  // Calls our own rate-limited Cloud Function instead of Firebase's
  // sendPasswordResetEmail() directly — that client SDK call goes straight
  // to Google's Auth REST API and can't be throttled by our backend at all.
  // See requestAccountPasswordReset in malvinbackend/src/index.ts.
  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email address first.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const requestReset = httpsCallable(functions, "requestAccountPasswordReset");
      await requestReset({ email });
      alert("If an account exists for that email, a reset link has been sent.");
    } catch (error: any) {
      Sentry.captureException(error, { extra: { flow: "forgotPassword" } });
      alert(
        error?.code === "functions/resource-exhausted"
          ? "Too many attempts. Please wait a bit before trying again."
          : "Something went wrong sending the reset email. Please try again shortly."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // GOOGLE LOGIN
  const handleGoogleLogin = async () => {
    if (!agreed || isSubmitting) return;
    setIsSubmitting(true);
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
      Sentry.captureException(error, { extra: { flow: "googleLogin" } });
      alert("Login failed: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // EMAIL AUTH
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || isSubmitting) return;
    setIsSubmitting(true);

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
      // Rate-limit rejections from the beforeUserCreated/beforeUserSignedIn
      // blocking functions surface here as a normal auth error — Firebase
      // wraps them, so we just show the message it gives us.
      Sentry.captureException(error, { extra: { flow: isSignUp ? "signUp" : "signIn" } });
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: '#ffffff',
      display: 'flex', flexDirection: 'column',
      zIndex: 9999, fontFamily: 'Inter, sans-serif', color: '#0f1115',
      overflow: 'hidden'
    }}>

      <style>{`
        @keyframes driftA {
          0%   { transform: translate(-8%, -6%) scale(1); }
          50%  { transform: translate(6%, 8%) scale(1.15); }
          100% { transform: translate(-8%, -6%) scale(1); }
        }
        @keyframes driftB {
          0%   { transform: translate(6%, 4%) scale(1); }
          50%  { transform: translate(-8%, -8%) scale(1.1); }
          100% { transform: translate(6%, 4%) scale(1); }
        }
        @keyframes driftC {
          0%   { transform: translate(0%, 8%) scale(1); }
          50%  { transform: translate(4%, -6%) scale(1.08); }
          100% { transform: translate(0%, 8%) scale(1); }
        }
        .bvin-login-input::placeholder { color: rgba(15,17,21,0.35); }
      `}</style>

      {/* Soft light-blue blobs drifting slowly across the white background */}
      <div style={{ position: 'absolute', top: '10%', left: '8%', width: 420, height: 420, borderRadius: '50%', background: `${ACCENT}22`, filter: 'blur(90px)', animation: 'driftA 16s ease-in-out infinite', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '5%', right: '6%', width: 380, height: 380, borderRadius: '50%', background: `${ACCENT}1c`, filter: 'blur(90px)', animation: 'driftB 20s ease-in-out infinite', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '45%', right: '20%', width: 260, height: 260, borderRadius: '50%', background: `${ACCENT}18`, filter: 'blur(80px)', animation: 'driftC 24s ease-in-out infinite', zIndex: 0 }} />

      {/* LOGIN UI */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 10 }}>
        <div style={{
          textAlign: 'center',
          padding: '44px 34px',
          backgroundColor: 'rgba(255, 255, 255, 0.55)',
          width: '100%', maxWidth: '440px',
          borderRadius: '32px',
          backdropFilter: 'blur(34px) saturate(180%)',
          WebkitBackdropFilter: 'blur(34px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          boxShadow: `0 30px 70px rgba(79,156,249,0.18), inset 0 1px 1px rgba(255,255,255,0.9)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 10px 0', color: '#0f1115' }}>
            {isSignUp ? "Sign up" : "Log in"}
          </h1>

          <p style={{ opacity: 0.6, marginBottom: '28px', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 320 }}>
            Please make sure to read and agree to our Terms and Conditions before continuing — you'll need to accept them below to sign in.
          </p>

          <form onSubmit={handleAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '6px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} color="rgba(15,17,21,0.4)" style={{ position: 'absolute', left: 18 }} />
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bvin-login-input"
                style={{
                  width: '100%', padding: '15px 16px 15px 46px', borderRadius: '999px', border: '1px solid rgba(15,17,21,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.6)', color: '#0f1115', outline: 'none', fontSize: '0.9rem'
                }}
              />
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} color="rgba(15,17,21,0.4)" style={{ position: 'absolute', left: 18 }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bvin-login-input"
                style={{
                  width: '100%', padding: '15px 46px 15px 46px', borderRadius: '999px', border: '1px solid rgba(15,17,21,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.6)', color: '#0f1115', outline: 'none', fontSize: '0.9rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: 'absolute', right: 16, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: ACCENT }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Remember me + Terms agreement — side by side */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '2px 6px', fontSize: '0.78rem', textAlign: 'left' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', opacity: 0.75, whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: ACCENT, width: 14, height: 14 }}
                />
                Remind me
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ accentColor: ACCENT, width: 14, height: 14, flexShrink: 0 }}
                />
                <span style={{ opacity: 0.8 }}>
                  I agree to{" "}
                  <span onClick={() => navigate("/terms")} style={{ color: ACCENT, cursor: "pointer", fontWeight: 700 }}>
                    Terms & Conditions
                  </span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!agreed || isSubmitting}
              style={{
                padding: '16px', borderRadius: '999px', border: 'none',
                backgroundColor: agreed ? ACCENT : 'rgba(15,17,21,0.12)',
                color: agreed ? '#fff' : 'rgba(15,17,21,0.35)',
                fontWeight: 800,
                fontSize: '1rem', cursor: agreed && !isSubmitting ? 'pointer' : 'not-allowed',
                marginTop: '6px',
                boxShadow: agreed ? `0 14px 30px ${ACCENT}44` : 'none',
                transition: '0.25s'
              }}
            >
              {isSubmitting ? "Please wait…" : isSignUp ? "Create Account" : "Log in"}
            </button>
          </form>

          {/* TOGGLE SIGN-IN / SIGN-UP */}
          <p
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ fontSize: '0.82rem', cursor: 'pointer', opacity: 0.7, marginTop: '16px', marginBottom: '4px' }}
          >
            {isSignUp ? "Already have an account? " : "Didn't have an account? "}
            <span style={{ color: ACCENT, fontWeight: 700, textDecoration: 'underline' }}>
              {isSignUp ? "Log in" : "Sign up"}
            </span>
          </p>

          {/* FORGOT PASSWORD */}
          {!isSignUp && (
            <p
              onClick={isSubmitting ? undefined : handleForgotPassword}
              style={{ fontSize: '0.78rem', cursor: isSubmitting ? 'default' : 'pointer', color: ACCENT, opacity: isSubmitting ? 0.4 : 0.85, marginBottom: '10px' }}
            >
              Forgot Password?
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', margin: '14px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(15,17,21,0.1)' }} />
            <span style={{ fontSize: '0.72rem', opacity: 0.4, fontWeight: 700, letterSpacing: 1 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(15,17,21,0.1)' }} />
          </div>

          <button
            type="button"
            disabled={!agreed || isSubmitting}
            onClick={handleGoogleLogin}
            style={{
              width: '100%', padding: '15px 0', borderRadius: '999px', border: '1px solid rgba(15,17,21,0.1)',
              backgroundColor: agreed ? 'rgba(255,255,255,0.8)' : 'rgba(15,17,21,0.04)',
              color: agreed ? '#0f1115' : 'rgba(15,17,21,0.35)',
              fontSize: '0.92rem', fontWeight: 700,
              cursor: agreed ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: '0.25s'
            }}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google Logo"
              style={{ width: '18px', height: '18px', opacity: agreed ? 1 : 0.3 }}
            />
            Continue with Google
          </button>

          {/* IMPRESSUM LINK */}
          <p style={{ marginTop: "18px", fontSize: "0.72rem", opacity: 0.45 }}>
            <span
              onClick={() => navigate("/impressum")}
              style={{ cursor: "pointer", textDecoration: "underline" }}
            >
              Impressum
            </span>
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '24px', zIndex: 10 }}>
        <p style={{ opacity: 0.3, letterSpacing: '0.25rem', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700 }}>
          MALVIN AI • 2026
        </p>
      </div>
    </div>
  );
}