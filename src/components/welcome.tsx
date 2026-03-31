import React, { useEffect } from "react";

interface WelcomeProps {
  onWakeClick: () => void;
  userEmail: string | null | undefined;
}

function Welcomeview({ onWakeClick }: WelcomeProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onWakeClick();
    }, 1500); // slightly faster + smoother
    return () => clearTimeout(timer);
  }, [onWakeClick]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      zIndex: 1000
    }}>
      <style>{`
        @keyframes blinkEye {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
      `}</style>

      {/* ONLY EYES */}
      <svg width="60" height="20" viewBox="0 0 60 20">
        <rect x="10" y="5" width="12" height="10" rx="2" fill="black"
          style={{ animation: 'blinkEye 4s infinite', transformOrigin: 'center' }} />
        <rect x="38" y="5" width="12" height="10" rx="2" fill="black"
          style={{ animation: 'blinkEye 4s infinite', transformOrigin: 'center' }} />
      </svg>
    </div>
  );
}

export default Welcomeview;