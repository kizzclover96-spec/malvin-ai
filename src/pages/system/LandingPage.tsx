import React, { useState } from 'react';
import Explore from './Explore';
import About from './About';
import { Link } from "react-router-dom";

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const productMockupUrl = "/mockup.png"; 
  const yourLogoUrl = "/logo.png"; 
  const [activeTab, setActiveTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const partners = [
    { name: "google", icon: "https://www.vectorlogo.zone/logos/google/google-icon.svg" },
    { name: "firebase", icon: "https://www.vectorlogo.zone/logos/firebase/firebase-icon.svg" },
    { name: "openai", icon: "https://static.cdnlogo.com/logos/o/38/openai.svg" },
    { name: "gemini", icon: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002.svg" },
    { name: "lemonsqueezy", icon: "https://www.vectorlogo.zone/logos/lemonsqueezy/lemonsqueezy-icon.svg" },
  ];

  return (
    <div className="main-viewport-container" style={{
      backgroundColor: '#04020b',
      color: '#fff',
      height: '100vh',
      maxHeight: '100vh',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'hidden', // Locked on desktop layouts
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
    }}>
      
      {/* --- RESPONSIVE MEDIA QUERIES --- */}
      <style>
        {`
          @keyframes fadeSlideIn {
            0% { opacity: 0; transform: translateY(20px); }
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

          .nav-link { 
            transition: color 0.2s ease; cursor: pointer; font-size: 0.95rem; font-weight: 500;
            color: rgba(255, 255, 255, 0.6); text-decoration: none;
          }
          .nav-link:hover { color: #fff !important; }
          
          .nav-link.active { color: #fff !important; position: relative; }
          .nav-link.active::after {
            content: ''; position: absolute; bottom: -6px; left: 0; width: 100%; height: 2px;
            background: #fff; border-radius: 2px;
          }

          .btn-register {
            background: linear-gradient(90deg, #4f46e5, #06b6d4);
            border: none; color: white; padding: 12px 24px; border-radius: 12px;
            font-weight: 600; cursor: pointer; transition: all 0.3s ease; white-space: nowrap;
          }
          .btn-register:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 24px rgba(6, 182, 212, 0.4);
          }

          .btn-outline {
            background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
          }
          .btn-outline:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.3); }

          .partner-logo {
            filter: grayscale(1) brightness(1.5) opacity(0.5);
            transition: all 0.3s ease;
          }
          .partner-logo:hover {
            filter: grayscale(0) brightness(1) opacity(1);
          }

          /* --- MOBILE BREAKPOINT OVERRIDES --- */
          @media (max-width: 968px) {
            .main-viewport-container {
              height: auto !important;
              max-height: none !important;
              overflow-y: auto !important; /* Restore normal scrolling on mobile devices */
            }
            .desktop-nav { display: none !important; }
            .mobile-nav-toggle { display: flex !important; }
            .main-workspace-grid { 
              grid-template-columns: 1fr !important; 
              gap: 40px !important; 
              padding: 40px 24px !important;
              text-align: center !important;
            }
            .main-workspace-grid > div { text-align: center !important; }
            .hero-title { font-size: 2.6rem !important; }
            .hero-buttons { justify-content: center; flex-direction: column; width: 100%; }
            .hero-buttons button { width: 100%; }
            .stats-container { justify-content: center; width: 100%; padding: 16px !important; gap: 20px !important; }
            .navbar-container { padding: 20px 24px !important; }
            .partner-stripe { padding: 20px 24px !important; overflow-x: auto; }
            .partner-flex { justify-content: flex-start !important; gap: 24px !important; }
            .mockup-wrapper { max-height: 340px !important; }
          }
        `}
      </style>

      {/* --- BACKGROUND GLOW EFFECTS --- */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(0, 212, 255, 0.08) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(147, 51, 234, 0.06) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 1 }} />

      {/* --- NAVBAR --- */}
      <nav className="navbar-container animate" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '25px 60px',
        maxWidth: '1600px', width: '100%', margin: '0 auto', boxSizing: 'border-box', zIndex: 100,
        position: 'relative'
      }}>
        {/* Brand Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '38px', height: '38px', borderRadius: '50%', 
            border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', 
            background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
             <img src={yourLogoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '1px', color: '#fff' }}>
            MALVIN
          </div>
        </div>

        {/* Desktop Links Menu */}
        <div className="desktop-nav" style={{ display: 'flex', gap: '35px', alignItems: 'center' }}>
          <span onClick={() => setActiveTab('home')} className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}>Home</span>
          <span onClick={() => setActiveTab('explore')} className={`nav-link ${activeTab === 'explore' ? 'active' : ''}`}>Explore</span>
          <Link to="/about" className="nav-link">About</Link>
          <span onClick={() => setActiveTab('news')} className={`nav-link ${activeTab === 'news' ? 'active' : ''}`}>News</span>
        </div>

        <div className="desktop-nav">
          <button onClick={onLoginClick} className="btn-register">Register</button>
        </div>

        {/* Mobile Burger Toggle */}
        <button 
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none', flexDirection: 'column', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', zIndex: 110
          }}
        >
          <div style={{ width: '24px', height: '2px', backgroundColor: '#fff', transition: '0.3s', transform: mobileMenuOpen ? 'rotate(45deg) translate(6px, 5px)' : 'none' }} />
          <div style={{ width: '24px', height: '2px', backgroundColor: '#fff', transition: '0.3s', opacity: mobileMenuOpen ? 0 : 1 }} />
          <div style={{ width: '24px', height: '2px', backgroundColor: '#fff', transition: '0.3s', transform: mobileMenuOpen ? 'rotate(-45deg) translate(6px, -6px)' : 'none' }} />
        </button>

        {/* Full-Screen Mobile Drawer */}
        {mobileMenuOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#04020b',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '32px', zIndex: 105
          }}>
            <span onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }} style={{ fontSize: '1.5rem' }} className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}>Home</span>
            <span onClick={() => { setActiveTab('explore'); setMobileMenuOpen(false); }} style={{ fontSize: '1.5rem' }} className={`nav-link ${activeTab === 'explore' ? 'active' : ''}`}>Explore</span>
            <Link to="/about" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1.5rem' }} className="nav-link">About</Link>
            <span onClick={() => { setActiveTab('news'); setMobileMenuOpen(false); }} style={{ fontSize: '1.5rem' }} className={`nav-link ${activeTab === 'news' ? 'active' : ''}`}>News</span>
            <button onClick={() => { onLoginClick(); setMobileMenuOpen(false); }} className="btn-register" style={{ padding: '14px 40px', fontSize: '1.1rem' }}>Register</button>
          </div>
        )}
      </nav>

      {/* --- WORKSPACE ROUTING PANEL --- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, zIndex: 10 }}>
        
        {activeTab === 'explore' && <Explore />}
        {activeTab === 'about' && <About />}

        {activeTab === 'news' && (
          <div className="animate delay-1" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '40px 24px' }}>
            <div style={{ textAlign: 'center', maxWidth: '600px' }}>
              <h2 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '16px' }}>News & System Matrices</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', lineHeight: '1.6' }}>
                Stay informed with core infrastructure log entries, version patch updates, and feature rollout tracking announcements directly from the Malvin ecosystem hub.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <main className="main-workspace-grid" style={{
            display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', alignItems: 'center', gap: '60px',
            maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '0 60px', boxSizing: 'border-box',
            flex: 1, minHeight: 0
          }}>
            {/* Left Column Text Content */}
            <div className="animate delay-1" style={{ textAlign: 'left' }}>
              <h1 className="hero-title" style={{ fontSize: '3.8rem', fontWeight: '800', lineHeight: '1.15', letterSpacing: '-1.5px', marginBottom: '16px', color: '#ffffff' }}>
                Automate, Manage <br />
                and Control Your <br />
                <span style={{
                  background: 'linear-gradient(90deg, #ffffff 30%, #a855f7 70%, #00d4ff 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>Entire Workspace.</span>
              </h1>
              <h2 style={{ fontSize: '1.1rem', color: '#a855f7', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>AI Business Automation Platform</h2>
              
              <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6', maxWidth: '520px', marginBottom: '32px', fontWeight: '400' }}>
                Malvin is a Multi-vendor commerce platform designed to help businesses grow, organize, and scale more effectively. 
                With over 95% of the operational toolkit frameworks needed natively standard—from storefront modules down to granular matrix automation layers.
              </p>

              <div className="hero-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', marginBottom: '35px' }}>
                <button onClick={onLoginClick} className="btn-register" style={{ padding: '15px 28px', fontSize: '0.95rem' }}>
                  Create a Vin account to get started
                </button>
                <button className="btn-outline" style={{ padding: '15px 24px', fontSize: '0.95rem' }}>Explore Features</button>
              </div>

              {/* Data Matrices Grid Row */}
              <div className="stats-container" style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '16px 32px', gap: '32px' }}>
                <div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>99.9%</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: '2px' }}>Uptime</div>
                </div>
                <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} className="desktop-nav" />
                <div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>20k+</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: '2px' }}>Automation</div>
                </div>
                <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} className="desktop-nav" />
                <div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>24/7</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: '2px' }}>AI Monitor</div>
                </div>
              </div>
            </div>

            {/* Right Column Graphic Container */}
            <div className="animate delay-2 mockup-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', width: '100%' }}>
              <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)', filter: 'blur(30px)', zIndex: 1 }} />
              <div style={{
                width: '100%', 
                maxWidth: '400px', 
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)', 
                overflow: 'hidden', 
                backgroundColor: 'rgba(10, 8, 20, 0.4)',
                backdropFilter: 'blur(20px)', 
                boxShadow: '0 24px 48px rgba(0,0,0,0.6)', 
                zIndex: 2, 
                aspectRatio: '4/5'
              }}>
                <img src={productMockupUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          </main>
        )}

      </div>

      {/* --- INTEGRATION FOOTER STRIPE --- */}
      <section className="partner-stripe animate delay-3" style={{
        background: 'linear-gradient(90deg, rgba(4, 2, 11, 1) 0%, rgba(15, 10, 35, 0.8) 50%, rgba(4, 2, 11, 1) 100%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)', padding: '24px 0', zIndex: 10, width: '100%',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 60px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="partner-flex" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '600' }}>
              INTEGRATED PLATFORMS
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '32px' }}>
              {partners.map((p) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img className="partner-logo" src={p.icon} alt={p.name} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                  <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: '700', fontSize: '1rem', letterSpacing: '-0.5px' }}>
                    {p.name.toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;