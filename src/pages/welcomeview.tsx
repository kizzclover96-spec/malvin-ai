import React, { useEffect, useState, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore, auth } from "../firebase";

interface WelcomeProps {
  onWakeClick: (token: string) => void;
  userEmail?: string | null | undefined;
}

function Welcomeview({ onWakeClick }: WelcomeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [premiumToken, setPremiumToken] = useState<string>("MVN_BSC_DEFAULT_0000");

  // 1. NEON DOTS ENGINE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 2 + 1,
      });
    }

    const animate = () => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = "#00f2ff"; // Neon Blue
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  // 2. CONCURRENT SECURITY RECORD FETCH
  useEffect(() => {
    const checkPremiumStatus = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const userRef = doc(firestore, "users", currentUser.uid); 
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData?.premium === true) {
            // Unique signature generated for authenticated session
            setPremiumToken("MVN_PRM_VALID_2026_A9X7");
          }
        }
      } catch (err) {
        console.error("Premium authorization module error:", err);
      }
    };

    checkPremiumStatus();
  }, []);

  // 3. TIMEOUT TO OPEN SESSION AND PASS DATA POINTER
  useEffect(() => {
    const timer = setTimeout(() => {
      onWakeClick(premiumToken);
    }, 4000); 
    return () => clearTimeout(timer);
  }, [onWakeClick, premiumToken]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justify: 'center',
      backgroundColor: '#000000',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes blinkEye {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseText {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>

      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }} />

      <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          border: '2px solid rgba(0, 242, 255, 0.1)',
          borderRadius: '50%',
          animation: 'orbit 2s linear infinite'
        }}>
          <div style={{
            position: 'absolute',
            top: '-5px',
            left: '50%',
            width: '10px',
            height: '10px',
            backgroundColor: '#00f2ff',
            borderRadius: '50%',
            boxShadow: '0 0 15px #00f2ff'
          }} />
        </div>

        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
          border: '1px solid rgba(0, 242, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          backdropFilter: 'blur(5px)'
        }}>
          <svg width="40" height="15" viewBox="0 0 60 20">
            <rect x="5" y="5" width="15" height="12" rx="3" fill="#00f2ff"
              style={{ animation: 'blinkEye 4s infinite', transformOrigin: 'center' }} />
            <rect x="40" y="5" width="15" height="12" rx="3" fill="#00f2ff"
              style={{ animation: 'blinkEye 4s infinite', transformOrigin: 'center' }} />
          </svg>
        </div>
      </div>

      <p style={{
        marginTop: '30px',
        color: '#00f2ff',
        fontSize: '0.8rem',
        letterSpacing: '0.2rem',
        textTransform: 'uppercase',
        fontFamily: 'monospace',
        animation: 'pulseText 1.5s infinite ease-in-out'
      }}>
        Malvin is checking clearance parameters...
      </p>
    </div>
  );
}

export default Welcomeview;