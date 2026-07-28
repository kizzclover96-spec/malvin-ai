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

const analystUsers = [
  "VANGUARD_NODE_01", "TERMINAL_PRIME", "GLOBAL_STRIKE_DATA", "QUANTI-CORE", "MARKET_SENTINEL",
  "ALPHA_WOLF_LEAKS", "CHAIN_REACTION_88", "BLOCK_RUNNER_X", "NIGHT_TRADER_V", "SILENT_LIQUIDITY",
  "INDUSTRY_PULSE_AI", "VECTOR_STRATEGIST", "MACRO_MINDSET", "SECTOR_SCANNER_Z", "TREND_ARCHITECT",
  "SYSTEM_OVERLAY", "NEURAL_SYNAPSE_7", "LOGIC_GATE_DATA", "ORACLE_PROTOCOL", "CORE_INTELLIGENCE"
];

const updatesText = [
    // PERSONA: NEURAL_LINK (Trend Analysis)
    { text: 'Global sentiment for ${sector} is reaching Critical Mass.', type: 'growth' },
    { text: 'Predictive models show a 14% shift in consumer behavior toward ${sector} efficiency.', type: 'growth' },
    { text: 'Saturation levels in traditional models are forcing a pivot to ${sector}.', type: 'strategy' },
    { text: 'Pattern recognition detects a \'Black Swan\' event favoring agile ${sector} entities.', type: 'growth' },
    { text: 'Digital footprint for ${sector} related searches is expanding in Tier 1 markets.', type: 'growth' },

    // PERSONA: WHALE_WATCH (Capital & Investment)
    { text: 'Institutional buy-in detected for ${sector}-style systems.', type: 'strategy' },
    { text: 'Large-scale liquidity moving from legacy assets into ${sector} innovation.', type: 'growth' },
    { text: 'Venture capital focus for Q3 is heavily weighted toward ${sector} scalability.', type: 'strategy' },
    { text: 'Series B funding rounds in this sector are closing 20% faster than last quarter.', type: 'growth' },
    { text: 'Quiet accumulation of market share by mid-sized ${sector} players observed.', type: 'strategy' },

    // PERSONA: SYSTEM (The Technical Core)
    { text: 'Psychological market barrier broken. Path is clear.', type: 'growth' },
    { text: 'Data sync complete: Market volatility creating entry points for new leadership.', type: 'strategy' },
    { text: 'Neural Engine detects a temporary supply-side bottleneck in ${sector}.', type: 'warning' },
    { text: 'Recursive analysis confirms a 3-year growth cycle has just initialized.', type: 'growth' },
    { text: 'Standard competition parameters are no longer applicable to current ${sector} velocity.', type: 'growth' },

    // PERSONA: ALPHA_FEED (Fast-Breaking Intel)
    { text: 'Social mentions for ${sector} alternatives are up 400% in 24 hours.', type: 'growth' },
    { text: 'Rumors of major regulatory shifts favoring ${sector} decentralization.', type: 'strategy' },
    { text: "Consumer fatigue with 'Big Box' solutions is driving traffic to ${sector}.", type: 'growth' },
    { text: 'Top-tier influencers are quietly exiting legacy niches for ${sector}.', type: 'strategy' },
    { text: "New 'Efficiency Standard' being adopted across the ${sector} landscape.", type: 'strategy' },

    // PERSONA: SENTIMENT_BOT (Public Mood)
    { text: 'Public trust in traditional ${sector} methods is at a 5-year low.', type: 'warning' },
    { text: 'High demand for transparency in ${sector} transactions detected.', type: 'strategy' },
    { text: 'Viral discourse around ${sector} ethics is trending globally.', type: 'growth' },
    { text: "User feedback across forums indicates a 'Need for Speed' in ${sector} delivery.", type: 'strategy' },
    { text: "Early adopters are reporting 'High Satisfaction' with new ${sector} integrations.", type: 'growth' },

    // PERSONA: MACRO_WATCH (The Big Picture)
    { text: "Interest rate stability is providing a 'Green Light' for ${sector} expansion.", type: 'growth' },
    { text: 'Global logistics re-routing is lowering the cost of ${sector} operations.', type: 'growth' },
    { text: 'Cross-border trade agreements are opening new ${sector} corridors in Asia.', type: 'strategy' },
    { text: 'Energy efficiency mandates are favoring the current ${sector} infrastructure.', type: 'growth' },
    { text: 'Work-from-home trends continue to bolster the ${sector} remote-service index.', type: 'growth' }
];

const neuralVisions = [
    { 
        title: 'Institutional reallocation: $4.2B moving into ${sector} automated infrastructure.', 
        img: 'https://images.unsplash.com/photo-1551288049-bbbda546697a?auto=format&fit=crop&w=400&q=80',
        tag: 'MARKET_SHIFT'
    },
    { 
        title: 'Venture interest in ${sector} scalability reaches peak Q2 velocity.', 
        img: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80',
        tag: 'CAPITAL_FLOW'
    },
    { 
        title: 'Global supply chain optimization favoring decentralized ${sector} nodes.', 
        img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80',
        tag: 'LOGISTICS'
    },
    { 
        title: 'Consumer sentiment index for ${sector} reaching 5-year resistance levels.', 
        img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80',
        tag: 'MACRO_DATA'
    },
    { 
        title: "Unusual 'Whale' activity: High-volume buy orders detected in ${sector} niche.", 
        img: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=400&q=80',
        tag: 'LIQUIDITY'
    }
];

interface MarketTrendsProps {
    onBack: () => void;
    brandName?: string;
    userBrand?: any;
}

interface Projection {
  title: string;
  img: string;
  tag: string;
}

interface LivePost {
  user: string;
  text: string;
  type: string;
}

