import React from 'react';

const LandingPage = ({ onLoginClick }) => {
  // Replace these with your actual asset paths
  const productMockupUrl = "/mockup.png"; 
  
  // Clean, high-quality SVGs or official logo images should be used here
  const partnerLogos = [
    { name: "Google", url: "/logos/google.svg" },
    { name: "Firebase", url: "/logos/firebase.svg" },
    { name: "OpenAI", url: "/logos/openai.svg" },
    { name: "Gemini", url: "/logos/gemini.svg" },
    { name: "LemonSqueezy", url: "/logos/lemonsqueezy.svg" },
  ];

  return (
    <div style={{
      backgroundColor: '#0a0a0c',
      color: '#fff',
      minHeight: '100vh',
      fontFamily: "Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, Open Sans, sans-serif",
      position: 'relative',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      
      {/* --- PREMIUM BLUR BACKGROUND GRADIENTS --- */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, rgba(59, 130, 246, 0.05) 50%, transparent 100%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(147, 51, 234, 0.05) 50%, transparent 100%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* --- GLOBAL HOVER STYLES --- */}
      <style>
        {`
          .nav-link { transition: color 0.2s ease; cursor: pointer; }
          .nav-link:hover { color: #fff !important; }
          .btn-primary { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
          .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(147, 51, 234, 0.3); background: #fff !important; color: #000 !important; }
          .btn-secondary { transition: all 0.2s ease; }
          .btn-secondary:hover { border-color: rgba(255,255,255,0.6) !important; color: #fff !important; }
        `}
      </style>

      {/* --- TOP SECTION: HEADER NAVBAR --- */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '30px 80px',
        maxWidth: '1400px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
        zIndex: 10,
      }}>
        {/* 1st Header: Logo/Name */}
        <div style={{
          fontSize: '1.6rem',
          fontWeight: '900',
          letterSpacing: '3px',
          color: '#fff',
        }}>
          MALVIN
        </div>

        {/* 2nd, 3rd, 4th Headers: Navigation Links */}
        <div style={{
          display: 'flex',
          gap: '40px',
          alignItems: 'center',
        }}>
          <span className="nav-link" style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '500', fontSize: '0.95rem' }}>Home</span>
          <span className="nav-link" style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '500', fontSize: '0.95rem' }}>Explore</span>
          <span className="nav-link" style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '500', fontSize: '0.95rem' }}>News</span>
        </div>

        {/* 5th Header: Sign In Action */}
        <button 
          onClick={onLoginClick}
          className="btn-secondary"
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: 'transparent',
            color: 'rgba(255,255,255,0.8)',
            fontWeight: '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Sign In
        </button>
      </nav>

      {/* --- MIDDLE SECTION: TWO-COLUMN HERO --- */}
      <main style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        gap: '60px',
        maxWidth: '1400px',
        width: '100%',
        margin: '0 auto',
        padding: '40px 80px 100px 80px',
        boxSizing: 'border-box',
        zIndex: 10,
        flex: 1,
      }}>
        {/* Left-Centered Content */}
        <div style={{ textAlign: 'left' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '100px',
            backgroundColor: 'rgba(147, 51, 234, 0.1)',
            border: '1px solid rgba(147, 51, 234, 0.3)',
            color: '#a855f7',
            fontSize: '0.85rem',
            fontWeight: '600',
            marginBottom: '24px',
            letterSpacing: '0.5px'
          }}>
            <span>✨</span> Next-Gen AI Business Assistant
          </div>

          {/* Bold, instantly readable catchphrase */}
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '800',
            lineHeight: '1.15',
            letterSpacing: '-1px',
            marginBottom: '24px',
          }}>
            Automate your workspace. <br />
            <span style={{
              background: 'linear-gradient(90deg, #3b82f6, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Command your day.
            </span>
          </h1>

          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: '1.6',
            maxWidth: '520px',
            marginBottom: '40px',
            fontWeight: '400',
          }}>
            Malvin integrates seamlessly with your tools to manage interfaces, automate tasks, and supercharge production. One read is all it takes to realize what you've been missing.
          </p>

          <div>
            <button
              onClick={onLoginClick}
              className="btn-primary"
              style={{
                padding: '16px 36px',
                fontSize: '1rem',
                backgroundColor: '#fff',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
                letterSpacing: '-0.2px',
                boxShadow: '0 4px 12px rgba(255,255,255,0.1)'
              }}
            >
              Create a Vin account to get started
            </button>
          </div>
        </div>

        {/* Right-Centered Picture/Mockup */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}>
          {/* Subtle glow behind the image container */}
          <div style={{
            position: 'absolute',
            width: '80%',
            height: '80%',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
            filter: 'blur(50px)',
            zIndex: 1,
          }} />
          
          <div style={{
            width: '100%',
            maxWidth: '580px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 50px rgba(0,0,0,0.5)',
            zIndex: 2,
          }}>
            <img 
              src={productMockupUrl} 
              alt="Malvin Workspace Interface Dashboard" 
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
              onError={(e) => {
                // Fallback elegant placeholder layout if image fails to load
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = `
                  <div style="padding: 60px 40px; text-align: center; color: rgba(255,255,255,0.4)">
                    <div style="font-size: 3rem; margin-bottom: 10px">📊</div>
                    <p style="font-size: 0.9rem; font-weight: 500">[ Visual Interface Dashboard Preview ]</p>
                  </div>
                `;
              }}
            />
          </div>
        </div>
      </main>

      {/* --- BOTTOM SECTION: TRUST STRIPE (PARTNERS & 3RD PARTIES) --- */}
      <section style={{
        background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.08) 100%)',
        borderTop: '1px solid rgba(147, 51, 234, 0.15)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
        padding: '24px 0',
        zIndex: 10,
        width: '100%',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '30px'
        }}>
          <span style={{
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'rgba(255, 255, 255, 0.4)',
            fontWeight: '600'
          }}>
            Powered & Secured By
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '50px',
            flexWrap: 'wrap',
          }}>
            {partnerLogos.map((logo) => (
              <div 
                key={logo.name} 
                style={{ 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontWeight: '700', 
                  fontSize: '1.1rem',
                  letterSpacing: '-0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {/* Once you have standard SVGs, swap this text label out for a real <img src={logo.url} /> */}
                <span style={{ opacity: 0.7 }}>⚡</span> {logo.name}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;


