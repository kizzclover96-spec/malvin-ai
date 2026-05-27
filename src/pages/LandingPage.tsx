import React from 'react';

const LandingPage = ({ onLoginClick }) => {
  const productMockupUrl = "/mockup.png"; // Place your cool picture here

  return (
    <div style={{
      backgroundColor: '#04020b', // Deep rich luxury dark background
      color: '#fff',
      minHeight: '100vh',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      position: 'relative',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      
      {/* --- PREMIUM BLUR BACKGROUND LAYER (From Reference Image) --- */}
      {/* Top Left Deep Blue/Cyan Blurb */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '-10%',
        width: '60vw',
        height: '60vw',
        background: 'radial-gradient(circle, rgba(0, 212, 255, 0.18) 0%, rgba(20, 10, 80, 0.05) 60%, transparent 100%)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />
      
      {/* Bottom Right Royal Blue/Purple Blurb */}
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '-10%',
        width: '60vw',
        height: '60vw',
        background: 'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* --- REUSABLE INTERACTIVE CSS --- */}
      <style>
        {`
          .nav-link { 
            transition: color 0.2s ease; 
            cursor: pointer; 
            font-size: 0.95rem;
            font-weight: 500;
          }
          .nav-link:hover { color: #fff !important; }
          
          .nav-link.active {
            color: #fff !important;
            position: relative;
          }
          .nav-link.active::after {
            content: '';
            position: absolute;
            bottom: -6px;
            left: 0;
            width: 100%;
            height: 2px;
            background: #fff;
            border-radius: 2px;
          }

          .btn-register {
            background: linear-gradient(90deg, #4f46e5, #06b6d4);
            border: none;
            color: white;
            padding: 12px 28px;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .btn-register:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 24px rgba(6, 182, 212, 0.4);
          }

          .btn-outline {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            padding: 12px 28px;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .btn-outline:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.3);
          }
        `}
      </style>

      {/* --- TOP SECTION: NAVBAR --- */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '30px 60px',
        maxWidth: '1600px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
        zIndex: 10,
      }}>
        {/* Left Side: Brand Logo */}
        <div style={{
          fontSize: '1.5rem',
          fontWeight: '900',
          letterSpacing: '1px',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          MALVIN <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'linear-gradient(90deg, #4f46e5, #06b6d4)', borderRadius: '4px' }}>AI</span>
        </div>

        {/* Middle Navigation Links */}
        <div style={{
          display: 'flex',
          gap: '35px',
          alignItems: 'center',
        }}>
          <span className="nav-link active" style={{ color: 'rgba(255,255,255,0.6)' }}>Home</span>
          <span className="nav-link" style={{ color: 'rgba(255,255,255,0.6)' }}>Explore</span>
          <span className="nav-link" style={{ color: 'rgba(255,255,255,0.6)' }}>News</span>
        </div>

        {/* Right Corner: Action Button */}
        <button onClick={onLoginClick} className="btn-register">
          Register
        </button>
      </nav>

      {/* --- MIDDLE SECTION: TWO-COLUMN HERO COMPOSURE --- */}
      <main style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 0.9fr',
        alignItems: 'center',
        gap: '40px',
        maxWidth: '1600px',
        width: '100%',
        margin: '0 auto',
        padding: '20px 60px 80px 60px',
        boxSizing: 'border-box',
        zIndex: 10,
        flex: 1,
      }}>
        
        {/* Left Column: Bold Catchy Info Area */}
        <div style={{ textAlign: 'left', paddingRight: '20px' }}>
          
          {/* Extended Wide Bold Headline */}
          <h1 style={{
            fontSize: '4rem',
            fontWeight: '800',
            lineHeight: '1.1',
            letterSpacing: '-1.5px',
            marginBottom: '24px',
            color: '#ffffff',
          }}>
            Automate, Manage <br />
            and Control Your <br />
            <span style={{
              background: 'linear-gradient(90deg, #ffffff 30%, #a855f7 70%, #00d4ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Entire Workspace.
            </span>
          </h1>

          {/* Subtext description */}
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.5)',
            lineHeight: '1.6',
            maxWidth: '540px',
            marginBottom: '35px',
            fontWeight: '400',
          }}>
            Malvin is the unified intelligent node for automated workflow optimization. 
            Connect your favorite tools instantly and witness your data operations execute themselves seamlessly.
          </p>

          {/* CTAs mapped to the reference layout styles */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '45px' }}>
            <button onClick={onLoginClick} className="btn-register" style={{ padding: '16px 36px', fontSize: '1rem' }}>
              Create a Vin account to get started
            </button>
            <button className="btn-outline" style={{ padding: '16px 32px', fontSize: '1rem' }}>
              Explore Features
            </button>
          </div>

          {/* Pill Metric Stats Card (Just like the image!) */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px 40px',
            gap: '50px',
          }}>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', marginBottom: '2px' }}>99.9%</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uptime Assured</div>
            </div>
            <div style={{ width: '1px', height: '30px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', marginBottom: '2px' }}>20k+</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Automations Run</div>
            </div>
            <div style={{ width: '1px', height: '30px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', marginBottom: '2px' }}>24/7</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Monitoring</div>
            </div>
          </div>

        </div>

        {/* Right Column: Large Clean Mockup Canvas Card */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}>
          {/* Subtle soft backdrop ambient light circle behind image */}
          <div style={{
            position: 'absolute',
            width: '85%',
            height: '85%',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
            zIndex: 1,
          }} />
          
          {/* Image Container Card */}
          <div style={{
            width: '100%',
            aspectRatio: '4 / 5',
            maxHeight: '580px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            overflow: 'hidden',
            backgroundColor: 'rgba(10, 8, 20, 0.4)',
            backdropFilter: 'blur(30px)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
            zIndex: 2,
            position: 'relative',
          }}>
            <img 
              src={productMockupUrl} 
              alt="Malvin Operational Interface Preview" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = `
                  <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 40px; text-align: center; background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)">
                    <div style="font-size: 3.5rem; filter: drop-shadow(0 0 12px rgba(6, 182, 212, 0.6)); margin-bottom: 15px;">🔮</div>
                    <h3 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 8px;">Malvin Core System</h3>
                    <p style="font-size: 0.85rem; color: rgba(255,255,255,0.4); max-width: 260px;">Insert your abstract app dashboard preview render here</p>
                    
                    {/* Tiny floating status item overlay to mimic the NFT card metadata look */}
                    <div style="position: absolute; bottom: 20px; left: 20px; right: 20px; padding: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                      <div style={{textAlign: 'left'}}>
                        <div style="font-size: 0.7rem; color: rgba(255,255,255,0.4)">SYSTEM STATUS</div>
                        <div style="font-size: 0.9rem; font-weight: 600; color: #4ade80">● Fully Operational</div>
                      </div>
                      <div style="font-size: 0.8rem; background: rgba(6, 182, 212, 0.2); color: #06b6d4; padding: 6px 12px; border-radius: 8px; font-weight: 600">v2.4 Live</div>
                    </div>
                  </div>
                `;
              }}
            />
          </div>
        </div>
      </main>

      {/* --- BOTTOM SECTION: COMPACT PROFESSIONAL INTEGRATION STRIPE --- */}
      <section style={{
        background: 'linear-gradient(90deg, rgba(4, 2, 11, 1) 0%, rgba(15, 10, 35, 0.8) 50%, rgba(4, 2, 11, 1) 100%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '30px 0',
        zIndex: 10,
        width: '100%',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 60px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '40px'
        }}>
          {/* Subtle clean tech logos just like the footer row of the image */}
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '600' }}>
            INTEGRATED PLATFORMS
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flex: 1,
            maxWidth: '900px',
            gap: '20px',
            flexWrap: 'wrap',
          }}>
            {['Google', 'Firebase', 'OpenAI', 'Gemini', 'LemonSqueezy'].map((partner) => (
              <div 
                key={partner} 
                style={{ 
                  color: 'rgba(255, 255, 255, 0.35)', 
                  fontWeight: '700', 
                  fontSize: '1.2rem',
                  letterSpacing: '-0.5px',
                  fontFamily: 'system-ui, sans-serif'
                }}
              >
                {partner.toLowerCase()}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;