interface Opportunity {
  title: string;
  action: string;
  impact: string;
}

const MarketTrends: React.FC<MarketTrendsProps> = ({ onBack, brandName, userBrand }) => {
  const [projections, setProjections] = useState<Projection[]>([]);
  const [livePosts, setLivePosts] = useState<LivePost[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const brand = userBrand?.name || brandName || 'Enterprise';
  const sector = userBrand?.category || 'Industry';

  useEffect(() => {
    const dynamicVisions = neuralVisions.map(v => ({
      ...v,
      title: v.title.split('${sector}').join(sector)
    }));
    const selected = [...dynamicVisions]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    setProjections(selected);
    
    const interval = setInterval(() => {
       const randomUser = analystUsers[Math.floor(Math.random() * analystUsers.length)];
       const template = updatesText[Math.floor(Math.random() * updatesText.length)];
       const cleanText = template.text.split('${sector}').join(sector);

       setLivePosts(prev => [
         { user: randomUser, text: cleanText, type: template.type },
         ...prev.slice(0, 5)
       ]);
    }, 6000);

    return () => clearInterval(interval);
  }, [userBrand, sector]);

  useEffect(() => {
    setOpportunities([
      { title: 'Market Monopoly', action: 'Accelerate output', impact: '+45% Dominance' },
      { title: 'Sentiment Peak', action: 'Expand reach now', impact: 'Infinite ROI' }
    ]);
  }, []);

  return (
    <>
      <style>{responsiveStyles}</style>

      <div className="market-trends-wrapper">

        {/* --- COMING SOON OVERLAY --- */}
        <div className="coming-soon-overlay">
          <div className="coming-soon-card">
            <div className="status-pill">NEURAL PULSE // UNDER_DEVELOPMENT</div>
            <h1 className="overlay-title">COMING SOON</h1>
            <p className="overlay-description">
              The <strong>Market Trends & Signal Core</strong> is actively connecting to global market liquidity nodes. Signal syncing will be available in the next release.
            </p>
            <button className="overlay-back-btn" onClick={onBack}>
              Return to Dashboard
            </button>
          </div>
        </div>

        {/* --- BLURRED BACKGROUND CONTENT --- */}
        <div className="blurred-content-wrapper">
          {/* HEADER */}
          <div className="trends-header">
            <div>
              <h2 style={{ fontSize: 28, margin: 0, color: '#60a5fa', letterSpacing: '2px', textShadow: '0 0 15px rgba(96, 165, 250, 0.4)' }}>
                {brand.toUpperCase()} // PULSE
              </h2>
              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 5 }}>NEURAL_FEED_STABLE // 99.8% SYNCED</div>
            </div>
            <button onClick={onBack} style={{ ...glass, cursor: 'pointer', padding: '10px 25px', color: '#60a5fa', fontWeight: 'bold' }}>
              DISCONNECT
            </button>
          </div>

          {/* INSIGHT BANNER */}
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
          <div className="trends-grid">

            {/* NEURAL VISIONS */}
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

      </div>
    </>
  );
};

// --- RESPONSIVE CSS INJECTION ---
const responsiveStyles = `
  .market-trends-wrapper {
    position: fixed;
    inset: 0;
    background: radial-gradient(circle at top right, #1e1b4b, #020617);
    color: white;
    padding: 30px;
    font-family: 'Orbitron', -apple-system, sans-serif;
    overflow-y: auto;
    box-sizing: border-box;
  }

  .blurred-content-wrapper {
    filter: blur(12px);
    pointer-events: none;
    user-select: none;
    opacity: 0.45;
  }

  /* OVERLAY STYLES */
  .coming-soon-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(2, 6, 23, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .coming-soon-card {
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(96, 165, 250, 0.3);
    box-shadow: 0 0 50px rgba(96, 165, 250, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.05);
    border-radius: 28px;
    padding: 40px;
    max-width: 480px;
    width: 100%;
    text-align: center;
    box-sizing: border-box;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }

  .status-pill {
    display: inline-block;
    padding: 6px 14px;
    background: rgba(96, 165, 250, 0.15);
    border: 1px solid rgba(96, 165, 250, 0.4);
    color: #60a5fa;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.5px;
    margin-bottom: 20px;
  }

  .overlay-title {
    font-size: 32px;
    font-weight: 800;
    margin: 0 0 12px 0;
    letter-spacing: 2px;
    color: #ffffff;
    text-shadow: 0 0 20px rgba(96, 165, 250, 0.5);
  }

  .overlay-description {
    font-size: 14px;
    opacity: 0.8;
    line-height: 1.6;
    margin-bottom: 30px;
    color: #cbd5e1;
  }

  .overlay-back-btn {
    width: 100%;
    background: #2563eb;
    color: white;
    border: none;
    padding: 16px;
    border-radius: 14px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(37, 99, 235, 0.4);
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .overlay-back-btn:active {
    transform: scale(0.98);
  }

  /* LAYOUT GRID */
  .trends-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
  }

  .trends-grid {
    display: grid;
    grid-template-columns: 1.8fr 1fr 1fr;
    gap: 25px;
  }

  @media (max-width: 768px) {
    .market-trends-wrapper {
      padding: 20px 15px !important;
    }

    .trends-header {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 15px !important;
    }

    .trends-header button {
      width: 100% !important;
    }

    .trends-grid {
      grid-template-columns: 1fr !important;
      gap: 20px !important;
    }

    .coming-soon-card {
      padding: 28px 20px !important;
      border-radius: 20px !important;
    }

    .overlay-title {
      font-size: 26px !important;
    }

    .overlay-description {
      font-size: 13px !important;
    }
  }
`;

export default MarketTrends;