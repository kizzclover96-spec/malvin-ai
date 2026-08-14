import React, { useState } from 'react';
import Explore from './Explore';
import About from './About';
import { Link } from "react-router-dom";

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const yourLogoUrl = "/logo.png"; 
  // Drop your own licensed photo at this path — a background image of
  // people using their phones works well here, similar to what you sent
  // as reference. Whatever you use, it sits behind a dark overlay (below)
  // so the glass card and text stay legible over any photo.
  const heroBackgroundUrl = "/hero-bg.jpg";
  const [activeTab, setActiveTab] = useState('home');

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

          @keyframes syncPulse {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.9; }
          }
          .sync-pulse-line { animation: syncPulse 2.4s ease-in-out infinite; }
          .sync-pulse-line:nth-of-type(2) { animation-delay: 0.4s; }
          .sync-pulse-line:nth-of-type(3) { animation-delay: 0.8s; }
          .sync-pulse-line:nth-of-type(4) { animation-delay: 1.2s; }

          @keyframes driftGlow {
            0%   { transform: translate(0, 0) scale(1); }
            50%  { transform: translate(4%, 6%) scale(1.12); }
            100% { transform: translate(0, 0) scale(1); }
          }
          .drift-glow { animation: driftGlow 14s ease-in-out infinite; }

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
            .hero-title { font-size: 2.6rem !important; }
            .hero-buttons { justify-content: center; flex-direction: column; width: 100%; }
            .hero-buttons button { width: 100%; }
            .stats-container { justify-content: center; width: 100%; padding: 16px !important; gap: 20px !important; }
            .navbar-container { padding: 20px 24px !important; }
            .partner-stripe { padding: 20px 24px !important; overflow-x: auto; }
            .partner-flex { justify-content: flex-start !important; gap: 24px !important; }
            .mockup-wrapper { max-height: 340px !important; }
            .hero-device-ring { display: none !important; }
            .hero-glass-card { padding: 32px 24px !important; }
            .hero-glass-card h1 { font-size: 1.9rem !important; }
          }
        `}
      </style>

      {/* --- BACKGROUND GLOW EFFECTS (animated: slow drift) --- */}
      <div className="drift-glow" style={{ position: 'absolute', top: '-10%', left: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(0, 212, 255, 0.08) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 1 }} />
      <div className="drift-glow" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(147, 51, 234, 0.06) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 1, animationDelay: '3s' }} />

      {/* --- PERSISTENT GLASS CARD (nav + brand always here; hero content only on Home) --- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 0, zIndex: 10, overflowY: 'auto', padding: '32px 24px' }}>
        <div className="animate hero-glass-card" style={{
          position: 'relative', width: '100%', maxWidth: 640, textAlign: 'center', flexShrink: 0,
          background: 'rgba(10, 8, 20, 0.55)', border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 28, padding: '30px 40px', backdropFilter: 'blur(28px) saturate(160%)', WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
          marginBottom: activeTab === 'home' ? 0 : 28,
        }}>
          {/* Nav row — no Register button, no top bar; this is the only navigation now */}
          <div className="glass-nav-row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 26, marginBottom: 18 }}>
            <span onClick={() => setActiveTab('home')} className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}>Home</span>
            <span onClick={() => setActiveTab('explore')} className={`nav-link ${activeTab === 'explore' ? 'active' : ''}`}>Explore</span>
            <span onClick={() => setActiveTab('about')} className={`nav-link ${activeTab === 'about' ? 'active' : ''}`}>About</span>
            <Link to="/faq" className="nav-link">FAQ</Link>
            <span onClick={() => setActiveTab('news')} className={`nav-link ${activeTab === 'news' ? 'active' : ''}`}>News</span>
          </div>

          {/* MALVIN wordmark — sits between the nav row and the hero eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: activeTab === 'home' ? 22 : 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={yourLogoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '1.5px', color: '#fff' }}>MALVIN</span>
          </div>

          {activeTab === 'home' && (
            <>
              <h2 style={{ fontSize: '0.85rem', color: '#a855f7', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '18px' }}>
                One QR Code. Every Customer.
              </h2>

              <h1 className="hero-title" style={{ fontSize: '2.6rem', fontWeight: '800', lineHeight: '1.2', letterSpacing: '-1px', marginBottom: '18px', color: '#ffffff' }}>
                Manage every customer interaction{" "}
                <span style={{
                  background: 'linear-gradient(90deg, #ffffff 30%, #a855f7 70%, #00d4ff 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>with one unique QR code.</span>
              </h1>

              <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.62)', lineHeight: '1.65', maxWidth: 480, margin: '0 auto 22px' }}>
                Generate a single code that connects your business, syncs every device your team uses, and keeps every customer interaction organized in one place.
              </p>

              <p style={{ fontSize: '1rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', margin: '0 0 30px', fontWeight: 500 }}>
                "It's a kill-two-birds-with-one-stone kind of situation."
              </p>

              <div className="hero-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'center', marginBottom: '30px' }}>
                <button onClick={onLoginClick} className="btn-register" style={{ padding: '15px 28px', fontSize: '0.95rem' }}>
                  Generate Your QR Code
                </button>
                <button onClick={onLoginClick} className="btn-outline" style={{ padding: '15px 24px', fontSize: '0.95rem' }}>For Businesses</button>
              </div>

              <div className="stats-container" style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '16px 28px', gap: '28px', marginBottom: 30 }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>1 code</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: '2px' }}>Every Storefront</div>
                </div>
                <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>Synced</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: '2px' }}>Across Every Device</div>
                </div>
                <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>Instant</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: '2px' }}>Book, Order, or Chat</div>
                </div>
              </div>

              {/* Integrated platform logos — moved in from the old footer stripe */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '600', marginBottom: 12 }}>
                  Integrated Platforms
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
                  {partners.map((p) => (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <img className="partner-logo" src={p.icon} alt={p.name} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                      <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: '700', fontSize: '0.85rem', letterSpacing: '-0.3px' }}>
                        {p.name.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Background photo + device diagram sit behind the card, Home only */}
        {activeTab === 'home' && (
          <div className="hero-device-ring" style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `linear-gradient(180deg, rgba(4,2,11,0.55) 0%, rgba(4,2,11,0.8) 65%, rgba(4,2,11,0.95) 100%), url(${heroBackgroundUrl})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="syncLine" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <line className="sync-pulse-line" x1="50" y1="50" x2="16" y2="22" stroke="url(#syncLine)" strokeWidth="0.25" />
              <line className="sync-pulse-line" x1="50" y1="50" x2="86" y2="18" stroke="url(#syncLine)" strokeWidth="0.25" />
              <line className="sync-pulse-line" x1="50" y1="50" x2="12" y2="78" stroke="url(#syncLine)" strokeWidth="0.25" />
              <line className="sync-pulse-line" x1="50" y1="50" x2="88" y2="82" stroke="url(#syncLine)" strokeWidth="0.25" />
            </svg>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: 74, height: 74, borderRadius: 18, background: 'rgba(255,255,255,0.95)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 10px rgba(0,212,255,0.08), 0 20px 50px rgba(0,0,0,0.5)',
            }}>
              <MiniQrGlyph />
            </div>
            <PhoneStorefront top="10%" left="10%" accent="#00d4ff" label="Café Nova" />
            <PhoneStorefront top="6%" left="80%" accent="#a855f7" label="Studio Lux" />
            <PhoneStorefront top="70%" left="4%" accent="#22c55e" label="Fresh Cuts" />
            <PhoneStorefront top="74%" left="82%" accent="#f59e0b" label="Auto Care" />
          </div>
        )}

        {activeTab === 'explore' && <Explore />}
        {activeTab === 'about' && <About />}

        {activeTab === 'news' && (
          <div className="animate delay-1" style={{ width: '100%', maxWidth: '800px', padding: '0 0 60px' }}>
            <h2 style={{ fontSize: '2.4rem', fontWeight: '800', marginBottom: '8px' }}>What's New</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '36px' }}>
              Recent updates to the Malvin AI platform.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                {
                  title: 'Push notifications now work on iPhone — no App Store required',
                  desc: "Add Malvin to your iPhone Home Screen from Safari and get real push notifications, the same as a native app — no Apple Developer account or App Store listing needed on our end.",
                },
                {
                  title: 'Emergency, Today, This Week, or Schedule — urgency on every service request',
                  desc: 'Requesting a Mechanic or Service job now asks how urgent it is. Emergency requests jump straight to the top of the business\'s job board, ahead of everything else.',
                },
                {
                  title: 'Preferred time on service requests',
                  desc: 'Let the business know roughly when you want the job done — "tomorrow morning," "Sat after 2pm," whatever works for you — right when you submit the request.',
                },
                {
                  title: 'Smarter QR handoff',
                  desc: "Scan a Malvin code with your phone's regular camera and it now recognizes whether you already have the app installed — handing you straight into it if so, or walking you through getting set up if not.",
                },
                {
                  title: 'One uid, multiple businesses',
                  desc: 'The same business owner can now run a Food account and a Salon account side-by-side, each fully independent — separate pages, separate ratings, separate entries in your Recent Businesses.',
                },
                {
                  title: 'Independent ratings per business',
                  desc: "A business's star rating no longer mixes with a different category business run by the same owner — each is scored entirely on its own.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    padding: '20px 24px',
                  }}
                >
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6', margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

const MiniQrGlyph: React.FC = () => {
  // A recognizable QR-style pattern — not a real scannable code, purely
  // decorative for the hero's "synced devices" diagram.
  const cells = [
    1,1,1,0,1,0,1,1,1,
    1,0,1,0,0,0,1,0,1,
    1,0,1,1,0,1,1,0,1,
    1,1,1,0,1,0,1,1,1,
    0,0,0,1,1,1,0,0,0,
    1,1,1,0,1,0,1,0,1,
    1,0,1,1,0,1,1,1,1,
    1,0,1,0,0,0,1,0,0,
    1,1,1,0,1,1,1,1,1,
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 1.5, width: 48, height: 48 }}>
      {cells.map((on, i) => (
        <div key={i} style={{ background: on ? '#0a0814' : 'transparent', borderRadius: 0.5 }} />
      ))}
    </div>
  );
};

const PhoneStorefront: React.FC<{ top: string; left: string; accent: string; label: string }> = ({ top, left, accent, label }) => (
  <div className="hero-phone" style={{
    position: 'absolute', top, left, transform: 'translate(-50%,-50%)',
    width: 84, height: 150, borderRadius: 16, background: 'rgba(15,12,28,0.85)',
    border: '1px solid rgba(255,255,255,0.14)', overflow: 'hidden',
    boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
  }}>
    <div style={{ height: 34, background: accent, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
      <span style={{ fontSize: 8, fontWeight: 800, color: '#0a0814', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
    <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ height: 8, width: '70%', borderRadius: 4, background: 'rgba(255,255,255,0.12)' }} />
      <div style={{ height: 8, width: '50%', borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ height: 20, borderRadius: 6, background: `${accent}33`, marginTop: 4 }} />
    </div>
  </div>
);

export default LandingPage;