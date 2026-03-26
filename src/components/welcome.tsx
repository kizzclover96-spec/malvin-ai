import React from "react";

interface WelcomeProps {
  onWakeClick: () => void;
  isConnecting: boolean;
  userEmail: string | null | undefined;
}

function Welcomeview({ onWakeClick, isConnecting, userEmail }: WelcomeProps) {
  return (
    <div className="welcome" style={welcomeContainerStyle}>
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 15px rgba(0, 112, 243, 0.2); }
          50% { box-shadow: 0 0 30px rgba(0, 112, 243, 0.6); }
          100% { box-shadow: 0 0 15px rgba(0, 112, 243, 0.2); }
        }
        .ai-picture-container img { transition: transform 0.5s ease; }
        .ai-picture-container img:hover { transform: scale(1.03); }
      `}</style>

      {/* 2. Minimized User Identity Badge */}
      <div style={userBadgeStyle}>
        <div style={{ 
          width: '6px', // Smaller dot
          height: '6px', 
          borderRadius: '50%', 
          backgroundColor: userEmail ? '#32d74b' : '#ff453a',
          boxShadow: userEmail ? '0 0 8px #32d74b' : 'none'
        }} />
        <span style={userEmailTextStyle}>
          {userEmail ? userEmail.toLowerCase() : "Offline"}
        </span>
      </div>

      <div className="ai-picture-container" style={{ textAlign: 'center', zIndex: 1 }}>
        <img 
          src="/Malvin self.png" 
          alt="Assistant" 
          style={{ 
            height: "250px", 
            width: "250px", 
            borderRadius: "50%", 
            objectFit: "cover",
            border: "2px solid rgba(255,255,255,0.1)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}
        /> 
        
        <div className="welcome-overlay" style={{ marginTop: '20px' }}>
          <p style={{ color: 'white', fontSize: '1.2rem', fontWeight: '300', opacity: 0.9 }}>
            Ask Malvin anything!
          </p>
        </div>

        <button 
          style={{ 
            height: "45px", 
            width: "160px", 
            borderRadius: "22px", 
            backgroundColor: isConnecting ? "#333" : "#0070f3", 
            color: "white",
            border: "none",
            cursor: isConnecting ? "not-allowed" : "pointer",
            marginTop: "25px",
            fontWeight: "bold",
            fontSize: "15px",
            transition: "all 0.3s ease",
            animation: isConnecting ? "none" : "pulseGlow 3s infinite ease-in-out",
            letterSpacing: "0.5px"
          }}
          onClick={onWakeClick} 
          disabled={isConnecting}
        >
          {isConnecting ? "Waking Malvin..." : "Wake Malvin"}
        </button>
      </div>

      <div style={supportLinkStyle}>
        <p style={{ margin: 0 }}>
          Support: 
          <a href="mailto:malvinsupportteam@gmail.com" style={{ color: "#0070f3", textDecoration: "none", marginLeft: "5px" }}>
            malvinsupportteam@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}

const welcomeContainerStyle: React.CSSProperties = {
  width: '100%', height: '100%', position: 'fixed', top: 0, left: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  overflow: 'hidden', touchAction: 'none',
  background: 'linear-gradient(-45deg, #000000, #0a0a0a, #002b5e, #000000)',
  backgroundSize: '400% 400%', animation: 'gradientMove 12s ease infinite',
  fontFamily: '"Inter", sans-serif'
};

const userBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '15px', // Moved closer to the top
  left: '15px', // Moved closer to the left
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  zIndex: 100,
  padding: '4px 10px', // Thinner padding
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderRadius: '15px',
  backdropFilter: 'blur(5px)',
  border: '1px solid rgba(255, 255, 255, 0.05)'
};

const userEmailTextStyle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.4)', // Dimmed the text more
  fontSize: '9px', // Smaller font
  fontWeight: '500',
  letterSpacing: '0.02rem',
  fontFamily: 'monospace'
};

const supportLinkStyle: React.CSSProperties = {
  position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
  color: 'rgba(255, 255, 255, 0.3)', fontSize: '11px', textAlign: 'center', width: '100%',
};

export default Welcomeview;