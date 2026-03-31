import React, { useEffect } from "react";

interface WelcomeProps {
  onWakeClick: () => void;
  userEmail: string | null | undefined;
}

// AI Face Component extracted for the welcome screen
const WelcomeAIFace = () => (
  <div style={{
    width: '110px', height: '42px', backgroundColor: 'rgba(10, 10, 10, 0.9)',
    borderRadius: '21px', border: `1.5px solid #00d2ff`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', boxShadow: `0 0 5px rgba(0, 210, 255, 0.2)`,
  }}>
    <style>{`
      @keyframes blinkEye { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
    `}</style>
    <svg width="45" height="18" viewBox="0 0 60 20">
      <rect x="12" y="5" width="10" height="10" rx="1" fill="white" style={{ animation: 'blinkEye 4s infinite', transformOrigin: 'center' }} />
      <rect x="38" y="5" width="10" height="10" rx="1" fill="white" style={{ animation: 'blinkEye 4s infinite', transformOrigin: 'center' }} />
    </svg>
  </div>
);

function Welcomeview({ onWakeClick, userEmail }: WelcomeProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onWakeClick();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onWakeClick]);

  return (
    <div style={{
      width: '100%', height: '100%', position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#ffffff', zIndex: 1000
    }}>
      <WelcomeAIFace />
    </div>
  );
}

export default Welcomeview;