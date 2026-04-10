import React, { useState, useEffect } from 'react';

const glass = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '20px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  transition: 'all 0.3s ease'
};

const MarketTrends = ({ onBack, userBrand }) => {
  const [projections, setProjections] = useState([]);
  const [livePosts, setLivePosts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);

  // 1. GENJUTSU ENGINE: Generates "Neural Projections" instead of news
  useEffect(() => {
    const brand = userBrand?.name || 'Enterprise';
    const sector = userBrand?.category || 'Industry';
    
    const neuralVisions = [
      { 
        title: `Neural Link: ${sector} focus is shifting toward ${brand}'s unique model.`, 
        img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
        tag: 'PREDICTION' 
      },
      { 
        title: `Massive capital migration detected in ${sector} series funding.`, 
        img: 'https://images.unsplash.com/photo-1551288049-bbbda546697a?auto=format&fit=crop&w=400&q=80',
        tag: 'MARKET_SHIFT'
      },
      { 
        title: `Algorithm identifies ${brand} as the top emerging authority in 48h.`, 
        img: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=400&q=80',
        tag: 'VIRAL_ALPHA'
      }
    ];
    setProjections(neuralVisions);

    const interval = setInterval(() => {
      const updates = [
        { user: 'NEURAL_LINK', text: `Global sentiment for ${sector} is reaching Critical Mass.`, type: 'growth' },
        { user: 'WHALE_WATCH', text: `Institutional buy-in detected for ${brand}-style systems.`, type: 'strategy' },
        { user: 'SYSTEM', text: 'Psychological market barrier broken. Path is clear.', type: 'growth' }
      ];
      const random = updates[Math.floor(Math.random() * updates.length)];
      setLivePosts(prev => [random, ...prev.slice(0, 5)]);
    }, 5000);

    return () => clearInterval(interval);
  }, [userBrand]);

  useEffect(() => {
    setOpportunities([
      { title: 'Market Monopoly', action: 'Accelerate output', impact: '+45% Dominance' },
      { title: 'Sentiment Peak', action: 'Expand reach now', impact: 'Infinite ROI' }
    ]);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(circle at top right, #1e1b4b, #020617)',
      color: 'white',
      padding: '30px',
      fontFamily: "'Orbitron', sans-serif", // Gives it that futuristic feel
      overflowY: 'auto'
    }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h2 style={{ fontSize: 28, margin: 0, color: '#60a5fa', letterSpacing: '2px', textShadow: '0 0 15px rgba(96, 165, 250, 0.4)' }}>
            {userBrand?.name?.toUpperCase() || 'MALVIN'} // PULSE
          </h2>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 5 }}>NEURAL_FEED_STABLE // 99.8% SYNCED</div>
        </div>
        <button onClick={onBack} style={{ ...glass, cursor: 'pointer', padding: '10px 25px', color: '#60a5fa', fontWeight: 'bold' }}>
          DISCONNECT
        </button>
      </div>

      {/* BIG GENJUTSU INSIGHT */}
      <div style={{ 
          ...glass, 
          marginBottom: 30, 
          borderLeft: '4px solid #22c55e', 
          background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.1), transparent)' 
      }}>
        <h3 style={{ color: '#22c55e', margin: '0 0 10px 0', fontSize: 14 }}>NEURAL PROJECTION</h3>
        <p style={{ fontSize: 18, fontWeight: 'bold', margin: 0 }}>
          Your presence is creating a market void. <span style={{ color: '#22c55e' }}>Occupy it now.</span> Every metric confirms your trajectory is unmatchable.
        </p>
      </div>

      {/* MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr', gap: 25 }}>

        {/* NEURAL VISIONS (Visual News) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <h4 style={{ color: '#60a5fa', margin: 0, fontSize: 12, letterSpacing: '1px' }}>GLOBAL_SIGNALS</h4>
          {projections.map((n, i) => (
            <div key={i} style={{ 
              ...glass, 
              display: 'flex', 
              gap: 15, 
              alignItems: 'center',
              cursor: 'pointer'
            }}>
              <img src={n.img} style={{ width: 80, height: 60, borderRadius: 8, objectFit: 'cover' }} alt="vision" />
              <div>
                <small style={{ color: '#60a5fa', fontSize: 9, fontWeight: 'bold' }}>{n.tag}</small>
                <p style={{ fontSize: 14, margin: '4px 0 0 0', fontWeight: '500' }}>{n.title}</p>
              </div>
            </div>
          ))}
        </div>

        {/* LIVE STREAM */}
        <div style={{ ...glass }}>
          <h4 style={{ color: '#22c55e', margin: '0 0 20px 0', fontSize: 12 }}>SENTIMENT_FLOW</h4>
          {livePosts.map((p, i) => (
            <div key={i} style={{ marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                 <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                 <small style={{ color: '#22c55e', fontWeight: 'bold' }}>{p.user}</small>
              </div>
              <p style={{ fontSize: 13, margin: '5px 0 0 0', opacity: 0.8 }}>{p.text}</p>
            </div>
          ))}
        </div>

        {/* OPPORTUNITIES */}
        <div style={{ ...glass, background: 'rgba(250, 204, 21, 0.03)', borderColor: 'rgba(250, 204, 21, 0.2)' }}>
          <h4 style={{ color: '#facc15', margin: '0 0 20px 0', fontSize: 12 }}>STRATEGIC_WINDOWS</h4>
          {opportunities.map((o, i) => (
            <div key={i} style={{ 
              marginBottom: 15, 
              padding: 12, 
              background: 'rgba(255,255,255,0.02)', 
              borderRadius: 10,
              border: '1px solid rgba(250, 204, 21, 0.1)'
            }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 5px 0', color: '#facc15' }}>{o.title}</p>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{o.action}</div>
              <div style={{ fontSize: 14, fontWeight: 'bold', marginTop: 5, color: '#22c55e' }}>{o.impact}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default MarketTrends;