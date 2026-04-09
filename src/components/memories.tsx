import React from 'react';
import React, { useState } from 'react';

const premiumGold = "#FFD700";
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
  // Calculate dynamic insights based on the data array
  const avgEfficiency = data.length > 0 
      ? (data.reduce((acc, curr) => acc + parseFloat(curr.metrics?.efficiency || 0), 0) / data.length) 
      : 0;

  const highRiskCount = data.filter(sim => parseFloat(sim.metrics?.risk) > 20).length;

  // Determine the "Persona" message based on performance
  let malvinAdvice = "Running diagnostic on archived simulations...";
  if (avgEfficiency > 3) {
      malvinAdvice = `Intelligence confirms high-velocity growth. Your ${data.length} archived runs show elite efficiency. Recommendation: Aggressively scale capital allocation.`;
  } else if (avgEfficiency > 0 && avgEfficiency <= 2) {
      malvinAdvice = `Efficiency is lagging at ${avgEfficiency.toFixed(1)}x. Malvin suggests pausing active ad-sets and re-simulating with a focused R&D budget to lower CAC.`;
  } else if (highRiskCount > 1) {
      malvinAdvice = `Warning: ${highRiskCount} simulations show extreme volatility. Your current strategy is vulnerable to market shifts. Pivot to defensive asset management.`;
  }
  
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [selectedSim, setSelectedSim] = useState<MemoryEntry | null>(null);
  const totalSims = data.length;
  return (
    <>
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

          {/* RIGHT COLUMN: NEURAL INSIGHTS ENGINE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '400px' }}>
            <div style={{ 
              ...glassCardStyle, 
              flex: 1, 
              background: 'linear-gradient(165deg, rgba(255,255,255,0.05) 0%, rgba(191, 0, 255, 0.05) 100%)',
              border: '1px solid rgba(191, 0, 255, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Animated Decorative Scanner Line */}
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '2px',
                background: 'linear-gradient(90deg, transparent, #bf00ff, transparent)',
                animation: 'scanLine 4s linear infinite',
                zIndex: 2
              }} />
              <style>{`
                @keyframes scanLine {
                  0% { transform: translateY(-100px); opacity: 0; }
                  50% { opacity: 1; }
                  100% { transform: translateY(600px); opacity: 0; }
                }
              `}</style>

              <div style={{ position: 'relative', zIndex: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#bf00ff', boxShadow: '0 0 10px #bf00ff' }} />
                  <h4 style={{ margin: 0, fontSize: '12px', letterSpacing: '2px', color: '#bf00ff', textTransform: 'uppercase' }}>Neural Analysis Engine</h4>
                </div>

                {/* BIG METRIC: EFFICIENCY GAP */}
                <div style={{ marginBottom: '30px' }}>
                  <span style={{ fontSize: '10px', opacity: 0.5 }}>AGGREGATE GROWTH IMPACT</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <h2 style={{ fontSize: '42px', margin: '5px 0', fontWeight: '800', textShadow: '0 0 20px rgba(191, 0, 255, 0.4)' }}>
                      {data.length > 0 ? (data.reduce((acc, curr) => acc + parseFloat(curr.metrics?.efficiency || 0), 0) / data.length).toFixed(1) : "0.0"}x
                    </h2>
                    <span style={{ color: '#4dff88', fontSize: '14px', fontWeight: 'bold' }}>+14.2% Volatility</span>
                  </div>
                </div>

                {/* MINI INTELLIGENCE GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' }}>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '9px', opacity: 0.5, marginBottom: '4px' }}>SWAN RISK</div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: highRiskCount > 0 ? '#ff4d4d' : '#ffd700', // Turns RED if there's high risk
                      fontWeight: 'bold' 
                    }}>
                      {highRiskCount > 0 ? 'CRITICAL' : 'STABLE'}
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '9px', opacity: 0.5, marginBottom: '4px' }}>CAPITAL BURN</div>
                    <div style={{ fontSize: '14px', color: '#4dff88', fontWeight: 'bold' }}>OPTIMIZED</div>
                  </div>
                </div>

                {/* DYNAMIC ADVICE (THE PERSONA) */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                  <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }}>
                    "{malvinAdvice}"
                  </p>
                </div>

                {/* INTERACTIVE ACTION */}
                <button  onClick={() => setShowRoadmap(true)} style={{
                  marginTop: '25px',
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(90deg, #bf00ff, #7000ff)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(191, 0, 255, 0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  DEPLOY STRATEGY PIVOT
                </button>
              </div>

              {/* Subtle Vector Background Pattern */}
              <div style={{
                position: 'absolute', bottom: '-20px', right: '-20px',
                fontSize: '120px', opacity: 0.03, transform: 'rotate(-15deg)',
                userSelect: 'none', pointerEvents: 'none'
              }}>🧠</div>
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
      {/*H*/}
      {showRoadmap && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(15px)',
          zIndex: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px'
        }}>
          <div style={{ ...glassCardStyle, width: '100%', maxWidth: '600px', border: `1px solid #bf00ff`, position: 'relative' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h2 style={{ color: '#bf00ff', margin: 0, fontSize: '22px', letterSpacing: '2px' }}>NEURAL ROADMAP</h2>
              <p style={{ opacity: 0.5, fontSize: '12px' }}>STRATEGIC PIVOT EXECUTION PLAN</p>
            </div>

            {/* THE STEPPER */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', position: 'relative' }}>
              {/* Vertical Line Connector */}
              <div style={{ position: 'absolute', left: '15px', top: '10px', bottom: '10px', width: '2px', background: 'linear-gradient(to bottom, #bf00ff, transparent)', opacity: 0.3 }} />
                {[
                  { week: "WEEK 1", title: "Budget Sanitization", desc: "Cut underperforming ad sets by 15% and freeze non-essential operational spend.", icon: "✂️" },
                  { week: "WEEK 2", title: "Capital Re-Allocation", desc: `Inject ${data[0]?.currency || '€'}5k into high-intent product testing to lower long-term CAC.`, icon: "🎯" },
                  { week: "WEEK 3", title: "Neural Validation", desc: "Run a 'Clean State' simulation to verify if efficiency has climbed above 3.5x.", icon: "🧠" },
                  { week: "WEEK 4", title: "Full Scale", desc: "Begin 10% weekly budget increments if validation simulation holds steady.", icon: "🚀" }
                ].map((step, index) => (
                  <div key={index} style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 1 }}>
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', background: '#050505', 
                        border: '2px solid #bf00ff', display: 'flex', justifyContent: 'center', 
                        alignItems: 'center', fontSize: '14px', flexShrink: 0, color: '#bf00ff', fontWeight: 'bold'
                      }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#bf00ff', fontWeight: 'bold' }}>{step.week}</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', margin: '4px 0' }}>{step.title} {step.icon}</div>
                        <div style={{ fontSize: '13px', opacity: 0.7, lineHeight: '1.4' }}>{step.desc}</div>
                      </div>
                  </div>
                ))}          
              </div>
            

              <button 
                onClick={() => setShowRoadmap(false)}
                style={{ 
                  width: '100%', marginTop: '40px', padding: '15px', borderRadius: '12px', 
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', 
                  color: 'white', fontWeight: 'bold', cursor: 'pointer' 
                }}
              >
                ACKNOWLEDGE STRATEGY
              </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Memories;