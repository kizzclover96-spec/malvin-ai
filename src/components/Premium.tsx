import React, { useState, useEffect } from 'react';
import { auth } from "../firebase";

const variantId = import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID;

const Premium: React.FC<any> = ({ onBack }) => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUserId(user ? user.uid : null);
    });

    return () => unsub();
  }, []);

  const checkoutUrl = userId && variantId
    ? `https://malvin.lemonsqueezy.com/checkout[custom][user_id]=${userId}/buy/${variantId}?`
    : null;

  const handleUpgrade = () => {
    if (!checkoutUrl) {
      alert("Payment not configured");
      return;
    }

    // ✅ SAFE REDIRECT
    window.location.href = checkoutUrl;
  };

  return (
    <div style={containerStyle}>
      
      {/* BACK BUTTON */}
      <button onClick={onBack} style={backButtonStyle}>
        ← BACK
      </button>

      <div style={contentStyle}>
        <h2 style={kickerStyle}>UPGRADE_CORE</h2>

        <h1 style={titleStyle}>
          Malvin <span style={goldText}>Gold</span>
        </h1>

        <p style={subtitleStyle}>
          Experience the highest tier of neural asset management.
        </p>

        {/* CARD */}
        <div style={glassCardStyle}>
          
          <div style={priceHeader}>
            <span style={priceStyle}>€5.99</span>
            <span style={perMonthStyle}>/month</span>
          </div>

          <div style={featureList}>
            <div style={featureItem}>
              <span style={checkStyle}>★</span>
              <div>
                <div style={fTitle}>Neural Analytics</div>
                <div style={fDesc}>Predictive traffic mapping for ads</div>
              </div>
            </div>

            <div style={featureItem}>
              <span style={checkStyle}>★</span>
              <div>
                <div style={fTitle}>Priority Queue</div>
                <div style={fDesc}>Instant approval processing</div>
              </div>
            </div>

            <div style={featureItem}>
              <span style={checkStyle}>★</span>
              <div>
                <div style={fTitle}>Catalog Expansion</div>
                <div style={fDesc}>Unlimited asset deployment</div>
              </div>
            </div>

            <div style={featureItem}>
              <span style={checkStyle}>★</span>
              <div>
                <div style={fTitle}>Verified Pulse</div>
                <div style={fDesc}>Gold badge on profile</div>
              </div>
            </div>
          </div>

          <button onClick={handleUpgrade} style={upgradeBtn}>
            UPGRADE GOLD_ACCESS
          </button>

          <p style={finePrint}>
            Cancel anytime. Instant activation after payment.
          </p>

        </div>
      </div>
    </div>
  );
};

export default Premium;

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

const goldText: React.CSSProperties = {
  color: '#FFD700',
  textShadow: '0 0 20px rgba(255,215,0,0.5)'
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
  opacity: 0.5
};