interface WelcomeProps {
  onWakeClick: () => void;
  isConnecting: boolean;
}

function Welcomeview({ onWakeClick, isConnecting }: WelcomeProps) {
  return (
    <div className="welcome" style={welcomeContainerStyle}>
      {/* 1. Animations */}
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

      {/* 2. Main Content */}
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

      {/* 3. Support Link (Inside the return, but separate from the center container) */}
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
  )
}

// --- Styles ---

const welcomeContainerStyle: React.CSSProperties = {
  width: '100%',             // Changed from 100vw to 100%
  height: '100%',            // Changed from 100vh to 100%
  position: 'fixed',         // Use fixed to "pin" it to the edges
  top: 0,
  left: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',        // Clips any accidental overflow
  touchAction: 'none',       // Prevents "rubber-banding" or dragging
  background: 'linear-gradient(-45deg, #000000, #0a0a0a, #002b5e, #000000)',
  backgroundSize: '400% 400%',
  animation: 'gradientMove 12s ease infinite',
  fontFamily: '"Inter", sans-serif'
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