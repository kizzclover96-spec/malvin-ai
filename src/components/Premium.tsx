import React from 'react';

interface PremiumProps {
  onBack: () => void;
}c

const Premium: React.FC<PremiumProps> = ({ onBack }) => = () => {
  const features = [
    { title: "Neural Analytics", desc: "Predictive traffic mapping for ad placements." },
    { title: "Priority Queue", desc: "Instant campaign approval by Malvin Admin." },
    { title: "Catalog Expansion", desc: "Unlimited asset deployment in your inventory." },
    { title: "Verified Pulse", desc: "A glowing gold badge on your customer chat." }
  ];

  // Helper to create 20 random falling stars
  const stars = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 5}s`,
    duration: `${3 + Math.random() * 4}s`,
    size: `${2 + Math.random() * 3}px`
  }));

  return (
    <div style={containerStyle}>
      {/* Global CSS for falling stars */}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
      {/* --- BACK BUTTON --- */}
      <button 
        onClick={onBack} 
        style={backButtonStyle}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
      >
        ← BACK
      </button>

      {/* Falling Stars Layer */}
      {stars.map(star => (
        <div 
          key={star.id} 
          style={{
            position: 'absolute',
            top: '-5vh',
            left: star.left,
            width: star.size,
            height: star.size,
            background: 'gold',
            borderRadius: '50%',
            boxShadow: '0 0 10px gold',
            animation: `fall ${star.duration} linear infinite`,
            animationDelay: star.delay,
            zIndex: 0
          }} 
        />
      ))}

      <div style={glowStyle} />

      <div style={contentStyle}>
        <h2 style={kickerStyle}>UPGRADE_CORE</h2>
        <h1 style={titleStyle}>Malvin <span style={{color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.5)'}}>Gold</span></h1>
        <p style={subtitleStyle}>Experience the highest tier of neural asset management.</p>

        {/* Pricing Card */}
        <div style={glassCardStyle}>
          <div style={priceHeader}>
            <span style={priceStyle}>$29.99</span>
            <span style={perMonthStyle}>/month</span>
          </div>
          
          <div style={featureList}>
            {features.map((f, i) => (
              <div key={i} style={featureItem}>
                <span style={checkStyle}>★</span>
                <div>
                  <div style={fTitle}>{f.title}</div>
                  <div style={fDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <button 
            style={upgradeBtn} 
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 15px 30px rgba(255, 215, 0, 0.4)';
            }} 
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(255, 215, 0, 0.2)';
            }}
          >
            INITIALIZE GOLD_ACCESS
          </button>
          <p style={finePrint}>Cancel anytime. Neural sync takes &lt; 1 min.</p>
        </div>
      </div>
    </div>
  );
};

// --- UPDATED GOLD STYLES ---

const containerStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '100vh',
  backgroundColor: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  color: 'white',
  fontFamily: 'sans-serif'
};

const glowStyle: React.CSSProperties = {
  position: 'absolute',
  width: '700px',
  height: '700px',
  background: 'radial-gradient(circle, rgba(255, 215, 0, 0.08) 0%, rgba(0,0,0,0) 70%)',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 0
};

const contentStyle: React.CSSProperties = {
  zIndex: 1,
  textAlign: 'center',
  maxWidth: '500px',
  padding: '20px'
};

const kickerStyle: React.CSSProperties = {
  fontSize: '12px',
  letterSpacing: '4px',
  opacity: 0.5,
  marginBottom: '10px'
};

const titleStyle: React.CSSProperties = {
  fontSize: '48px',
  fontWeight: 900,
  margin: '0 0 10px 0'
};

const subtitleStyle: React.CSSProperties = {
  opacity: 0.6,
  marginBottom: '40px',
  lineHeight: '1.5'
};

const glassCardStyle: React.CSSProperties = {
  background: 'rgba(20, 20, 20, 0.6)',
  border: '1px solid rgba(255, 215, 0, 0.2)',
  backdropFilter: 'blur(25px)',
  borderRadius: '40px',
  padding: '40px',
  textAlign: 'left',
  boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
};

const priceHeader: React.CSSProperties = {
  marginBottom: '30px',
  borderBottom: '1px solid rgba(255,215,0,0.1)',
  paddingBottom: '20px'
};

const priceStyle: React.CSSProperties = {
  fontSize: '42px',
  fontWeight: 800,
  color: '#FFD700'
};

const perMonthStyle: React.CSSProperties = {
  opacity: 0.4,
  fontSize: '18px',
  marginLeft: '8px'
};

const featureList: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  marginBottom: '40px'
};

const featureItem: React.CSSProperties = {
  display: 'flex',
  gap: '15px'
};

const checkStyle: React.CSSProperties = {
  color: '#FFD700',
  fontWeight: 'bold',
  fontSize: '18px'
};

const fTitle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '2px'
};

const fDesc: React.CSSProperties = {
  fontSize: '12px',
  opacity: 0.5
};

const upgradeBtn: React.CSSProperties = {
  width: '100%',
  padding: '18px',
  borderRadius: '15px',
  border: 'none',
  background: 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)',
  color: '#000',
  fontWeight: 800,
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: '0 10px 20px rgba(255, 215, 0, 0.2)'
};

const finePrint: React.CSSProperties = {
  textAlign: 'center',
  fontSize: '10px',
  opacity: 0.3,
  marginTop: '20px'
};

const backButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '30px',
  left: '30px',
  background: 'transparent',
  border: '1px solid rgba(255, 215, 0, 0.3)',
  color: '#FFD700',
  padding: '8px 15px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '11px',
  letterSpacing: '2px',
  zIndex: 10,
  opacity: 0.5,
  transition: 'all 0.3s ease'
};

export default Premium;