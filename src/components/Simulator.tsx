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

const Simulator = ({ onBack }: { onBack: () => void }) => {
    const [isSimulating, setIsSimulating] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleStart = () => {
        setIsSimulating(true);
        // Quick dummy progress bar animation
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
            width: '100vw',
            height: '100vh',
            backgroundColor: '#050505',
            color: 'white',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            padding: '40px',
            boxSizing: 'border-box',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* BACKGROUND DECOR (iOS GLOW) */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                right: '-10%',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15), transparent 70%)',
                filter: 'blur(80px)',
                zIndex: 0
            }} />

            {/* HEADER */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <button 
                    onClick={onBack}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    ← CLOSE
                </button>
                <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Scenario Architect</h2>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.5 }}>v2.4.0 Engine Active</p>
                </div>
            </div>

            {/* MAIN GRID */}
            <div style={{ 
                position: 'relative', 
                zIndex: 1, 
                display: 'grid', 
                gridTemplateColumns: '1fr 350px', 
                gap: '24px', 
                flex: 1 
            }}>
                
                {/* LEFT: SIMULATION VIEWPORT */}
                <div style={{ 
                    ...glassStyle, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    border: '1px solid rgba(14, 165, 233, 0.2)' 
                }}>
                    {!isSimulating && progress === 0 ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '50px', marginBottom: '20px' }}>🌐</div>
                            <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>Ready to Project</h3>
                            <p style={{ opacity: 0.6, maxWidth: '300px' }}>Configure your parameters on the right to start the neural simulation.</p>
                        </div>
                    ) : (
                        <div style={{ width: '80%', textAlign: 'center' }}>
                            <h3 style={{ marginBottom: '20px', letterSpacing: '2px' }}>
                                {progress < 100 ? 'GENERATING REALITY...' : 'SIMULATION COMPLETE'}
                            </h3>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ 
                                    width: `${progress}%`, 
                                    height: '100%', 
                                    background: 'linear-gradient(90deg, #2dd4bf, #0ea5e9)', 
                                    transition: 'width 0.1s linear',
                                    boxShadow: '0 0 15px rgba(14, 165, 233, 0.5)'
                                }} />
                            </div>
                            <p style={{ marginTop: '15px', fontSize: '12px', opacity: 0.5 }}>{progress}% Synchronized</p>
                        </div>
                    )}
                </div>

                {/* RIGHT: CONTROLS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={glassStyle}>
                        <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#0ea5e9' }}>PARAMETERS</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '11px', opacity: 0.5, display: 'block', marginBottom: '8px' }}>RISK TOLERANCE</label>
                                <input type="range" style={{ width: '100%', accentColor: '#0ea5e9' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', opacity: 0.5, display: 'block', marginBottom: '8px' }}>TIMELINE</label>
                                <select style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '8px' }}>
                                    <option>30 Days</option>
                                    <option>90 Days</option>
                                    <option>1 Year</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleStart}
                        disabled={isSimulating}
                        style={{
                            padding: '20px',
                            borderRadius: '24px',
                            border: 'none',
                            background: isSimulating ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #2dd4bf, #0ea5e9)',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            cursor: isSimulating ? 'not-allowed' : 'pointer',
                            boxShadow: isSimulating ? 'none' : '0 10px 30px rgba(14, 165, 233, 0.3)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {isSimulating ? 'RUNNING...' : 'EXECUTE SIMULATION'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Simulator;