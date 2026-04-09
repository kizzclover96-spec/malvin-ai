import React from 'react';
import React, { useState } from 'react';

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

interface MemoryEntry {
  id: string;
  date: string;
  type: string;
  title: string;
  details: string;
  metrics: {
    efficiency: string;
    risk: string;
  };
}

const Memories = ({ onBack, data = [] }: { onBack: () => void, data?: MemoryEntry[]}) => {
  const [selectedSim, setSelectedSim] = useState<MemoryEntry | null>(null);
  const totalSims = data.length;
  return (
    <div style={{ 
      position: 'relative',
      padding: '30px', 
      height: '100vh', // Changed from minHeight to prevent overflow
      width: '100vw',
      boxSizing: 'border-box', // Ensures padding doesn't add to width/height
      fontFamily: 'sans-serif', 
      backgroundColor: '#0a0a0c', 
      color: 'white',
      display: 'flex',
      flexDirection: 'column', 
      overflow: 'hidden'
    }}>
      
      <AuraBackground />
       
      {/* HEADER SECTION */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        {/* BACK BUTTON: Now matches Insights size/style */}
        <button 
            onClick={onBack} 
            style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid rgba(255,255,255,0.2)', 
                color: 'white', 
                padding: '8px 16px', 
                borderRadius: '20px', 
                fontSize: '12px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
            }}
        >
          ← BACK TO MAIN
        </button>

        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '22px' }}>
          <span>🧠</span> Memories
        </h1>

        <button style={{ background: 'rgba(191, 0, 255, 0.2)', border: '1px solid #bf00ff', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}>
          ✨ Insights
        </button>
      </div>

      {/* OVERVIEW ROW */}
      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' }}>
        <div style={{ ...glassCardStyle, padding: '15px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Total Simulations</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>{totalSims} 🔄</div>
        </div>
        <div style={{ ...glassCardStyle, padding: '15px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Avg. Profit</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '5px', color: '#4dff88' }}>€620 ▲</div>
        </div>
        <div style={{ ...glassCardStyle, padding: '15px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Preferred Strategy</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>Ads 📢</div>
        </div>
        <div style={{ ...glassCardStyle, padding: '15px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Success Rate</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>78% 📊</div>
        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', flex: 1, overflow: 'hidden' }}>
        {/* LEFT COLUMN: THE LIST */}
        <div style={{ ...glassCardStyle, overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '15px', opacity: 0.8 }}>Recent Simulations</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.length > 0 ? (
              data.map((memory) => (
                <div key={memory.id} style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  padding: '15px', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  border: '1px solid rgba(255,255,255,0.05)' 
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      {memory.title || "Untitled Simulation"}
                      <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px', marginLeft: '10px', color: '#bf00ff' }}>
                        {memory.date}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '12px', opacity: 0.8 }}>
                      <span>Outcome: <strong>{memory.metrics?.efficiency || 'N/A'}</strong></span>
                      <span>Risk: <strong style={{ color: '#ffd700' }}>{memory.metrics?.risk || 'N/A'}</strong></span>
                    </div>
                  </div>
                  
                  <button onClick={() => setSelectedSim(memory)} style={{ 
                    background: 'rgba(191, 0, 255, 0.1)', 
                    border: '1px solid #bf00ff', 
                    color: 'white', 
                    padding: '6px 14px', 
                    borderRadius: '25px', 
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}>
                    View Details &gt;
                  </button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', opacity: 0.4 }}>
                No Business data archived yet. Run a simulation to begin.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ ...glassCardStyle, flex: 1 }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Performance Trends</h4>
            <div style={{ height: '80px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}></div>
          </div>
          <div style={{ ...glassCardStyle, flex: 1 }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>User Habits</h4>
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>• Top Budget: <strong>€500</strong></div>
              <div>• Fav Strategy: <strong>Ads</strong></div>
              <div>• Peak Time: <strong>6 PM</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: '20px' }}>
        <div style={{ background: 'rgba(191, 0, 255, 0.05)', border: '1px solid rgba(191, 0, 255, 0.2)', padding: '12px', borderRadius: '12px', textAlign: 'center', fontSize: '13px' }}>
          <span style={{ color: '#bf00ff', fontWeight: 'bold' }}>AI Tip:</span> Your ad campaigns are performing well. Consider increasing the budget next month.
        </div>
      </div>
      {/* --- NEW MODAL LOGIC --- */}
      {selectedSim && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(5, 5, 5, 0.8)', backdropFilter: 'blur(10px)',
          zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px'
        }}>
          <div style={{ ...glassCardStyle, width: '100%', maxWidth: '800px', border: `1px solid ${premiumGold}`, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
              <div>
                <h2 style={{ color: premiumGold, margin: 0, fontSize: '24px' }}>SIMULATION INTELLIGENCE</h2>
                <p style={{ opacity: 0.5, fontSize: '12px' }}>ARCHIVED DATA • ID: #{selectedSim.id}</p>
              </div>
              <button onClick={() => setSelectedSim(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* FACT CARD - Uses data from the selected memory */}
              <div style={{ background: 'rgba(45, 212, 191, 0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(45, 212, 191, 0.2)' }}>
                <span style={{ fontSize: '10px', color: '#2dd4bf', fontWeight: 'bold' }}>PROJECTION FACT</span>
                <p style={{ fontSize: '14px', margin: '10px 0 0 0' }}>
                   {selectedSim.title}: Achieved **{selectedSim.metrics.efficiency}** in recent run.
                </p>
              </div>

              {/* WARNING CARD */}
              <div style={{ background: 'rgba(255, 215, 0, 0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                <span style={{ fontSize: '10px', color: premiumGold, fontWeight: 'bold' }}>SYSTEM WARNING</span>
                <p style={{ fontSize: '14px', margin: '10px 0 0 0' }}>
                   Risk Analysis: **{selectedSim.metrics.risk}** detected for this specific context.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '30px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', opacity: 0.6 }}>NEURAL NOTICE</h4>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'rgba(255,255,255,0.8)' }}>
                {selectedSim.details}
              </p>
            </div>

            <button 
              onClick={() => setSelectedSim(null)}
              style={{ width: '100%', marginTop: '30px', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'white', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}
            >
              CLOSE ARCHIVE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Memories;