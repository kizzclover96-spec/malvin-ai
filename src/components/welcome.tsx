import React from "react";

interface WelcomeProps {
  onWakeClick: () => void;
  isConnecting: boolean;
  userEmail: string | null | undefined; // Added to track the login state
}

function Welcomeview({ onWakeClick, isConnecting, userEmail }: WelcomeProps) {
  return (
    <div className="welcome" style={welcomeContainerStyle}>
      {/* 1. Global Animations */}
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

        .ai-picture-container img {
           transition: transform 0.5s ease;
        }

        .ai-picture-container img:hover {
           transform: scale(1.03);
        }
      `}</style>

      {/* 2. User Identity Badge (Top Left) */}
      <div style={userBadgeStyle}>
        <div style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          backgroundColor: userEmail ? '#32d74b' : '#ff453a',
          boxShadow: userEmail ? '0 0 10px #32d74b' : 'none'
        }} />
        <span style={userEmailTextStyle}>
          {userEmail ? userEmail.toLowerCase() : "Not Logged In"}
        </span>
      </div>

      {/* 3. Main Content */}
      <div className="ai-picture-container" style={{ textAlign: 'center', zIndex: 1 }}>
        <img 
          src="/Malvin self.png" 
          alt="Your personal ai assistant" 
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

      {/* 4. Support Link */}
      <div style={supportLinkStyle}>
        <p style={{ margin: 0 }}>
          For questions or user support: 
          <a 
            href="mailto:malvinsupportteam@gmail.com" 
            style={{ 
              color: "#0070f3", 
              textDecoration: "none", 
              marginLeft: "5px",
              fontWeight: "500"
            }}
          >
            malvinsupportteam@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}

// --- Styles ---

const welcomeContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'fixed',
  top: 0,
  left: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  touchAction: 'none',
  background: 'linear-gradient(-45deg, #000000, #0a0a0a, #002b5e, #000000)',
  backgroundSize: '400% 400%',
  animation: 'gradientMove 12s ease infinite',
  fontFamily: '"Inter", sans-serif'
};

const userBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '30px',
  left: '30px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  zIndex: 10,
  padding: '8px 14px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '20px',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)'
};

const userEmailTextStyle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.7)',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '0.05rem',
  fontFamily: 'monospace'
};

const supportLinkStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  color: 'rgba(255, 255, 255, 0.5)', 
  fontSize: '13px',
  textAlign: 'center',
  width: '100%',
};

export default Welcomeview;