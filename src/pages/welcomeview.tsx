import React, { useEffect, useState, useRef } from "react";

interface WelcomeProps {
  onWakeClick: () => void;
  userEmail?: string | null | undefined;
}

function Welcomeview({ onWakeClick }: WelcomeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // 2. TIMEOUT TO OPEN SESSION
  useEffect(() => {
    const timer = setTimeout(() => {
      onWakeClick();
    }, 4000); // Set to 4 seconds to match the orbit animation
    return () => clearTimeout(timer);
  }, [onWakeClick]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
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

      {/* BACKGROUND CANVAS (Dots) */}
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }} />

      {/* CENTER UNIT */}
      <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* THE ORBITING LINE & DOT */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          border: '2px solid rgba(0, 242, 255, 0.1)',
          borderRadius: '50%',
          animation: 'orbit 2s linear infinite'
        }}>
          {/* The small neon dot on the line */}
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

        {/* INNER CIRCLE WITH EYES */}
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
          border: '1px solid rgba(0, 242, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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

      {/* LOADING TEXT */}
      <p style={{
        marginTop: '30px',
        color: '#00f2ff',
        fontSize: '0.8rem',
        letterSpacing: '0.2rem',
        textTransform: 'uppercase',
        fontFamily: 'monospace',
        animation: 'pulseText 1.5s infinite ease-in-out'
      }}>
        Malvin is on its way...
      </p>
    </div>
  );
}

export default Welcomeview;