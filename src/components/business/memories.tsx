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

const Memories = ({ onBack }: any) => {
  const [showRoadmap, setShowRoadmap] = useState(false);

  return (
    <>
      <style>{responsiveStyles}</style>

      <div className="memories-container" style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#050505',
        color: 'white',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        padding: '40px 20px'
      }}>
        <AuraBackground />

        {/* --- COMING SOON OVERLAY --- */}
        <div className="coming-soon-overlay">
          <div className="coming-soon-card">
            <div className="status-pill">NEURAL MODULE // IN_DEVELOPMENT</div>
            <h1 className="overlay-title">COMING SOON</h1>
            <p className="overlay-description">
              The <strong>Memories Core</strong> is currently undergoing neural synthesis and pattern mapping. Check back soon for full integration.
            </p>
            <button className="overlay-back-btn" onClick={onBack}>
              Return to Dashboard
            </button>
          </div>
        </div>

        {/* --- BACKGROUND CONTENT (BLURRED BY OVERLAY) --- */}
        <div style={{ filter: 'blur(10px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>
          <div className="memories-header">
            <div>
              <span style={{ fontSize: '12px', color: '#bf00ff', fontWeight: 'bold', letterSpacing: '2px' }}>
                SYSTEM MEMORY & PATTERNS
              </span>
              <h1 className="memories-title" style={{ fontSize: '36px', margin: '4px 0 0 0', fontWeight: '800' }}>
                Neural Memory Core
              </h1>
            </div>
            
            <button 
              onClick={() => setShowRoadmap(true)}
              style={{
                background: 'rgba(191, 0, 255, 0.15)',
                border: '1px solid #bf00ff',
                color: '#bf00ff',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                backdropFilter: 'blur(10px)'
              }}
            >
              🗺️ VIEW ARCHITECT ROADMAP
            </button>
          </div>

          <div className="memories-grid">
            <div style={{ ...glassCardStyle }}>
              <span style={{ fontSize: '24px' }}>⚡</span>
              <h3 style={{ margin: '12px 0 6px 0' }}>Real-time Pattern Learning</h3>
              <p style={{ opacity: 0.6, fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                Continuously analyzes campaign metrics and business outputs to adapt recommendation models.
              </p>
            </div>

            <div style={{ ...glassCardStyle }}>
              <span style={{ fontSize: '24px' }}>🛡️</span>
              <h3 style={{ margin: '12px 0 6px 0' }}>Encrypted Vault</h3>
              <p style={{ opacity: 0.6, fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                All strategic decision parameters are permanently stored in your private neural cloud.
              </p>
            </div>
          </div>
        </div>

        {/* ROADMAP MODAL */}
        {showRoadmap && (
          <div className="roadmap-overlay">
            <div className="roadmap-modal">
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>ARCHITECT ROADMAP</h2>
              <p style={{ opacity: 0.6, fontSize: '13px', marginBottom: '24px' }}>
                Milestones for system pattern generation and intelligence synthesis.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { week: "PHASE 01", title: "Data Harvesting", icon: "📡", desc: "Gathering historical transaction patterns and user inputs." },
                  { week: "PHASE 02", title: "Neural Weighting", icon: "🧠", desc: "Setting up predictive algorithm paths for auto-campaign optimizations." },
                  { week: "PHASE 03", title: "Autonomous Actions", icon: "🚀", desc: "Full engine activation allowing self-correcting strategy loops." }
                ].map((step, index) => (
                  <div key={index} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
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
                  width: '100%', marginTop: '30px', padding: '15px', borderRadius: '12px', 
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', 
                  color: 'white', fontWeight: 'bold', cursor: 'pointer' 
                }}
              >
                ACKNOWLEDGE STRATEGY
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// --- RESPONSIVE CSS & OVERLAY STYLES ---
const responsiveStyles = `
  /* OVERLAY STYLES */
  .coming-soon-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .coming-soon-card {
    background: rgba(20, 20, 20, 0.75);
    border: 1px solid rgba(191, 0, 255, 0.3);
    box-shadow: 0 0 50px rgba(191, 0, 255, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.05);
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
    background: rgba(191, 0, 255, 0.15);
    border: 1px solid rgba(191, 0, 255, 0.4);
    color: #bf00ff;
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
    letter-spacing: 1px;
    background: linear-gradient(135deg, #ffffff 0%, #a8a8a8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .overlay-description {
    font-size: 14px;
    opacity: 0.7;
    line-height: 1.6;
    margin-bottom: 30px;
    color: #e0e0e0;
  }

  .overlay-back-btn {
    width: 100%;
    background: #bf00ff;
    color: white;
    border: none;
    padding: 16px;
    border-radius: 14px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(191, 0, 255, 0.4);
    transition: transform 0.2s ease, opacity 0.2s ease;
  }

  .overlay-back-btn:active {
    transform: scale(0.98);
  }

  /* LAYOUT & RESPONSIVE GRID */
  .memories-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 40px;
  }

  .memories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
  }

  .roadmap-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .roadmap-modal {
    background: rgba(20, 20, 20, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 30px;
    border-radius: 24px;
    max-width: 500px;
    width: 100%;
    box-sizing: border-box;
  }

  @media (max-width: 768px) {
    .memories-container {
      padding: 20px 15px !important;
    }

    .memories-header {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 20px !important;
    }

    .memories-title {
      font-size: 28px !important;
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

    .roadmap-modal {
      padding: 20px !important;
      border-radius: 20px !important;
    }
  }
`;

export default Memories;