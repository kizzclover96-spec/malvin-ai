import React, { useState, useEffect } from "react";
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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  /*
   * ---------------------------------------------------------
   * USER SECURITY METADATA
   * ---------------------------------------------------------
   */

  const saveUserMetadata = async (userUid: string) => {
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const { ip } = await ipRes.json();

      const userAgent = navigator.userAgent;

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

  /*
   * ---------------------------------------------------------
   * PASSWORD RESET
   * ---------------------------------------------------------
   */

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email address first.");
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const requestReset = httpsCallable(
        functions,
        "requestAccountPasswordReset"
      );

      await requestReset({ email });

      alert("If an account exists for that email, a reset link has been sent.");
    } catch (error: any) {
      Sentry.captureException(error, {
        extra: { flow: "forgotPassword" },
      });

      alert(
        error?.code === "functions/resource-exhausted"
          ? "Too many attempts. Please wait a bit before trying again."
          : "Something went wrong sending the reset email. Please try again shortly."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * GOOGLE LOGIN
   * ---------------------------------------------------------
   */

  const handleGoogleLogin = async () => {
    if (!agreed || isSubmitting) return;

    setIsSubmitting(true);

    try {
      let userCredential;

      if (Capacitor.isNativePlatform()) {
        const googleUser = await GoogleAuth.signIn();

        const credential = GoogleAuthProvider.credential(
          googleUser.authentication.idToken
        );

        userCredential = await signInWithCredential(auth, credential);
      } else {
        const provider = new GoogleAuthProvider();

        provider.setCustomParameters({
          prompt: "select_account",
        });

        userCredential = await signInWithPopup(auth, provider);
      }

      if (userCredential.user) {
        await saveUserMetadata(userCredential.user.uid);
        await initializeUser(userCredential.user);
      }
    } catch (error: any) {
      Sentry.captureException(error, {
        extra: { flow: "googleLogin" },
      });

      alert("Login failed: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * EMAIL AUTH
   * ---------------------------------------------------------
   */

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreed || isSubmitting) return;

    setIsSubmitting(true);

    try {
      let userCredential;

      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
      } else {
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      }

      if (userCredential.user) {
        await saveUserMetadata(userCredential.user.uid);
        await initializeUser(userCredential.user);
      }
    } catch (error: any) {
      Sentry.captureException(error, {
        extra: {
          flow: isSignUp ? "signUp" : "signIn",
        },
      });

      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <div className="malvin-login-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .malvin-login-page {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;

          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "SF Pro Display",
            "SF Pro Text",
            "Inter",
            "Segoe UI",
            sans-serif;

          color: #0f172a;

          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(93, 163, 255, 0.25),
              transparent 35%
            ),
            radial-gradient(
              circle at 10% 90%,
              rgba(116, 177, 255, 0.18),
              transparent 32%
            ),
            radial-gradient(
              circle at 90% 60%,
              rgba(190, 220, 255, 0.24),
              transparent 35%
            ),
            #f6f9fd;

          display: flex;
          align-items: center;
          justify-content: center;

          isolation: isolate;
        }

        /* --------------------------------------------------
           BACKGROUND
        -------------------------------------------------- */

        .malvin-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: -5;
        }

        .malvin-background::before {
          content: "";
          position: absolute;
          inset: 0;

          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,0.55),
              rgba(255,255,255,0.18)
            );

          z-index: 3;
        }

        .ambient-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(70px);
          opacity: 0.65;
          will-change: transform;
        }

        .orb-one {
          width: 430px;
          height: 430px;

          top: -120px;
          left: -100px;

          background:
            radial-gradient(
              circle,
              rgba(83, 154, 255, 0.45),
              rgba(83, 154, 255, 0)
            );

          animation: floatOne 16s ease-in-out infinite alternate;
        }

        .orb-two {
          width: 520px;
          height: 520px;

          right: -170px;
          top: 20%;

          background:
            radial-gradient(
              circle,
              rgba(138, 190, 255, 0.38),
              rgba(138, 190, 255, 0)
            );

          animation: floatTwo 19s ease-in-out infinite alternate;
        }

        .orb-three {
          width: 420px;
          height: 420px;

          bottom: -180px;
          left: 35%;

          background:
            radial-gradient(
              circle,
              rgba(90, 165, 255, 0.27),
              rgba(90, 165, 255, 0)
            );

          animation: floatThree 21s ease-in-out infinite alternate;
        }

        .orb-four {
          width: 240px;
          height: 240px;

          top: 35%;
          left: 42%;

          background:
            radial-gradient(
              circle,
              rgba(255,255,255,0.85),
              rgba(255,255,255,0)
            );

          filter: blur(55px);

          animation: pulseOrb 8s ease-in-out infinite;
        }

        @keyframes floatOne {
          from {
            transform: translate3d(0, 0, 0) scale(1);
          }

          to {
            transform: translate3d(100px, 70px, 0) scale(1.15);
          }
        }

        @keyframes floatTwo {
          from {
            transform: translate3d(0, 0, 0) scale(1);
          }

          to {
            transform: translate3d(-100px, -70px, 0) scale(1.12);
          }
        }

        @keyframes floatThree {
          from {
            transform: translate3d(-40px, 0, 0) scale(1);
          }

          to {
            transform: translate3d(50px, -60px, 0) scale(1.18);
          }
        }

        @keyframes pulseOrb {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(0.9);
          }

          50% {
            opacity: 0.7;
            transform: scale(1.15);
          }
        }

        /* --------------------------------------------------
           SUBTLE GRID
        -------------------------------------------------- */

        .background-grid {
          position: absolute;
          inset: 0;

          opacity: 0.2;

          background-image:
            linear-gradient(
              rgba(59, 130, 246, 0.055) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(59, 130, 246, 0.055) 1px,
              transparent 1px
            );

          background-size: 70px 70px;

          mask-image:
            radial-gradient(
              ellipse at center,
              black 0%,
              transparent 75%
            );
        }

        /* --------------------------------------------------
           FLOATING PARTICLES
        -------------------------------------------------- */

        .particle {
          position: absolute;

          width: 5px;
          height: 5px;

          border-radius: 50%;

          background: rgba(255,255,255,0.9);

          box-shadow:
            0 0 15px rgba(83, 154, 255, 0.55);

          animation:
            particleFloat 7s ease-in-out infinite alternate,
            particleFade 4s ease-in-out infinite;
        }

        .particle:nth-child(1) {
          left: 14%;
          top: 28%;
          animation-delay: -1s;
        }

        .particle:nth-child(2) {
          left: 79%;
          top: 23%;
          width: 4px;
          height: 4px;
          animation-delay: -3s;
        }

        .particle:nth-child(3) {
          left: 24%;
          top: 74%;
          width: 3px;
          height: 3px;
          animation-delay: -5s;
        }

        .particle:nth-child(4) {
          left: 86%;
          top: 76%;
          width: 5px;
          height: 5px;
          animation-delay: -2s;
        }

        .particle:nth-child(5) {
          left: 68%;
          top: 12%;
          width: 3px;
          height: 3px;
          animation-delay: -4s;
        }

        @keyframes particleFloat {
          from {
            transform: translateY(0) translateX(0);
          }

          to {
            transform: translateY(-25px) translateX(15px);
          }
        }

        @keyframes particleFade {
          0%,
          100% {
            opacity: 0.25;
          }

          50% {
            opacity: 0.9;
          }
        }

        /* --------------------------------------------------
           TOP BRAND
        -------------------------------------------------- */

        .top-brand {
          position: absolute;
          top: 28px;
          left: 34px;

          display: flex;
          align-items: center;
          gap: 10px;

          color: rgba(15, 23, 42, 0.72);

          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.12em;

          z-index: 10;
        }

        .brand-dot {
          width: 9px;
          height: 9px;

          border-radius: 50%;

          background: linear-gradient(
            135deg,
            #5ca8ff,
            #1478ff
          );

          box-shadow:
            0 0 0 5px rgba(46, 132, 255, 0.08),
            0 0 18px rgba(46, 132, 255, 0.3);
        }

        /* --------------------------------------------------
           LOGIN CONTAINER
        -------------------------------------------------- */

        .login-wrapper {
          position: relative;

          width: min(100%, 500px);

          padding: 22px;

          z-index: 5;

          animation: cardEnter 0.8s cubic-bezier(.22,1,.36,1);
        }

        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: translateY(25px) scale(0.97);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* --------------------------------------------------
           GLASS CARD
        -------------------------------------------------- */

        .login-card {
          position: relative;

          width: 100%;

          padding: 42px 38px 32px;

          border-radius: 32px;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.78),
              rgba(255,255,255,0.53)
            );

          border: 1px solid rgba(255,255,255,0.88);

          box-shadow:
            0 40px 100px rgba(30, 70, 120, 0.13),
            0 10px 35px rgba(30, 70, 120, 0.08),
            inset 0 1px 0 rgba(255,255,255,0.95);

          backdrop-filter: blur(42px) saturate(150%);
          -webkit-backdrop-filter: blur(42px) saturate(150%);

          overflow: hidden;
        }

        .login-card::before {
          content: "";

          position: absolute;

          top: -140px;
          left: 50%;

          width: 420px;
          height: 240px;

          transform: translateX(-50%);

          background:
            radial-gradient(
              ellipse,
              rgba(100,170,255,0.19),
              transparent 70%
            );

          filter: blur(20px);

          pointer-events: none;
        }

        .login-card::after {
          content: "";

          position: absolute;
          inset: 0;

          border-radius: inherit;

          background:
            linear-gradient(
              120deg,
              rgba(255,255,255,0.35),
              transparent 35%,
              transparent 70%,
              rgba(255,255,255,0.2)
            );

          pointer-events: none;
        }

        /* --------------------------------------------------
           MALVIN LOGO
        -------------------------------------------------- */

        .logo-area {
          position: relative;

          display: flex;
          flex-direction: column;
          align-items: center;

          margin-bottom: 30px;

          z-index: 2;
        }

        .malvin-mark {
          position: relative;

          width: 62px;
          height: 62px;

          margin-bottom: 18px;

          border-radius: 20px;

          display: flex;
          align-items: center;
          justify-content: center;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.95),
              rgba(224,239,255,0.7)
            );

          border: 1px solid rgba(255,255,255,0.95);

          box-shadow:
            0 15px 35px rgba(50, 120, 220, 0.15),
            inset 0 1px 0 rgba(255,255,255,1);

          animation: markFloat 5s ease-in-out infinite;
        }

        .malvin-mark::before {
          content: "";

          position: absolute;
          inset: 8px;

          border-radius: 15px;

          background:
            radial-gradient(
              circle at 35% 30%,
              #ffffff,
              #b9dbff 55%,
              #4f9cff 100%
            );

          opacity: 0.95;

          box-shadow:
            0 0 25px rgba(65, 145, 255, 0.3);
        }

        .malvin-mark::after {
          content: "M";

          position: relative;

          color: white;

          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.08em;

          text-shadow:
            0 2px 10px rgba(20, 90, 180, 0.35);
        }

        @keyframes markFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-4px);
          }
        }

        .logo-title {
          margin: 0;

          font-size: 30px;
          line-height: 1;

          letter-spacing: -0.055em;

          font-weight: 750;

          color: #111827;
        }

        .logo-subtitle {
          margin: 10px 0 0;

          font-size: 13px;

          color: rgba(30, 41, 59, 0.58);

          letter-spacing: 0.01em;

          text-align: center;
        }

        /* --------------------------------------------------
           FORM
        -------------------------------------------------- */

        .auth-form {
          position: relative;

          display: flex;
          flex-direction: column;

          gap: 13px;

          z-index: 2;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;

          left: 17px;
          top: 50%;

          transform: translateY(-50%);

          width: 18px;
          height: 18px;

          color: rgba(30, 64, 100, 0.38);

          pointer-events: none;

          transition: 0.25s ease;
        }

        .auth-input {
          width: 100%;

          height: 56px;

          padding: 0 17px 0 48px;

          border-radius: 17px;

          border: 1px solid rgba(148, 163, 184, 0.23);

          outline: none;

          background:
            rgba(255,255,255,0.58);

          color: #0f172a;

          font-family: inherit;

          font-size: 15px;

          box-shadow:
            inset 0 1px 2px rgba(15, 23, 42, 0.025),
            0 1px 0 rgba(255,255,255,0.7);

          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);

          transition:
            border-color 0.25s ease,
            box-shadow 0.25s ease,
            background 0.25s ease,
            transform 0.25s ease;
        }

        .auth-input::placeholder {
          color: rgba(51, 65, 85, 0.43);
        }

        .auth-input:hover {
          background: rgba(255,255,255,0.72);
          border-color: rgba(96, 165, 250, 0.25);
        }

        .auth-input:focus {
          background: rgba(255,255,255,0.88);

          border-color: rgba(59, 130, 246, 0.42);

          box-shadow:
            0 0 0 4px rgba(59, 130, 246, 0.08),
            0 8px 25px rgba(59, 130, 246, 0.06);
        }

        .auth-input:focus + .input-icon {
          color: #3988ed;
        }

        /* --------------------------------------------------
           OPTIONS
        -------------------------------------------------- */

        .options-row {
          display: flex;

          align-items: center;
          justify-content: space-between;

          margin-top: 3px;
          padding: 0 3px;
        }

        .remember-label {
          display: flex;
          align-items: center;
          gap: 9px;

          color: rgba(30, 41, 59, 0.62);

          font-size: 12px;

          cursor: pointer;

          user-select: none;
        }

        .remember-checkbox,
        .terms-checkbox {
          appearance: none;
          -webkit-appearance: none;

          width: 17px;
          height: 17px;

          margin: 0;

          border-radius: 6px;

          border: 1px solid rgba(100, 116, 139, 0.25);

          background: rgba(255,255,255,0.55);

          cursor: pointer;

          display: grid;
          place-items: center;

          transition: 0.2s ease;
        }

        .remember-checkbox:checked,
        .terms-checkbox:checked {
          border-color: #4c98f7;

          background: linear-gradient(
            145deg,
            #64adff,
            #287fe7
          );

          box-shadow:
            0 3px 10px rgba(45, 130, 240, 0.22);
        }

        .remember-checkbox:checked::after,
        .terms-checkbox:checked::after {
          content: "";

          width: 7px;
          height: 4px;

          border-left: 1.8px solid white;
          border-bottom: 1.8px solid white;

          transform: rotate(-45deg) translateY(-1px);
        }

        .forgot-password {
          border: none;
          background: none;

          padding: 0;

          color: #438de7;

          font-family: inherit;

          font-size: 12px;

          cursor: pointer;

          transition: 0.2s ease;
        }

        .forgot-password:hover {
          color: #176fd1;
        }

        /* --------------------------------------------------
           TERMS
        -------------------------------------------------- */

        .terms-row {
          display: flex;
          align-items: flex-start;

          gap: 10px;

          margin-top: 2px;
          padding: 3px;
        }

        .terms-checkbox {
          flex-shrink: 0;

          margin-top: 1px;
        }

        .terms-text {
          color: rgba(30, 41, 59, 0.52);

          font-size: 11px;

          line-height: 1.55;
        }

        .terms-link {
          color: #347fdb;

          cursor: pointer;

          transition: color 0.2s ease;
        }

        .terms-link:hover {
          color: #145fb5;
        }

        /* --------------------------------------------------
           PRIMARY BUTTON
        -------------------------------------------------- */

        .primary-button {
          position: relative;

          width: 100%;
          height: 56px;

          margin-top: 5px;

          border: 0;

          border-radius: 17px;

          overflow: hidden;

          background:
            linear-gradient(
              135deg,
              #65adff 0%,
              #398de9 48%,
              #2876d4 100%
            );

          color: white;

          font-family: inherit;

          font-size: 15px;
          font-weight: 650;

          letter-spacing: -0.01em;

          cursor: pointer;

          box-shadow:
            0 12px 28px rgba(45, 128, 226, 0.24),
            inset 0 1px 0 rgba(255,255,255,0.28);

          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            opacity 0.2s ease;
        }

        .primary-button::before {
          content: "";

          position: absolute;

          inset: 0;

          background:
            linear-gradient(
              120deg,
              rgba(255,255,255,0.25),
              transparent 40%
            );

          opacity: 0;

          transition: opacity 0.25s ease;
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-1px);

          box-shadow:
            0 16px 35px rgba(45, 128, 226, 0.28),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .primary-button:hover:not(:disabled)::before {
          opacity: 1;
        }

        .primary-button:active:not(:disabled) {
          transform: scale(0.985);
        }

        .primary-button:disabled {
          cursor: not-allowed;

          opacity: 0.42;

          box-shadow: none;
        }

        /* --------------------------------------------------
           DIVIDER
        -------------------------------------------------- */

        .divider {
          display: flex;

          align-items: center;

          gap: 14px;

          margin: 20px 0 15px;

          color: rgba(51, 65, 85, 0.35);

          font-size: 10px;

          font-weight: 600;

          letter-spacing: 0.12em;
        }

        .divider-line {
          flex: 1;

          height: 1px;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(100,116,139,0.16),
              transparent
            );
        }

        /* --------------------------------------------------
           GOOGLE BUTTON
        -------------------------------------------------- */

        .google-button {
          width: 100%;
          height: 54px;

          border-radius: 17px;

          border: 1px solid rgba(148,163,184,0.22);

          background:
            rgba(255,255,255,0.52);

          color: #1e293b;

          font-family: inherit;

          font-size: 14px;
          font-weight: 600;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 11px;

          cursor: pointer;

          box-shadow:
            0 4px 15px rgba(30, 64, 100, 0.035),
            inset 0 1px 0 rgba(255,255,255,0.7);

          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);

          transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .google-button:hover:not(:disabled) {
          transform: translateY(-1px);

          background: rgba(255,255,255,0.78);

          border-color: rgba(96,165,250,0.25);

          box-shadow:
            0 8px 22px rgba(30,64,100,0.07);
        }

        .google-button:active:not(:disabled) {
          transform: scale(0.985);
        }

        .google-button:disabled {
          cursor: not-allowed;

          opacity: 0.42;
        }

        .google-icon {
          width: 18px;
          height: 18px;
        }

        /* --------------------------------------------------
           SWITCH AUTH
        -------------------------------------------------- */

        .switch-auth {
          margin: 20px 0 0;

          text-align: center;

          color: rgba(30,41,59,0.52);

          font-size: 12px;
        }

        .switch-auth button {
          border: none;
          background: none;

          padding: 0;
          margin-left: 4px;

          color: #347fdb;

          font-family: inherit;

          font-size: inherit;
          font-weight: 650;

          cursor: pointer;

          transition: color 0.2s ease;
        }

        .switch-auth button:hover {
          color: #145fb5;
        }

        /* --------------------------------------------------
           IMPRESSUM
        -------------------------------------------------- */

        .impressum {
          margin: 18px 0 0;

          text-align: center;

          font-size: 10px;

          color: rgba(30,41,59,0.36);
        }

        .impressum span {
          cursor: pointer;

          transition: color 0.2s ease;
        }

        .impressum span:hover {
          color: rgba(30,41,59,0.7);
        }

        /* --------------------------------------------------
           FOOTER
        -------------------------------------------------- */

        .bottom-footer {
          position: absolute;

          bottom: 20px;

          left: 0;
          right: 0;

          text-align: center;

          color: rgba(30,41,59,0.3);

          font-size: 9px;

          letter-spacing: 0.17em;

          text-transform: uppercase;

          pointer-events: none;
        }

        /* --------------------------------------------------
           MOBILE
        -------------------------------------------------- */

        @media (max-width: 600px) {
          .top-brand {
            top: 18px;
            left: 20px;

            font-size: 11px;
          }

          .login-wrapper {
            width: 100%;

            padding: 14px;
          }

          .login-card {
            padding: 34px 22px 26px;

            border-radius: 27px;

            max-height: calc(100vh - 65px);

            overflow-y: auto;
          }

          .logo-area {
            margin-bottom: 24px;
          }

          .malvin-mark {
            width: 54px;
            height: 54px;

            border-radius: 17px;
          }

          .logo-title {
            font-size: 27px;
          }

          .logo-subtitle {
            font-size: 12px;
          }

          .auth-input {
            height: 54px;
          }

          .primary-button,
          .google-button {
            height: 54px;
          }

          .bottom-footer {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* --------------------------------------------------
          BACKGROUND
      -------------------------------------------------- */}

      <div className="malvin-background">
        <div className="background-grid" />

        <div className="ambient-orb orb-one" />
        <div className="ambient-orb orb-two" />
        <div className="ambient-orb orb-three" />
        <div className="ambient-orb orb-four" />

        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
      </div>

      {/* --------------------------------------------------
          TOP BRAND
      -------------------------------------------------- */}

      <div className="top-brand">
        <span className="brand-dot" />
        MALVIN AI
      </div>

      {/* --------------------------------------------------
          LOGIN
      -------------------------------------------------- */}

      <main className="login-wrapper">
        <section className="login-card">

          {/* LOGO */}

          <div className="logo-area">
            <div className="malvin-mark" />

            <h1 className="logo-title">
              {isSignUp ? "Join Malvin" : "Welcome back"}
            </h1>

            <p className="logo-subtitle">
              {isSignUp
                ? "Create your Malvin account and enter your world."
                : "Your business. Your world. Connected."}
            </p>
          </div>

          {/* FORM */}

          <form
            onSubmit={handleAuth}
            className="auth-form"
          >

            {/* EMAIL */}

            <div className="input-wrapper">
              <input
                className="auth-input"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <svg
                className="input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="3"
                />

                <path d="M3 7l9 6 9-6" />
              </svg>
            </div>

            {/* PASSWORD */}

            <div className="input-wrapper">
              <input
                className="auth-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={
                  isSignUp ? "new-password" : "current-password"
                }
              />

              <svg
                className="input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect
                  x="4"
                  y="10"
                  width="16"
                  height="10"
                  rx="3"
                />

                <path d="M8 10V7a4 4 0 018 0v3" />
              </svg>
            </div>

            {/* OPTIONS */}

            {!isSignUp && (
              <div className="options-row">
                <label className="remember-label">
                  <input
                    className="remember-checkbox"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) =>
                      setRememberMe(e.target.checked)
                    }
                  />

                  Remember me
                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={
                    isSubmitting
                      ? undefined
                      : handleForgotPassword
                  }
                  disabled={isSubmitting}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* TERMS */}

            <div className="terms-row">
              <input
                className="terms-checkbox"
                type="checkbox"
                checked={agreed}
                onChange={(e) =>
                  setAgreed(e.target.checked)
                }
              />

              <div className="terms-text">
                I agree to{" "}
                <span
                  className="terms-link"
                  onClick={() => navigate("/terms")}
                >
                  Terms
                </span>
                ,{" "}
                <span
                  className="terms-link"
                  onClick={() => navigate("/privacy")}
                >
                  Privacy Policy
                </span>
                ,{" "}
                <span
                  className="terms-link"
                  onClick={() =>
                    navigate("/refund-policy")
                  }
                >
                  Refund, Cancellation & Withdrawal Policy
                </span>
                ,{" "}
                <span
                  className="terms-link"
                  onClick={() =>
                    navigate("/cookiePolicy")
                  }
                >
                  Cookie Policy
                </span>
                ,{" "}
                <span
                  className="terms-link"
                  onClick={() =>
                    navigate("/communityGuidelines")
                  }
                >
                  Community Guidelines
                </span>
                {" and "}
                <span
                  className="terms-link"
                  onClick={() =>
                    navigate("/aiTransparencyNotice")
                  }
                >
                  AI Transparency Notice
                </span>
                .
              </div>
            </div>

            {/* PRIMARY ACTION */}

            <button
              type="submit"
              className="primary-button"
              disabled={!agreed || isSubmitting}
            >
              {isSubmitting
                ? "Please wait…"
                : isSignUp
                ? "Create account"
                : "Sign in"}
            </button>
          </form>

          {/* DIVIDER */}

          <div className="divider">
            <span className="divider-line" />
            OR
            <span className="divider-line" />
          </div>

          {/* GOOGLE */}

          <button
            type="button"
            className="google-button"
            disabled={!agreed || isSubmitting}
            onClick={handleGoogleLogin}
          >
            <img
              className="google-icon"
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
            />

            Continue with Google
          </button>

          {/* SWITCH */}

          <p className="switch-auth">
            {isSignUp
              ? "Already have an account?"
              : "New to Malvin?"}

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp
                ? "Sign in"
                : "Create an account"}
            </button>
          </p>

          {/* IMPRESSUM */}

          <p className="impressum">
            <span
              onClick={() => navigate("/impressum")}
            >
              Impressum
            </span>
          </p>
        </section>
      </main>

      {/* --------------------------------------------------
          FOOTER
      -------------------------------------------------- */}

      <div className="bottom-footer">
        MALVIN AI • 2026
      </div>
    </div>
  );
}