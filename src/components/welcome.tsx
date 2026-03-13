interface WelcomeProps {
  onWakeClick: () => void;
  isConnecting: boolean;
}

function Welcomeview({ onWakeClick, isConnecting }: WelcomeProps) {
  return (
    <div className="welcome" style={welcomeContainerStyle}>
      {/* 1. Global CSS for the Gradient and Glow */}
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
            height: "45px", // Slightly taller
            width: "160px", 
            borderRadius: "22px", // Modern pill shape
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
    </div>
  )
}

// 2. The Animated Gradient Style
const welcomeContainerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  // Colors: Black -> Dark Grey -> Deep Blue -> Black
  background: 'linear-gradient(-45deg, #000000, #0a0a0a, #002b5e, #000000)',
  backgroundSize: '400% 400%',
  animation: 'gradientMove 12s ease infinite',
  fontFamily: '"Inter", sans-serif'
};

export default Welcomeview;