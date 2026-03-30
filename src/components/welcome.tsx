import React, { useEffect } from "react";

interface WelcomeProps {
  onFinish: () => void;
  userEmail?: string | null;
}

function Welcomeview({ onFinish, userEmail }: WelcomeProps) {

  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 6000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div style={containerStyle}>
      
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes fadeSlide {
          0% { opacity: 0; transform: translateY(20px) scale(0.95); }
          50% { opacity: 1; transform: translateY(0px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0px) scale(1); }
        }

        @keyframes glow {
          0% { text-shadow: 0 0 10px rgba(0,150,255,0.3), 0 0 20px rgba(255,120,0,0.2); }
          50% { text-shadow: 0 0 30px rgba(0,150,255,0.8), 0 0 60px rgba(255,120,0,0.6); }
          100% { text-shadow: 0 0 10px rgba(0,150,255,0.3), 0 0 20px rgba(255,120,0,0.2); }
        }
      `}</style>

      {/* Glass Layer */}
      <div style={glassStyle} />

      {/* Center Content */}
      <div style={contentStyle}>
        <h1 style={titleStyle}>Malvin</h1>
        <p style={subTextStyle}>
          Initializing Intelligence...
        </p>
      </div>

      {/* User badge (optional small detail) */}
      <div style={userBadgeStyle}>
        <span style={{ color: '#00ff88', fontSize: '10px' }}>●</span>
        <span style={userTextStyle}>
          {userEmail?.toLowerCase() || "offline"}
        </span>
      </div>

    </div>
  );
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100vh',
  position: 'fixed',
  top: 0,
  left: 0,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: '"Inter", sans-serif',

  background: 'linear-gradient(-45deg, #001f4d, #003366, #ff6a00, #ff3c00)',
  backgroundSize: '400% 400%',
  animation: 'gradientMove 12s ease infinite',
};

const glassStyle: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  background: 'rgba(255,255,255,0.05)',
};

const contentStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 2,
  textAlign: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: '64px',
  fontWeight: 200,
  color: 'white',
  letterSpacing: '6px',
  animation: 'fadeSlide 2s ease forwards, glow 4s ease-in-out infinite',
};

const subTextStyle: React.CSSProperties = {
  marginTop: '10px',
  fontSize: '14px',
  color: 'rgba(255,255,255,0.6)',
  letterSpacing: '2px',
};

const userBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: '6px',
  alignItems: 'center',
  fontSize: '10px',
  color: 'rgba(255,255,255,0.5)',
};

const userTextStyle: React.CSSProperties = {
  fontFamily: 'monospace',
};

export default Welcomeview;