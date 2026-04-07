import React from 'react';

const glassWhite = "rgba(255, 255, 255, 0.8)";
const glassCardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '20px',
    color: 'white'
};

const AuraBackground = () => {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      zIndex: 0,
      pointerEvents: 'none'
    }}>
      <style>{`
        @keyframes waveFlow1 {
          0% { transform: translateX(-20%) translateY(0%) rotate(0deg); }
          50% { transform: translateX(20%) translateY(-10%) rotate(8deg); }
          100% { transform: translateX(-20%) translateY(0%) rotate(0deg); }
        }

        @keyframes waveFlow2 {
          0% { transform: translateX(20%) translateY(0%) rotate(0deg); }
          50% { transform: translateX(-20%) translateY(10%) rotate(-8deg); }
          100% { transform: translateX(20%) translateY(0%) rotate(0deg); }
        }

        .aura-wave {
          position: absolute;
          width: 900px;
          height: 400px;
          filter: blur(120px);
          opacity: 0.6;
          mix-blend-mode: screen;
        }
      `}</style>

      {/* PURPLE WAVE */}
      <div
        className="aura-wave"
        style={{
          top: '20%',
          left: '-10%',
          background: 'linear-gradient(90deg, rgba(168,85,247,0.6), rgba(236,72,153,0.4), transparent)',
          animation: 'waveFlow1 12s ease-in-out infinite',
          opacity: 0.7,
        }}
      />

      {/* BLUE WAVE */}
      <div
        className="aura-wave"
        style={{
          bottom: '10%',
          right: '-10%',
          background: 'linear-gradient(90deg, rgba(59,130,246,0.6), rgba(99,102,241,0.4), transparent)',
          animation: 'waveFlow2 14s ease-in-out infinite',
          opacity: 0.7,
        }}
      />

      {/* EXTRA GLOW CENTER */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(168,85,247,0.25), transparent 70%)',
          filter: 'blur(100px)',
        }}
      />
    </div>
  );
};


const Memories = ({ onBack }: { onBack: () => void }) => {
  return (
    <div style={{ 
      position: 'relative', // Necessary for AuraBackground to stay behind
      padding: '30px', 
      minHeight: '100vh', 
      fontFamily: 'sans-serif', 
      backgroundColor: '#0a0a0c', // Dark base so aura shows up
      color: 'white',
      display: 'flex',
      flexDirection: 'column', // Stacks sections vertically
      overflow: 'hidden'
    }}>
      
      <AuraBackground />
       
      {/* HEADER SECTION - Wrapped in a relative div to stay above Aura */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <button onClick={onBack} style={{ color: 'white', cursor: 'pointer', background: 'none', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '8px', marginBottom: '20px' }}>
          ← BACK TO main
        </button>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px' }}>
          <span>🧠</span> Memories
        </h1>
        <button style={{ background: 'rgba(191, 0, 255, 0.2)', border: '1px solid #bf00ff', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}>
          ✨ Insights
        </button>
      </div>

      {/* OVERVIEW ROW */}
      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <div style={glassCardStyle}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Total Simulations</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '5px' }}>27 🔄</div>
        </div>
        <div style={glassCardStyle}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Avg. Profit</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '5px', color: '#4dff88' }}>€620 ▲</div>
        </div>
        <div style={glassCardStyle}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Preferred Strategy</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '5px' }}>Ads 📢</div>
        </div>
        <div style={glassCardStyle}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Success Rate</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '5px' }}>78% 📊</div>
        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* LEFT COLUMN */}
        <div style={glassCardStyle}>
          <h3 style={{ marginBottom: '20px', fontSize: '16px' }}>Recent Simulations</h3>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>Clothing Store - 30 Days <span style={{ fontSize: '10px', background: '#333', padding: '2px 8px', borderRadius: '10px', marginLeft: '10px' }}>Ad Campaign</span></div>
              <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '13px' }}>
                <span>Revenue: <strong>€1,800</strong></span>
                <span>Profit: <strong style={{ color: '#4dff88' }}>+€900 ▲</strong></span>
                <span>Outcome: <span style={{ color: '#4dff88' }}>Positive</span></span>
              </div>
            </div>
            <button style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}>View Report &gt;</button>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={glassCardStyle}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px' }}>Performance Trends</h4>
            <div style={{ height: '100px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}></div>
          </div>
          <div style={glassCardStyle}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px' }}>User Habits</h4>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>• Top Budget: <strong>€500</strong></div>
              <div>• Fav Strategy: <strong>Ads</strong></div>
              <div>• Peak Time: <strong>6 PM</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', paddingTop: '30px' }}>
        <div style={{ background: 'rgba(191, 0, 255, 0.1)', border: '1px solid rgba(191, 0, 255, 0.3)', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
          <span style={{ color: '#bf00ff', fontWeight: 'bold' }}>AI Tip:</span> Your ad campaigns are performing well. Consider increasing the budget next month.
        </div>
      </div>

    </div>
  );
};

export default Memories;