import React, { useEffect, useState } from "react";

interface WelcomeProps {
  onFinish: () => void;
  userEmail?: string | null;
}

function Welcomeview({ onFinish, userEmail }: WelcomeProps) {
  const [text, setText] = useState("Hello");
  const [fadeOut, setFadeOut] = useState(false);

  // Sequence control
  useEffect(() => {
    const timers = [
      setTimeout(() => setText("Malvin"), 2000), // morph text
      setTimeout(() => setFadeOut(true), 5000),  // fade out
      setTimeout(() => onFinish(), 6000)         // go to session
    ];

    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  return (
    <div style={{
      ...containerStyle,
      opacity: fadeOut ? 0 : 1,
      transition: "opacity 1s ease"
    }}>

      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes glow {
          0% { text-shadow: 0 0 10px rgba(0,150,255,0.3); }
          50% { text-shadow: 0 0 30px rgba(255,120,0,0.7); }
          100% { text-shadow: 0 0 10px rgba(0,150,255,0.3); }
        }

        .text {
          font-size: 64px;
          font-weight: 200;
          color: white;
          letter-spacing: 6px;
          animation: glow 3s ease-in-out infinite;
          transition: all 0.6s ease;
        }
      `}</style>

      {/* Background glass */}
      <div style={glassStyle} />

      {/* Center */}
      <div style={{ zIndex: 2, textAlign: "center" }}>
        <h1 className="text">{text}</h1>

        <p style={{
          marginTop: "10px",
          fontSize: "12px",
          color: "rgba(255,255,255,0.5)",
          letterSpacing: "2px"
        }}>
          Initializing...
        </p>
      </div>

      {/* User */}
      <div style={userStyle}>
        <span style={{ color: "#00ff88" }}>●</span>
        <span>{userEmail?.toLowerCase() || "offline"}</span>
      </div>

    </div>
  );
}

// Styles

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "100vh",
  position: "fixed",
  top: 0,
  left: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  fontFamily: '"Inter", sans-serif',

  background: "linear-gradient(-45deg, #001f4d, #003366, #ff6a00, #ff3c00)",
  backgroundSize: "200% 200%",
  animation: "gradientMove 10s ease infinite"
};

const glassStyle: React.CSSProperties = {
  position: "absolute",
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.35)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)"
};

const userStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: "6px",
  fontSize: "10px",
  color: "rgba(255,255,255,0.5)"
};

export default Welcomeview;