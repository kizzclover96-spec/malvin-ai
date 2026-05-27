import React from 'react';

const LandingPage = ({ onLoginClick }) => {
  const productMockupUrl = "/mockup.png"; // Your cool picture here
  const yourLogoUrl = "/logo.png"; // Your brand logo for the circle

  // Using professional grayscale icons for a "Big Firm" aesthetic
  const partners = [
    { name: "google", icon: "https://www.vectorlogo.zone/logos/google/google-icon.svg" },
    { name: "firebase", icon: "https://www.vectorlogo.zone/logos/firebase/firebase-icon.svg" },
    { name: "openai", icon: "https://static.cdnlogo.com/logos/o/38/openai.svg" },
    { name: "gemini", icon: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002.svg" },
    { name: "lemonsqueezy", icon: "https://vignette.wikia.nocookie.net/logopedia/images/4/4c/Lemon_Squeezy_Icon.png" },
  ];

  return (
    <div style={{
      backgroundColor: '#04020b',
      color: '#fff',
      height: '100vh',
      maxHeight: '100vh',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
    }}>
      
      {/* --- REUSABLE ANIMATIONS & STYLES --- */}
      <style>
        {`
          @keyframes fadeSlideIn {
            0% { opacity: 0; transform: translateY(25px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          .animate {
            opacity: 0;
            animation: fadeSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          .delay-1 { animation-delay: 0.1s; }
          .delay-2 { animation-delay: 0.2s; }
          .delay-3 { animation-delay: 0.3s; }
          .delay-4 { animation-delay: 0.4s; }
          .delay-5 { animation-delay: 0.5s; }

          .nav-link { 
            transition: color 0.2s ease; cursor: pointer; font-size: 0.95rem; font-weight: 500;
          }
          .nav-link:hover { color: #fff !important; }
          
          .nav-link.active { color: #fff !important; position: relative; }
          .nav-link.active::after {
            content: ''; position: absolute; bottom: -6px; left: 0; width: 100%; height: 2px;
            background: #fff; border-radius: 2px;
          }

          .btn-register {
            background: linear-gradient(90deg, #4f46e5, #06b6d4);
            border: none; color: white; padding: 12px 28px; border-radius: 12px;
            font-weight: 600; cursor: pointer; transition: all 0.3s ease;
          }
          .btn-register:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 24px rgba(6, 182, 212, 0.4);
          }

          .btn-outline {
            background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff; padding: 12px 28px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
          }
          .btn-outline:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.3); }

          .partner-logo {
            filter: grayscale(1) brightness(1.5) opacity(0.5);
            transition: all 0.3s ease;
          }
          .partner-logo:hover {
            filter: grayscale(0) brightness(1) opacity(1);
          }
        `}
      </style>

      {/* --- PREMIUM BLUR BACKGROUND --- */}
      <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(0, 212, 255, 0.12) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(147, 51, 234, 0.1) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 1 }} />

      {/* --- TOP SECTION: NAVBAR --- */}
      <nav className="animate" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '25px 60px',
        maxWidth: '1600px', width: '100%', margin: '0 auto', boxSizing: 'border-box', zIndex: 10,
      }}>
        {/* Left Side: Brand Logo & Circle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '42px', height: '42px', borderRadius: '50%', 
            border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', 
            background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
             <img src={yourLogoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', letterSpacing: '1px', color: '#fff' }}>
            MALVIN
          </div>
        </div>

        {/* Middle Navigation */}
        <div style={{ display: 'flex', gap: '35px', alignItems: 'center' }}>
          <span className="nav-link active" style={{ color: 'rgba(255,255,255,0.6)' }}>Home</span>
          <span className="nav-link" style={{ color: 'rgba(255,255,255,0.6)' }}>Explore</span>
          <span className="nav-link" style={{ color: 'rgba(255,255,255,0.6)' }}>News</span>
        </div>

        <button onClick={onLoginClick} className="btn-register">Register</button>
      </nav>

      {/* --- MIDDLE SECTION --- */}
      <main style={{
        display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', alignItems: 'center', gap: '60px',
        maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '0 60px', boxSizing: 'border-box',
        zIndex: 10, flex: 1, minHeight: 0
      }}>
        
        {/* Left Column */}
        <div className="animate delay-1" style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: '800', lineHeight: '1.1', letterSpacing: '-1.5px', marginBottom: '20px', color: '#ffffff' }}>
            Automate, Manage <br />
            and Control Your <br />
            <span style={{
              background: 'linear-gradient(90deg, #ffffff 30%, #a855f7 70%, #00d4ff 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Entire Workspace.</span>
          </h1>

          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5', maxWidth: '500px', marginBottom: '30px', fontWeight: '400' }}>
            Malvin is the unified intelligent node for automated workflow optimization. 
            Connect your favorite tools and witness your production execute itself flawlessly.
          </p>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '35px' }}>
            <button onClick={onLoginClick} className="btn-register" style={{ padding: '15px 32px', fontSize: '0.95rem' }}>
              Create a Vin account to get started
            </button>
            <button className="btn-outline" style={{ padding: '15px 28px', fontSize: '0.95rem' }}>Explore Features</button>
          </div>

          <div className="animate delay-2" style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '16px 36px', gap: '40px' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>99.9%</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Uptime</div>
            </div>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>20k+</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Automation</div>
            </div>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>24/7</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>AI Monitor</div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="animate delay-3" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', height: '100%', maxHeight: '500px' }}>
          <div style={{ position: 'absolute', width: '80%', height: '80%', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 1 }} />
          <div style={{
            width: '100%', height: '100%', maxWidth: '440px', maxHeight: '520px', borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.12)', overflow: 'hidden', backgroundColor: 'rgba(10, 8, 20, 0.4)',
            backdropFilter: 'blur(30px)', boxShadow: '0 30px 60px rgba(0,0,0,0.8)', zIndex: 2
          }}>
            <img src={productMockupUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      </main>

      {/* --- BOTTOM SECTION: INTEGRATION STRIPE --- */}
      <section className="animate delay-4" style={{
        background: 'linear-gradient(90deg, rgba(4, 2, 11, 1) 0%, rgba(15, 10, 35, 0.8) 50%, rgba(4, 2, 11, 1) 100%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)', padding: '24px 0', zIndex: 10, width: '100%',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '600' }}>
            INTEGRATED PLATFORMS
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
            {partners.map((p, i) => (
              <div key={p.name} className={`animate delay-${i+1}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img className="partner-logo" src={p.icon} alt={p.name} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: '700', fontSize: '1.1rem', letterSpacing: '-0.5px' }}>
                  {p.name.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;


