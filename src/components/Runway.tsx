import React, { useState } from 'react';

const glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(14px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
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

const Runway = ({ userBrand }) => {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('malvin_runway_data');
    return saved ? JSON.parse(saved) : { cash: 50000, burn: 5000, revenue: 1200 };
  });

  const netBurn = data.burn - data.revenue;
  
  // 1. Calculate the raw number for logic
  const rawRunway = netBurn > 0 ? data.cash / netBurn : Infinity;

  // 2. Format the string for display
  const displayValue = rawRunway === Infinity 
    ? "∞" 
    : rawRunway < 1 ? rawRunway.toFixed(2) : rawRunway.toFixed(1);

  // 3. Determine if it's critical (less than 6 months and not infinite)
  const isCritical = rawRunway < 6;

  const handleInput = (key, val) => {
    const newValue = { ...data, [key]: Number(val) };
    setData(newValue);
    localStorage.setItem('malvin_runway_data', JSON.stringify(newValue));
  };

  const TerminalInput = ({ label, value, onChange, color }) => (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ fontSize: '11px', color, marginBottom: '6px', opacity: 0.7 }}>
        {label}
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '10px',
          border: `1px solid ${color}33`,
          background: 'rgba(255,255,255,0.05)',
          color: 'white',
          fontSize: '15px',
          outline: 'none',
          transition: '0.2s'
        }}
        onFocus={(e) => e.target.style.boxShadow = `0 0 10px ${color}`}
        onBlur={(e) => e.target.style.boxShadow = 'none'}
      />
    </div>
  );

  return (
    
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1.5fr',
      gap: '25px',
      animation: 'fadeIn 0.5s ease'
      position: 'relative',
      padding: '30px', 
      height: '100vh', // Changed from minHeight to prevent overflow
      width: '100vw',
      boxSizing: 'border-box', // Ensures padding doesn't add to width/height
      fontFamily: 'sans-serif', 
      backgroundColor: '#0a0a0c', 
      color: 'white',
      flexDirection: 'column', 
      overflow: 'hidden'
    }}>
      <AuraBackground />
      {/* LEFT PANEL */}
      <div style={{ ...glass }}>
        <h3 style={{ color: '#60a5fa', marginBottom: '20px' }}>
          Financial Inputs
        </h3>

        <TerminalInput
          label="Cash Available"
          value={data.cash}
          onChange={(v) => handleInput('cash', v)}
          color="#60a5fa"
        />

        <TerminalInput
          label="Monthly Burn"
          value={data.burn}
          onChange={(v) => handleInput('burn', v)}
          color="#ef4444"
        />

        <TerminalInput
          label="Monthly Revenue"
          value={data.revenue}
          onChange={(v) => handleInput('revenue', v)}
          color="#22c55e"
        />
      </div>

      {/* RIGHT PANEL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* RUNWAY DISPLAY */}
        <div style={{
          ...glass,
          textAlign: 'center',
          border: isCritical ? '1px solid #ef4444' : '1px solid #22c55e',
          boxShadow: isCritical
            ? '0 0 25px rgba(239,68,68,0.2)'
            : '0 0 25px rgba(34,197,94,0.2)'
        }}>
          <div style={{ opacity: 0.6, fontSize: '12px' }}>
            Runway Remaining
          </div>

          <div style={{
            fontSize: '80px',
            fontWeight: 'bold',
            color: isCritical ? '#ef4444' : '#22c55e',
            textShadow: displayValue === "∞" 
                ? '0 0 40px rgba(34, 197, 94, 0.8)' 
                : `0 0 20px ${isCritical ? '#ef4444' : '#22c55e'}`,
            }}>
            {displayValue}
          </div>

          <div style={{ letterSpacing: '3px', fontSize: '14px' }}>
            MONTHS
          </div>
        </div>

        {/* AI INSIGHT */}
        <div style={{ ...glass }}>
          <h4 style={{ color: '#facc15', marginBottom: '10px' }}>
            AI Insight
          </h4>

          {netBurn > 0 ? (
            <p style={{ fontSize: '13px', opacity: 0.8 }}>
              You are burning more than you earn. At this rate, your business has
              <strong> {displayValue} months</strong> left. Consider reducing expenses or
              increasing revenue immediately.
            </p>
          ) : (
            <p style={{ fontSize: '13px', opacity: 0.8 }}>
              Your business is profitable. You are extending your runway and
              building financial stability. Keep scaling.
            </p>
          )}
        </div>

        {/* ACTIONS */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ ...glass, cursor: 'pointer', flex: 1 }}>
            Reduce Burn
          </button>
          <button style={{ ...glass, cursor: 'pointer', flex: 1 }}>
            Increase Revenue
          </button>
        </div>
        <p> Disclaimer: These calculations are projections based on provided data and do not account for market volatility or unforeseen operational changes. Consult with a financial professional for official planning.
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
    </div>
  );
};

export default Runway;
