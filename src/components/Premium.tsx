import React, { useEffect, useState } from 'react';
import { ref, onValue, off } from "firebase/database";
import { db, auth } from "../firebase";

interface PremiumProps {
  onBack: () => void;
}

const variantId = import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID;

if (!variantId) {
  console.error("CRITICAL: VITE_LEMONSQUEEZY_VARIANT_ID is missing from environment variables!");
}

const Premium: React.FC<PremiumProps> = ({ onBack }) => {
  const [isPremium, setIsPremium] = useState<boolean>(false);

  // 1. Real-time Subscription Listener
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userDbRef = ref(db, `users/${currentUser.uid}`);
    
    const unsubscribe = onValue(userDbRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setIsPremium(userData?.premium === true || userData?.tier === "premium");
      }
    });

    return () => off(userDbRef);
  }, []);

  // Dynamic Theme Colors based on premium state
  const activeColor = isPremium ? '#00f2ff' : '#FFD700'; // Blue vs Gold
  const activeShadow = isPremium ? 'rgba(0, 242, 255, 0.4)' : 'rgba(255, 215, 0, 0.4)';
  const activeGradient = isPremium 
    ? 'linear-gradient(135deg, #00f2ff 0%, #006699 100%)' 
    : 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)';

  const features = [
    { title: "Neural Analytics", desc: "Predictive traffic mapping for ad placements." },
    { title: "Priority Queue", desc: "Instant campaign approval by Malvin Admin." },
    { title: "Catalog Expansion", desc: "Unlimited asset deployment in your inventory." },
    { title: "More runtime", desc: "Scale Without Limits." },
    { title: "Malvin recognition", desc: "Keep your brand visible with exclusive recognition." },
    { title: "Knowledge Base", desc: "Access our comprehensive support resources." },
    { title: "Verified Pulse", desc: `A glowing ${isPremium ? 'blue' : 'gold'} badge on your customer chat.` }
  ];

  const userId = auth.currentUser?.uid;
  const planName = "premium";
  
  const checkoutUrl = `https://malvin.lemonsqueezy.com/checkout/buy/${variantId}?embed=1&checkout[custom][user_id]=${userId}&checkout[custom][plan]=${planName}`;
  const hubUrl = "https://malvin.lemonsqueezy.com/billing"; // Redirect users here to manage/cancel subscriptions

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
        style={{
          ...backButtonStyle,
          borderColor: isPremium ? 'rgba(0, 242, 255, 0.3)' : 'rgba(255, 215, 0, 0.3)',
          color: activeColor
        }}
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
            background: activeColor,
            borderRadius: '50%',
            boxShadow: `0 0 10px ${activeColor}`,
            animation: `fall ${star.duration} linear infinite`,
            animationDelay: star.delay,
            zIndex: 0
          }} 
        />
      ))}

      <div style={{
        ...glowStyle,
        background: `radial-gradient(circle, ${isPremium ? 'rgba(0, 242, 255, 0.08)' : 'rgba(255, 215, 0, 0.08)'} 0%, rgba(0,0,0,0) 70%)`
      }} />

      <div style={contentStyle}>
        <h2 style={kickerStyle}>UPGRADE_CORE</h2>
        <h1 style={titleStyle}>
          Malvin <span style={{ color: activeColor, textShadow: `0 0 20px ${activeShadow}` }}>
            {isPremium ? "Premium" : "Gold"}
          </span>
        </h1>
        <p style={subtitleStyle}>Experience the highest tier of neural asset management.</p>

        {/* Pricing Card */}
        <div style={{
          ...glassCardStyle,
          borderColor: isPremium ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255, 215, 0, 0.2)'
        }}>
          <div style={{
            ...priceHeader,
            borderBottom: isPremium ? '1px solid rgba(0, 242, 255, 0.1)' : '1px solid rgba(255, 215, 0, 0.1)'
          }}>
            <span style={{ ...priceStyle, color: activeColor }}>€20.99</span>
            <span style={perMonthStyle}>/month</span>
          </div>
          
          <div style={featureList}>
            {features.map((f, i) => (
              <div key={i} style={featureItem}>
                <span style={{ ...checkStyle, color: activeColor }}>★</span>
                <div>
                  <div style={fTitle}>{f.title}</div>
                  <div style={fDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <button 
            style={{
              ...upgradeBtn,
              background: activeGradient,
              boxShadow: `0 10px 20px ${isPremium ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255, 215, 0, 0.2)'}`
            }} 
            onClick={() => {
              if (isPremium) {
                window.open(hubUrl, "_blank");
              } else {
                window.open(checkoutUrl, "_blank");
              }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = `0 15px 30px ${activeShadow}`;
            }} 
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = `0 10px 20px ${isPremium ? 'rgba(0, 242, 255, 0.2)' : 'rgba(255, 215, 0, 0.2)'}`;
            }}
          >
            {isPremium ? "CANCEL SUBSCRIPTION" : "UPGRADE GOLD_ACCESS"}
          </button>
          <p style={finePrint}>
            {isPremium ? "Manage payments via customer customer billing terminal portal portal." : "Cancel anytime. Neural sync takes < 1 min."}
          </p>
        </div>
      </div>
    </div>
  );
};

// --- BASE DESIGN STYLES ---

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
  border: '1px solid',
  backdropFilter: 'blur(25px)',
  borderRadius: '40px',
  padding: '40px',
  textAlign: 'left',
  boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
};

const priceHeader: React.CSSProperties = {
  marginBottom: '30px',
  paddingBottom: '20px'
};

const priceStyle: React.CSSProperties = {
  fontSize: '42px',
  fontWeight: 800
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
  color: '#000',
  fontWeight: 800,
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
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
  border: '1px solid',
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