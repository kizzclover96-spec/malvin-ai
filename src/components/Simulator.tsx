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
    const [budget, setBudget] = useState(50);
    const [strategy, setStrategy] = useState('Ads');
    const [bizType, setBizType] = useState('Clothing Brand');
    const [otherBiz, setOtherBiz] = useState('');

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
            padding: '24px 40px',
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
            <div style={{ flexShrink: 0, position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: 'auto' }}>
                <p style={{ color: 'white', fontSize: '20px' justifycontent: 'center' }}>Run a preview of the future</p>
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
                minHeight: 0,
                display: 'grid',
                position: 'relative', 
                zIndex: 1, 
                display: 'grid', 
                gridTemplateColumns: '1fr 340px', 
                gap: '20px', 
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
                        <h4 style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#0ea5e9', letterSpacing: '1px' }}>
                            SYSTEM PARAMETERS
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            
                            {/* LOCATION */}
                            <div>
                                <label style={{ fontSize: '10px', opacity: 0.5, display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>LOCATION (COUNTRY, CITY)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. USA, New York"
                                    style={{ 
                                        width: '100%', 
                                        background: 'rgba(255,255,255,0.05)', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        color: 'white', 
                                        padding: '12px', 
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }} 
                                />
                            </div>
                            {/* BUSINESS TYPE */}
                            <div>
                                <label style={{ fontSize: '10px', opacity: 0.5, display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>BUSINESS TYPE</label>
                                <select 
                                    value={bizType}
                                    onChange={(e) => setBizType(e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        background: 'rgba(255,255,255,0.05)', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        color: 'white', 
                                        padding: '12px', 
                                        borderRadius: '12px',
                                        fontSize: '13px'
                                    }}
                                >
                                    <option>Clothing Brand</option>
                                    <option>Restaurant</option>
                                    <option>Tech Startup</option>
                                    <option value="Other">Other (Specify below)</option>
                                </select>
                                
                                {/* CONDITIONAL "OTHER" INPUT */}
                                {bizType === 'Other' && (
                                    <input 
                                        type="text" 
                                        placeholder="Specify business type..."
                                        value={otherBiz}
                                        onChange={(e) => setOtherBiz(e.target.value)}
                                        style={{ 
                                            width: '100%', 
                                            background: 'rgba(255,255,255,0.08)', 
                                            border: '1px solid #0ea5e9', 
                                            color: 'white', 
                                            padding: '12px', 
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            marginTop: '10px',
                                            outline: 'none'
                                        }} 
                                    />
                                )}
                            </div>

                            {/* BUDGET */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '10px', opacity: 0.5, fontWeight: 'bold' }}>BUDGET RANGE</label>
                                    <span style={{ fontSize: '12px', color: '#2dd4bf', fontWeight: 'bold' }}>
                                        €50 — €{budget}
                                    </span>
                                </div>
                                <input 
                                    type="range" 
                                    min="50" 
                                    max="1000" 
                                    step="10"
                                    value={budget}
                                    onChange={(e) => setBudget(parseInt(e.target.value))}
                                    style={{ 
                                        width: '100%', 
                                        height: '4px',
                                        borderRadius: '5px',
                                        appearance: 'none',
                                        background: 'rgba(255,255,255,0.1)',
                                        outline: 'none',
                                        accentColor: '#0ea5e9',
                                        cursor: 'pointer'
                                    }} 
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', opacity: 0.3, fontSize: '9px' }}>
                                    <span>MIN: €50</span>
                                    <span>MAX: €1000+</span>
                                </div>
                            </div>
                            {/* PRIMARY STRATEGY */}
                            <div>
                                <label style={{ fontSize: '10px', opacity: 0.5, display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>PRIMARY STRATEGY</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {['Ads', 'Organic', 'Influencer', 'Email'].map((opt) => (
                                        <button 
                                            key={opt}
                                            onClick={() => setStrategy(opt)}
                                            style={{ 
                                                padding: '10px', 
                                                background: strategy === opt ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255,255,255,0.05)', 
                                                border: strategy === opt ? '1px solid #0ea5e9' : '1px solid rgba(255,255,255,0.1)', 
                                                borderRadius: '12px', 
                                                color: strategy === opt ? '#0ea5e9' : 'white', 
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {opt === 'Ads' ? '📢 Ads' : 
                                            opt === 'Organic' ? '🌿 Organic' : 
                                            opt === 'Influencer' ? '🤳 Creator' : '📧 Email'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* TIME HORIZON */}
                            <div>
                                <label style={{ fontSize: '10px', opacity: 0.5, display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>SIMULATION SPAN</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {['30D', '90D', '1Y'].map((period) => (
                                        <button 
                                            key={period}
                                            style={{ 
                                                flex: 1, 
                                                padding: '8px', 
                                                background: 'rgba(255,255,255,0.05)', 
                                                border: '1px solid rgba(255,255,255,0.1)', 
                                                borderRadius: '8px', 
                                                color: 'white', 
                                                fontSize: '11px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {period}
                                        </button>
                                    ))}
                                </div>
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