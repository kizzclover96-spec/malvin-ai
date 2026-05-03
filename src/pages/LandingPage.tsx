import React from 'react';

const LandingPage = ({ onLoginClick }) => {
  // Replace this with the actual path to your image
  const backgroundImageUrl = "/wall.png"; 
  const logoUrl = "/logo.png";

  return (
    <div style={{
      color: '#fff',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8)), url(${backgroundImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between', // Pushes Nav to top and Footer to bottom
      overflowX: 'hidden'
    }}>
      
      {/* --- NAVBAR --- */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '20px 40px',
        position: 'relative'
      }}>
        {/* Top Left: Logo Circle */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: '2px solid #00d4ff',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)'
        }}>
          <img src={logoUrl} alt="Malvin Logo" style={{ width: '80%', height: 'auto' }} />
        </div>

        {/* Top Middle: Cyberpunk Title */}
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '2.5rem',
          fontWeight: '900',
          letterSpacing: '8px',
          textTransform: 'uppercase',
          color: '#fff',
          textShadow: '2px 2px 0px #00d4ff, -1px -1px 0px #ff007a', // Cyberpunk glitch effect
        }}>
          MALVIN
        </div>

        {/* Top Right: Login Button */}
        <button 
          onClick={onLoginClick}
          style={{ 
            padding: '10px 25px', 
            borderRadius: '2px', // Sharper edges for business look
            border: '1px solid #00d4ff', 
            backgroundColor: 'transparent',
            color: '#00d4ff',
            cursor: 'pointer', 
            fontWeight: '600',
            textTransform: 'uppercase',
            transition: '0.3s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 212, 255, 0.1)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          Login / Sign Up
        </button>
      </nav>

      {/* --- CENTER HERO CONTENT --- */}
      <main style={{ textAlign: 'center', padding: '0 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 style={{ 
          fontSize: '1.2rem', 
          letterSpacing: '4px', 
          color: '#00d4ff', 
          marginBottom: '10px',
          textTransform: 'uppercase' 
        }}>
          Smart. Fast. <span style={{ color: '#fff' }}>Seamless.</span>
        </h2>
        
        <h1 style={{ 
          fontSize: '3.5rem', 
          marginBottom: '25px', 
          fontWeight: '700',
          lineHeight: '1.2' 
        }}>
          The next generation of <br/> 
          <span style={{ background: 'linear-gradient(to right, #00d4ff, #0082ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Interface Management.
          </span>
        </h1>
        
        <p style={{ 
          fontSize: '1.1rem', 
          color: '#ccc', 
          maxWidth: '650px', 
          margin: '0 auto 40px',
          lineHeight: '1.6'
        }}>
          Experience a fluid workflow designed for the modern creator. 
          Step into the future of digital organization and speed.
        </p>

        <div>
          <button 
            onClick={onLoginClick}
            style={{ 
              padding: '18px 50px', 
              fontSize: '1rem', 
              backgroundColor: '#00d4ff', 
              color: '#000', 
              border: 'none', 
              borderRadius: '2px', 
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)'
            }}
          >
            ENTER MALVIN
          </button>
        </div>
      </main>

      {/* --- FOOTER: SOCIALS --- */}
      <footer style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '30px', 
        padding: '40px', 
        fontSize: '0.9rem',
        color: '#888'
      }}>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>INSTAGRAM</a>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>FACEBOOK</a>
        <a href="mailto:contact@malvin.com" style={{ color: 'inherit', textDecoration: 'none' }}>EMAIL</a>
      </footer>
    </div>
  );
};

export default LandingPage;


