import React from 'react';

const LandingPage = ({ onLoginClick }) => {
  const backgroundImageUrl = "/wall.png"; 
  const logoUrl = "/logo.png";

  return (
    <div style={{
      color: '#fff',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      position: 'relative',
      overflow: 'hidden', // Keeps the moving background contained
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      {/* --- ANIMATED BACKGROUND LAYER --- */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        animation: 'slowPan 45s ease-in-out infinite alternate',
      }} />

      {/* CSS Animations */}
      <style>
        {`
          @keyframes slowPan {
            0% { transform: scale(1); background-position: center; }
            100% { transform: scale(1.1); background-position: top right; }
          }
          .pill-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 212, 255, 0.4);
          }
        `}
      </style>
      
      {/* --- NAVBAR --- */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '30px 50px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Top Left: Logo Only (No visible container) */}
        <div style={{
          width: '60px',
          height: '60px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <img 
            src={logoUrl} 
            alt="Malvin Logo" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', // Ensures the square fills the area before clipping
              borderRadius: '50%', // This makes the square image a circle
              boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)' // Subtle glow on the logo itself
            }} 
          />
        </div>
        {/* Top Middle: Cyberpunk Title */}
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '2.2rem',
          fontWeight: '900',
          letterSpacing: '10px',
          textTransform: 'uppercase',
          color: '#fff',
          textShadow: '2px 2px 0px #00d4ff, -1px -1px 0px #ff007a',
        }}>
          MALVIN
        </div>

        {/* Top Right: Login Pill Button */}
        <button 
          onClick={onLoginClick}
          className="pill-button"
          style={{ 
            padding: '10px 30px', 
            borderRadius: '50px', // Pill shape
            border: '1px solid #00d4ff', 
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
            color: '#00d4ff',
            cursor: 'pointer', 
            fontWeight: '600',
            textTransform: 'uppercase',
            transition: 'all 0.3s ease',
          }}
        >
          Login / Sign Up
        </button>
      </nav>

      {/* --- CENTER HERO CONTENT --- */}
      <main style={{ textAlign: 'center', padding: '0 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 10 }}>
        <h2 style={{ 
          fontSize: '1rem', 
          letterSpacing: '5px', 
          color: '#00d4ff', 
          marginBottom: '15px',
          textTransform: 'uppercase' 
        }}>
          Smart. Fast. <span style={{ color: '#fff' }}>Seamless.</span>
        </h2>
        
        <h1 style={{ 
          fontSize: '3.8rem', 
          marginBottom: '20px', 
          fontWeight: '800',
          lineHeight: '1.1' 
        }}>
          The next generation of <br/> 
          <span style={{ 
            background: 'linear-gradient(90deg, #00d4ff, #0082ff)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.3))'
          }}>
            Interface Management.
          </span>
        </h1>
        
        <p style={{ 
          fontSize: '1.15rem', 
          color: '#e0e0e0', 
          maxWidth: '600px', 
          margin: '0 auto 40px',
          lineHeight: '1.6',
          fontWeight: '300'
        }}>
          Malvin is the next generation of interface management. Experience a fluid workflow designed for the modern creator.
        </p>

        <div>
          <button 
            onClick={onLoginClick}
            className="pill-button"
            style={{ 
              padding: '18px 60px', 
              fontSize: '1rem', 
              backgroundColor: '#00d4ff', 
              color: '#000', 
              border: 'none', 
              borderRadius: '50px', // Pill shape
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              letterSpacing: '1px'
            }}
          >
            GET STARTED
          </button>
        </div>
      </main>

      {/* --- FOOTER: SOCIALS --- */}
      <footer style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '40px', 
        padding: '50px', 
        fontSize: '0.8rem',
        letterSpacing: '2px',
        color: '#aaa',
        zIndex: 10
      }}>
        <a href="https://instagram.com/malvin.ai_business_assistant" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>INSTAGRAM</a>
        <a href="https://facebook.com/MalvinAI" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>FACEBOOK</a>
        <a href="mailto:malvinsupportteam@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>EMAIL</a>
      </footer>
    </div>
  );
};

export default LandingPage;


