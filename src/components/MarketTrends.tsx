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
    // MACRO & CAPITAL SHIFTS
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
    },

    // BEHAVIORAL & SOCIAL TRENDS
    { 
        title: 'Neural projection: User trust in traditional systems migrating toward ${sector}.', 
        img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80',
        tag: 'PREDICTION' 
    },
    { 
        title: 'Psychological barrier broken: ${sector} mainstream adoption confirmed by multi-channel data.', 
        img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
        tag: 'CULTURAL_SHIFT'
    },
    { 
        title: "Search volume for ${sector} 'Efficiency First' models up 212% globally.", 
        img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
        tag: 'TRAFFIC_PULSE'
    },
    { 
        title: 'Sentiment bot: High saturation in legacy markets driving traffic to ${sector} alternatives.', 
        img: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=400&q=80',
        tag: 'SOCIAL_PROOF'
    },
    { 
        title: 'Viral trajectory: Predicted peak for ${sector} related interest in 14-day cycle.', 
        img: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=400&q=80',
        tag: 'MOMENTUM'
    },

    // TECHNICAL & REGULATORY
    { 
        title: 'Regulatory landscape clearing for aggressive ${sector} cross-border expansion.', 
        img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=400&q=80',
        tag: 'GOVERNANCE'
    },
    { 
        title: 'Cross-border demand for ${sector} services skyrocketing in emerging corridors.', 
        img: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=400&q=80',
        tag: 'GLOBAL_TRADE'
    },
    { 
        title: 'Tech giants scouting ${sector} acquisitions; market consolidation beginning.', 
        img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
        tag: 'M_AND_A'
    },
    { 
        title: 'Efficiency breakthrough in ${sector} logic reduces average operational overhead.', 
        img: 'https://images.unsplash.com/photo-1518186239717-31464402636a?auto=format&fit=crop&w=400&q=80',
        tag: 'SYSTEM_UPGRADE'
    },
    { 
        title: 'Alpha detected: Early-stage ${sector} startups outperforming blue-chip benchmarks.', 
        img: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=400&q=80',
        tag: 'ALPHA_INTEL'
    },

    // SECTOR PULSE (THE "REAL" WORLD)
    { 
        title: 'Infrastructure update: High-speed connectivity bolstering ${sector} remote viability.', 
        img: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=400&q=80',
        tag: 'INFRASTRUCTURE'
    },
    { 
        title: 'Digital identity integration becoming standard for ${sector} security protocols.', 
        img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&q=80',
        tag: 'SECURITY_CORE'
    },
    { 
        title: 'Energy mandates forcing rapid innovation in ${sector} power consumption.', 
        img: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=400&q=80',
        tag: 'SUSTAINABILITY'
    },
    { 
        title: 'Market depth analysis: High resilience shown in ${sector} against volatility.', 
        img: 'https://images.unsplash.com/photo-1611974717482-48a14950529d?auto=format&fit=crop&w=400&q=80',
        tag: 'RESILIENCE'
    },
    { 
        title: 'Predictive AI indicates 12% revenue growth potential for agile ${sector} firms.', 
        img: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=400&q=80',
        tag: 'GROWTH_HACK'
    },

    // SYSTEM LOGS
    { 
        title: 'Data sync: New leadership emerges as ${sector} incumbents struggle with tech-debt.', 
        img: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80',
        tag: 'LEADERSHIP'
    },
    { 
        title: "Neural projection: The 'Great Reset' in ${sector} valuations favors lean operations.", 
        img: 'https://images.unsplash.com/photo-1484417855536-a3631484196c?auto=format&fit=crop&w=400&q=80',
        tag: 'VALUATION'
    },
    { 
        title: 'Quarterly outlook: Diversification into ${sector} assets recommended by analysts.', 
        img: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80',
        tag: 'ANALYST_RECAP'
    },
    { 
        title: 'Pattern recognized: Historical data suggests a 24-month bull cycle for ${sector}.', 
        img: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?auto=format&fit=crop&w=400&q=80',
        tag: 'CYCLE_LOG'
    },
    { 
        title: 'End of cycle: Old-guard ${sector} models failing to adapt to real-time sync.', 
        img: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=400&q=80',
        tag: 'SYSTEM_EXIT'
    }
];

const MarketTrends = ({ onBack, userBrand }) => {
  const [projections, setProjections] = useState([]);
  const [livePosts, setLivePosts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const brand = userBrand?.name || 'Enterprise';
  const sector = userBrand?.category || 'Industry';

  // 1. GENJUTSU ENGINE: Generates "Neural Projections" instead of news
  useEffect(() => {
    const shuffled = [...neuralVisions].sort(() => 0.5 - Math.random());

    const dynamicVisions = neuralVisions.map(v => ({
      ...v,
      title: v.title.replaceAll('${sector}', sector)
    }));
    const selected = [...dynamicVisions]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    setProjections(selected);
    
    
    const interval = setInterval(() => {
       const randomUser = analystUsers[Math.floor(Math.random() * analystUsers.length)];
       // Fixed: using updatesText instead of UPDATES_TEXT_BASE
       const template = updatesText[Math.floor(Math.random() * updatesText.length)];
       
       // Inject sector into the live text
       const cleanText = template.text.replaceAll('${sector}', sector);

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