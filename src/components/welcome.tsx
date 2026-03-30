import React, { useEffect } from "react";

interface WelcomeProps {
  onWakeClick: () => void;
  isConnecting: boolean;
  userEmail: string | null | undefined;
}

function Welcomeview({ onWakeClick, isConnecting, userEmail }: WelcomeProps) {
  
  useEffect(() => {
    // Only auto-trigger if we aren't already in the process
    const timer = setTimeout(() => {
      if (!isConnecting && userEmail) {
        onWakeClick();
      }
    }, 1500); 
    return () => clearTimeout(timer);
  }, [onWakeClick, isConnecting, userEmail]);

  return (
    <div className="welcome" style={welcomeContainerStyle}>
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.8; transform: scale(1); filter: blur(0px); }
          50% { opacity: 1; transform: scale(1.02); filter: blur(1px); }
        }
        .glass-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          z-index: 1;
        }
        .malvin-text {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 80px;
          font-weight: 700;
          letter-spacing: -3px;
          color: white;
          z-index: 2;
          animation: breathe 4s ease-in-out infinite;
          text-shadow: 0 0 20px rgba(255,255,255,0.1);
        }
      `}</style>

      <div style={backgroundLayerStyle} />
      <div className="glass-overlay" />

      <div style={userBadgeStyle}>
        <div style={{ 
          width: '6px', height: '6px', borderRadius: '50%', 
          backgroundColor: userEmail ? '#32d74b' : '#ff453a',
          boxShadow: userEmail ? '0 0 8px #32d74b' : 'none'
        }} />
        <span style={userEmailTextStyle}>
          {userEmail ? userEmail.toLowerCase() : "Offline"}
        </span>
      </div>

      <h1 className="malvin-text">malvin</h1>

      <div style={{ position: 'absolute', bottom: '100px', zIndex: 2 }}>
        <p style={{ 
          color: 'rgba(255,255,255,0.4)', fontSize: '12px', 
          letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '500'
        }}>
          {isConnecting ? "Initializing..." : "Ready"}
        </p>
      </div>

      <div style={supportLinkStyle}>
        <a href="mailto:malvinsupportteam@gmail.com" style={{ color: "rgba(255,255,255,0.2)", textDecoration: "none", fontSize: '10px' }}>
          malvinsupportteam@gmail.com
        </a>
      </div>
    </div>
  );
}

const welcomeContainerStyle: React.CSSProperties = {
  width: '100%', height: '100%', position: 'fixed', top: 0, left: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  overflow: 'hidden', backgroundColor: '#000'
};

const backgroundLayerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(-45deg, #000000, #0a0a0a, #1a1a1a, #001a33)',
  backgroundSize: '400% 400%',
  animation: 'gradientMove 10s ease infinite',
  zIndex: 0
};

const userBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '40px', 
  left: '40px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  zIndex: 100,
  padding: '6px 12px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '20px',
  border: '1px solid rgba(255, 255, 255, 0.1)'
};

const userEmailTextStyle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.5)',
  fontSize: '10px',
  fontWeight: '500',
  fontFamily: 'monospace'
};

const supportLinkStyle: React.CSSProperties = {
  position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
  zIndex: 2
};

export default Welcomeview;