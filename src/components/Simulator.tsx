import React, { useState } from 'react';

const glassStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(15px)',
    WebkitBackdropFilter: 'blur(15px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '20px',
    color: 'white'
};

const premiumGold = "#FFD700";

const Simulator = ({ onBack }: { onBack: () => void }) => {
    const [isSimulating, setIsSimulating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [budget, setBudget] = useState(50);
    
    // NEW: Selection State
    const [selectedSims, setSelectedSims] = useState<string[]>(['Price']);

    const simulations = [
        { id: 'Price', label: 'Price Elasticity', icon: '🏷️', color: '#2dd4bf' },
        { id: 'Ads', label: 'Ad Scale Burn', icon: '📢', color: '#0ea5e9' },
        { id: 'Supply', label: 'Supply Chain Stress', icon: '📦', color: '#a855f7' },
        { id: 'Swan', label: 'Black Swan Event', icon: '☄️', color: premiumGold },
    ];

    const toggleSim = (id: string) => {
        setSelectedSims(prev => 
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleStart = () => {
        if (selectedSims.length === 0) return alert("Select at least one simulation module.");
        setIsSimulating(true);
        let val = 0;
        const interval = setInterval(() => {
            val += 2;
            setProgress(val);
            if (val >= 100) {
                clearInterval(interval);
                setIsSimulating(false);
            }
        }, 50);
    };

    return (
        <div style={{
            width: '100vw', height: '100vh', backgroundColor: '#050505', color: 'white',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex', flexDirection: 'column', padding: '24px 40px', boxSizing: 'border-box',
            overflow: 'hidden', position: 'relative'
        }}>
            {/* BACKGROUND DECOR */}
            <div style={{
                position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px',
                background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15), transparent 70%)',
                filter: 'blur(80px)', zIndex: 0
            }} />

            {/* HEADER */}
            <div style={{ flexShrink: 0, zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer' }}>
                    ← CLOSE
                </button>
                <p style={{ fontSize: '24px', fontWeight: '800', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '2px' }}>
                    Neural Projection Lab
                </p>
                <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', color: premiumGold }}>Malvin Enterprise</h2>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.5 }}>Simulation Engine v2.4</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', flex: 1, minHeight: 0 }}>
                
                {/* LEFT: VIEWPORT */}
                <div style={{ ...glassStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: `1px solid ${isSimulating ? '#0ea5e9' : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.5s ease' }}>
                    {!isSimulating && progress === 0 ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '60px', marginBottom: '20px', filter: 'drop-shadow(0 0 20px rgba(14, 165, 233, 0.4))' }}>🧠</div>
                            <h3 style={{ fontSize: '28px', marginBottom: '10px' }}>Select Neural Modules</h3>
                            <p style={{ opacity: 0.4 }}>{selectedSims.length} modules armed and ready.</p>
                        </div>
                    ) : (
                        <div style={{ width: '80%', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
                                {selectedSims.map(id => (
                                    <div key={id} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '12px' }}>
                                        {simulations.find(s => s.id === id)?.label}
                                    </div>
                                ))}
                            </div>
                            <h3 style={{ marginBottom: '20px', letterSpacing: '4px', color: progress === 100 ? '#2dd4bf' : 'white' }}>
                                {progress < 100 ? 'ANALYZING TIMELINES...' : 'PROJECTION STABLE'}
                            </h3>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, #0ea5e9, ${premiumGold})`, transition: 'width 0.1s linear', boxShadow: '0 0 20px rgba(14, 165, 233, 0.5)' }} />
                            </div>
                            <p style={{ marginTop: '20px', fontFamily: 'monospace', opacity: 0.6 }}>SYNC_RATIO: {progress}%</p>
                        </div>
                    )}
                </div>

                {/* RIGHT: CONFIGURATION */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                    <div style={glassStyle}>
                        <h4 style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#0ea5e9', letterSpacing: '1px' }}>ACTIVE SIMULATIONS</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {simulations.map((sim) => (
                                <button
                                    key={sim.id}
                                    onClick={() => toggleSim(sim.id)}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                        padding: '15px 10px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s ease',
                                        background: selectedSims.includes(sim.id) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                                        border: selectedSims.includes(sim.id) ? `1px solid ${sim.color}` : '1px solid rgba(255,255,255,0.05)',
                                        color: selectedSims.includes(sim.id) ? 'white' : 'rgba(255,255,255,0.4)',
                                    }}
                                >
                                    <span style={{ fontSize: '20px' }}>{sim.icon}</span>
                                    <span style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center' }}>{sim.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={glassStyle}>
                        <h4 style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#0ea5e9', letterSpacing: '1px' }}>GLOBAL CONTEXT</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '10px', opacity: 0.5, display: 'block', marginBottom: '8px' }}>BUDGET IMPACT (k€)</label>
                                <input type="range" min="10" max="500" value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ width: '100%', accentColor: '#0ea5e9' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '12px', color: '#2dd4bf' }}>
                                    <span>Min</span><span>€{budget}k</span>
                                </div>
                            </div>
                            
                            <div>
                                <label style={{ fontSize: '10px', opacity: 0.5, display: 'block', marginBottom: '8px' }}>TIME HORIZON</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['Q1', 'Q2', 'Q4', '5Y'].map(t => (
                                        <div key={t} style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', fontSize: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>{t}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleStart}
                        disabled={isSimulating || selectedSims.length === 0}
                        style={{
                            padding: '24px', borderRadius: '24px', border: 'none',
                            background: isSimulating ? 'rgba(255,255,255,0.05)' : (selectedSims.length > 0 ? 'linear-gradient(135deg, #0ea5e9, #a855f7)' : '#222'),
                            color: 'white', fontWeight: '800', fontSize: '14px', letterSpacing: '2px',
                            cursor: isSimulating ? 'not-allowed' : 'pointer',
                            boxShadow: isSimulating ? 'none' : '0 10px 40px rgba(14, 165, 233, 0.3)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {isSimulating ? `PROCESSING ${progress}%` : `RUN ${selectedSims.length} SCENARIOS`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Simulator;