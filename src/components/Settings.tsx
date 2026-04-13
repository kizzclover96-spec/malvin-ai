import React, { useState, useRef, useEffect } from 'react';

const premiumGold = "#FFD700";
const glassStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '24px',
    color: 'white',
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


<style>
{`
    .pulse-dot {
        box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.7);
        animation: pulse 2s infinite;
    }
    @keyframes pulse {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.7); }
        70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(45, 212, 191, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(45, 212, 191, 0); }
    }
`}
</style>

const Settings = ({ onBack, onSave, userBrand, setUserBrand, onUpdate }: any) => {
    const [tempName, setTempName] = useState(userBrand.name);
    const [tempBrand, setTempBrand] = useState(userBrand);
    const [name, setName] = useState('');
    const [activeTab, setActiveTab] = useState('Business');
    const fileInputRef = useRef<HTMLInputElement>(null); // Create the reference
    const handleSaveSettings = (newName) => {
     setUserBrand({ name: newName, id: newName.toLowerCase().replace(/\s+/g, '-') });
    };
    const saveSettings = async () => {
        // 1. Save to Database
        const brandRef = ref(db, `users/${userBrand.id}/brandData`);
        await set(brandRef, { ...userBrand, name: tempName });

        // 2. Update the Parent (Malvinui) immediately!
        onUpdate({ name: tempName });
        
        alert("Settings Saved!");
    };
    useEffect(() => {
        localStorage.setItem('neural_user_brand', JSON.stringify(userBrand));
    }, [userBrand]);
    const menuItems = [
        { id: 'Account', icon: '👤' },
        { id: 'AI Behavior', icon: '🧠' },
        { id: 'Business', icon: '💼' },
        { id: 'Notifications', icon: '🔔' },
        { id: 'Team', icon: '👥' },
        { id: 'About us' },
    ];

    
    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: '#050505',
            color: 'white',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            display: 'flex',
            overflow: 'hidden',
            
        }}>
            <AuraBackground />
            {/* LEFT SIDEBAR */}
            <div style={{
                width: '260px',
                borderRight: '1px solid rgba(255,255,255,0.1)',
                padding: '24px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                position: 'relative',
                zIndex: 1
            }}>
                <div style={{ padding: '0 12px 24px 12px', fontSize: '12px', fontWeight: 600, opacity: 0.4, letterSpacing: '1px' }}>
                    SETTINGS
                </div>
                
                {menuItems.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: '0.2s',
                            backgroundColor: activeTab === item.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                            color: activeTab === item.id ? 'white' : 'rgba(255,255,255,0.5)'
                        }}
                    >
                        <span>{item.icon}</span> {item.id}
                    </div>
                ))}

                <button 
                    onClick={onBack}
                    style={{ marginTop: 'auto', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                >
                    ← Back to session
                </button>
            </div>

            {/* RIGHT SIDE PANEL */}
            <div style={{ flex: 1, padding: '60px 100px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: '600px' }}>

                    {activeTab === 'Account' && (
                        <section>
                            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>Account Settings</h1>
                            <p style={{ opacity: 0.5, marginBottom: '40px' }}>Manage your personal profile and subscription status.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                
                                {/* PROFILE SECTION */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                    <div style={{ 
                                        width: '80px', 
                                        height: '80px', 
                                        borderRadius: '50%', 
                                        backgroundImage: userBrand.profilePic ? `url(${userBrand.profilePic})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundColor: '#111', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '30px',
                                        overflow: 'hidden'
                                    }}>
                                        {!userBrand.profilePic && '👤'}
                                    </div>
                                    
                                    <div>
                                        {/* Hidden File Input */}
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            id="photo-upload" 
                                            style={{ display: 'none' }} 
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        // This updates the global state we passed from App.tsx
                                                        setUserBrand({ ...userBrand, profilePic: event.target?.result });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                        <button 
                                            onClick={() => fileInputRef.current?.click()} // Trigger the hidden input
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            Change Photo
                                        </button>
                                    </div>
                                </div>
                                {/* USER DETAILS */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Username</label>
                                        <input 
                                            type="text" 
                                            placeholder="Neural_Founder"
                                            style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px', color: 'white' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>User Status</label>
                                        <select style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px', color: 'white' }}>
                                            <option>CEO / Founder</option>
                                            <option>Partnership</option>
                                            <option>Operational Lead</option>
                                        </select>
                                    </div>
                                </div>

                                {/* SUBSCRIPTION TIER */}
                                <div style={{ 
                                    padding: '24px', 
                                    borderRadius: '16px', 
                                    background: 'rgba(14, 165, 233, 0.03)', 
                                    border: '1px solid rgba(14, 165, 233, 0.15)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#0ea5e9', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '4px' }}>CURRENT PLAN</div>
                                        <div style={{ fontSize: '18px', fontWeight: 700 }}>Basic Free Tier</div>
                                        <div style={{ fontSize: '13px', opacity: 0.5, marginTop: '4px' }}>Limited to 3 daily neural simulations.</div>
                                    </div>
                                    <button style={{ 
                                        background: premiumGold, 
                                        color: 'white', 
                                        border: 'none', 
                                        padding: '10px 20px', 
                                        borderRadius: '10px', 
                                        fontWeight: 'bold', 
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)', // Subtle gold glow
                                        transition: 'transform 0.2s ease' 
                                    }} 
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        Upgrade to Premium
                                    </button>
                                </div>

                                {/* LANGUAGE */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>System Language</label>
                                    <select style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px', color: 'white' }}>
                                        <option>English (US)</option>
                                        <option>Spanish</option>
                                        <option>French</option>
                                        <option>German</option>
                                    </select>
                                </div>

                            </div>
                        </section>
                    )}
                    
                    {/* DYNAMIC CONTENT BASED ON TAB */}
                    {activeTab === 'Business' && (
                        <section>
                            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>Business Configuration</h1>
                            <p style={{ opacity: 0.5, marginBottom: '40px' }}>Define your brand's core DNA for the simulation engine.</p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                {/* BRAND NAME */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Brand Name</label>
                                    <input 
                                        value={userBrand?.name || ''}
                                        onChange={(e) => setUserBrand({...userBrand, name: e.target.value})}
                                        style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px', color: 'white', outline: 'none' }} 
                                        placeholder="e.g. Malvin Studio"
                                    />
                                    <button onClick={handleSaveSettings}>Save Brand</button>
                                </div>
                                {/* BRAND CATEGORY (This is the "Search" anchor) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Industry / Category</label>
                                    <select 
                                        value={userBrand?.category || "Fashion"} // Default to Fashion
                                        onChange={(e) => setUserBrand({...userBrand, category: e.target.value})}
                                        style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px', color: 'grey', outline: 'none' }}
                                    >
                                        <option value="Fashion">Fashion & Apparel</option>
                                        <option value="Tech">Technology & SaaS</option>
                                        <option value="E-commerce">General E-commerce</option>
                                        <option value="Sustainability">Green / Sustainable Business</option>
                                        <option value="Fintech">Financial Technology</option>
                                    </select>
                                    <p style={{ fontSize: '11px', opacity: 0.4, marginTop: '8px' }}>This determines the news and trends injected into your dashboard.</p>
                                </div>

                                {/* NEW: STRATEGIC CONTEXT (The AI's "Brain" path) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Strategic Context & Brand DNA</label>
                                    <p style={{ fontSize: '11px', opacity: 0.4, marginBottom: '12px' }}>Explain your business model, goals, and voice. The AI uses this to filter all research and simulations.</p>
                                    <textarea 
                                        value={userBrand?.context}
                                        onChange={(e) => setUserBrand({...userBrand, context: e.target.value})}
                                        placeholder="e.g. We are a high-end sustainable streetwear brand focusing on Gen Z in London. We value scarcity over volume. Always prioritize organic growth over aggressive paid ads..."
                                        style={{ 
                                            width: '100%', 
                                            height: '150px', 
                                            background: 'rgba(255,255,255,0.02)', 
                                            border: '1px solid rgba(255,255,255,0.2)', 
                                            padding: '14px', 
                                            borderRadius: '12px', 
                                            color: 'white', 
                                            outline: 'none',
                                            resize: 'none',
                                            fontSize: '13px',
                                            lineHeight: '1.6',
                                            fontFamily: 'inherit'
                                        }} 
                                    />
                                </div>

                                {/* AOV */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Avg. Order Value (AOV)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>€</span>
                                        <input 
                                            type="number" 
                                            placeholder="50" 
                                            style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 12px 12px 30px', borderRadius: '8px', color: 'white' }} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'AI Behavior' && (
                        <section>
                            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>AI Behavior</h1>
                            <p style={{ opacity: 0.5, marginBottom: '40px' }}>Control how the neural engine processes your data.</p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600 }}>Risk Tolerance</label>
                                        <span style={{ fontSize: '12px', color: '#0ea5e9' }}>Aggressive</span>
                                    </div>
                                    <input type="range" style={{ width: '100%', accentColor: '#0ea5e9' }} />
                                    <p style={{ fontSize: '11px', opacity: 0.3, marginTop: '8px' }}>High risk increases potential ROI but raises failure probability in simulations.</p>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Processing Logic</label>
                                    <select style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px', color: 'white' }}>
                                        <option>Data-Driven (Conservative)</option>
                                        <option>Neural Pattern Matching</option>
                                        <option>Speculative (Moonshot)</option>
                                    </select>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Add Team, Notifications, etc. following the same pattern */}
                    {/* 6. TEAM SETTINGS - The "Collaboration Source" */}
                    {activeTab === 'Team' && (
                        <section>
                            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>Team</h1>
                            <h3 style={{ marginTop: 0, fontSize: '14px', color: '#a855f7', letterSpacing: '1px' }}>TEAM COLLABORATION</h3>
                            <div style={{ marginTop: '20px' }}>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                    <input placeholder="Invite by email..." style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '12px' }} />
                                    <button style={{ background: 'rgba(168, 85, 247, 0.2)', border: '1px solid #a855f7', color: '#a855f7', padding: '0 20px', borderRadius: '12px', fontWeight: 'bold', fontSize: '12px' }}>INVITE</button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6, fontSize: '12px' }}>
                                    <span>You (Admin)</span>
                                    <span style={{ color: '#a855f7' }}>Active</span>
                                </div>
                            </div>
                        </section>
                    )}  
                    {/* 5. NOTIFICATIONS - The "Alert Source" */}
                    {activeTab === 'Notifications' && (    
                        <section>
                            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>Notifications</h1>
                            <h3 style={{ marginTop: 0, fontSize: '14px', color: '#f59e0b', letterSpacing: '1px' }}>NEURAL ALERTS</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                                {['Growth Alerts', 'Risk Warnings', 'Daily Tips'].map(item => (
                                    <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px' }}>
                                        <span style={{ fontSize: '13px' }}>{item}</span>
                                        <input type="checkbox" defaultChecked style={{ accentColor: '#0ea5e9' }} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}   
                    {activeTab === 'About us' && (
                        <section>
                            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>About the Architect</h1>
                            <p style={{ opacity: 0.5, marginBottom: '40px' }}>Official documentation and vision behind the Neural Ecosystem.</p>

                            <div style={{ 
                                background: 'rgba(255,255,255,0.02)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '20px', 
                                padding: '40px',
                                lineHeight: '1.8',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                            }}>
                                {/* CERTIFICATION BADGE */}
                                <div style={{ 
                                    display: 'inline-block', 
                                    padding: '4px 12px', 
                                    borderRadius: '6px', 
                                    background: 'rgba(255,255,255,0.1)', 
                                    fontSize: '10px', 
                                    fontWeight: 800, 
                                    letterSpacing: '1.5px', 
                                    marginBottom: '24px',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}>
                                    VERIFIED FOUNDER // ID: MAL-001
                                </div>

                                <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px', color: 'white' }}>
                                    Malvin
                                </h2>

                                <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <p>
                                        As the primary architect of this Neural Business Operating System, **Malvin** has dedicated his focus to the intersection of advanced simulation logic and intuitive user experiences. His vision is to bridge the gap between complex data processing and the everyday entrepreneur.
                                    </p>
                                    
                                    <p>
                                        The mission behind this platform is simple: to provide a high-fidelity environment where businesses can test, fail, and succeed in a digital space before deploying resources in the physical market. Under Malvin's leadership, the ecosystem continues to evolve toward a more autonomous, intelligent, and brand-centric future.
                                    </p>

                                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '20px 0' }} />

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, opacity: 0.4 }}>LOCATION</span>
                                            <span style={{ fontSize: '14px' }}>Global Operations</span>
                                        </div>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, opacity: 0.4 }}>VERSION</span>
                                            <span style={{ fontSize: '14px' }}>Neural OS v1.0.4 (Beta)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p style={{ textAlign: 'center', fontSize: '11px', opacity: 0.3, marginTop: '40px' }}>
                                © 2026 Malvin Ecosystem. All rights reserved. Registered Neural Network.
                            </p>

                            
                        </section>
                    )}  
                </div>
                <div style={{ 
                    position: 'fixed', bottom: '40px', right: '40px', 
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)'
                }}>
                    {/* Pulse Animation */}
                    <div className="pulse-dot" style={{ 
                        width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2dd4bf' 
                    }}></div>
                    <span style={{ fontSize: '11px', color: 'white', opacity: 0.6, fontWeight: 600 }}>
                        NEURAL CORE SYNCED
                    </span>
                </div>
            </div>
            <div>
            <input 
                value={tempName} 
                onChange={(e) => setTempName(e.target.value)} 
            />
            <button onClick={saveSettings}>Save Changes</button>
        </div>
        </div>
    );
};

export default Settings;