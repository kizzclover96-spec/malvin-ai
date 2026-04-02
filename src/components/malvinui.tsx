import React from "react";
import '../App.css';

const Malvinui: React.FC<{ userEmail?: string }> = ({ userEmail }) => {
    // 1. STATE & VARS (Fixed missing references)
    const [showExtras, setShowExtras] = React.useState(false);
    const [seconds, setSeconds] = React.useState(0);
    const [textInput, setTextInput] = React.useState("");
    const [activeTab, setActiveTab] = React.useState('Session'); 
    
    // Define colors so the icons don't crash
    const neonBlue = "#00e1ff";
    const neonPurple = "#9d00ff";
    const glassWhite = "rgba(255, 255, 255, 0.8)";
    const ghostWhite = "rgba(255, 255, 255, 0.4)";
    const btnReset = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' };

    // Placeholder logic (Replace with your real props/hooks later)
    const disabled = false;
    const localParticipant = { isMicrophoneEnabled: true, isCameraEnabled: false, isScreenShareEnabled: false, setMicrophoneEnabled: async (v:any)=>v, setCameraEnabled: async (v:any)=>v, setScreenShareEnabled: async (v:any)=>v };
    const triggerActivity = () => {};
    const handleSendMessage = () => setTextInput("");
    

    // TIMER LOGIC
    React.useEffect(() => {
        const interval = setInterval(() => setSeconds(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = () => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // ICONS (Using your SVG code)
    const CameraIcon = ({ enabled, size = 22 }: any) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={enabled === false ? ghostWhite : glassWhite} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
    );

    const ScreenShareIcon = ({ enabled, size = 22 }: any) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={enabled ? neonPurple : neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><polyline points="8 21 12 17 16 21"/></svg>
    );

    const ClipIcon = ({ size = 22 }: any) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
    );

    const MicIcon = ({ enabled, size = 22 }: { enabled?: boolean, size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled === false ? 0.4 : 1 }}>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
        </svg>
    );

    const SidebarBtn = ({ children, label, isActive, onClick }) => (
    <button 
        style={{ ...btnReset, display: 'flex',alignItems: 'center', padding: '10px 14px', borderRadius: '12px', color: 'white', fontSize: '14px', gap: '12px', transition: 'all 0.2s ease', cursor: 'pointer', width: '100%',
            backgroundColor: 'transparent', backgroundColor: isActive ? 'rgba(191, 0, 255, 0.1)' : 'transparent',
            
            /* --- THE NEON PURPLE LOOK --- */
            border: isActive ? '1px solid #bf00ff' : '1px solid transparent',
            boxShadow: isActive ? '0 0 15px rgba(191, 0, 255, 0.4)' : 'none',
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.transform = 'translateX(4px)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'translateX(0px)';
        }}
        >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isActive ? 1 : 0.7 }}>
            {children}
        </div>
        <span style={{ fontWeight: isActive ? '600' : '400', opacity: isActive ? 1 : 0.8 }}>{label}</span>
    </button>
);

    return (
        <div className="main-full-ui" style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: "black" }}>
            <div className="background-blobs">
                <div className="blob purple"></div>
                <div className="blob blue"></div>
                <div className="blob pink"></div>
            </div>
            {/* 1. LEFT */}
            <div className="left-section" style={{ flex: 1, display: 'flex', borderRight: '1px solid #222', padding: '20px', gap: '10px', display: 'flex', flexDirection: 'column'}}>
                <div style={{color: 'white'}}>MALIVIN</div>
                <div className="left top panel" style={{ width: '200px',flex: 1, gap: '10px',
                        borderRight: '1px solid rgba(255, 255, 255, 0.1)', // Subtle white line
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',

                        /* --- THE GLASS LOOK --- */
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',   // 1. Semi-transparent white
                        backdropFilter: 'blur(12px)',                  // 2. The "Frosted" blur
                        WebkitBackdropFilter: 'blur(12px)',
                        borderRadius: '16px', // Smooth corners
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                    <SidebarBtn 
                        label="Session" 
                        isActive={activeTab === 'Session'} 
                        onClick={() => setActiveTab('Session')}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3z"/></svg>
                    </SidebarBtn>
                    <SidebarBtn label="Memories"
                        isActive={activeTab === 'Memories'} 
                        onClick={() => setActiveTab('Memories')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V12L15 15"/><circle cx="12" cy="12" r="10"/></svg>
                    </SidebarBtn>

                    <SidebarBtn label="Dashboard"
                        isActive={activeTab === 'Dashboard'} 
                        onClick={() => setActiveTab('Dashboard')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    </SidebarBtn>

                    <SidebarBtn label="Tools"
                        isActive={activeTab === 'Tools'} 
                        onClick={() => setActiveTab('Tools')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    </SidebarBtn>

                    <SidebarBtn label="Premium"
                        isActive={activeTab === 'Premium'} 
                        onClick={() => setActiveTab('Premium')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6-3 6 3v6l-6 3-6-3V9Z"/><path d="m12 3 10 5v10l-10 5L2 18V8l10-5Z"/></svg>
                    </SidebarBtn>

                    <SidebarBtn label="Settings"
                        isActive={activeTab === 'Settings'} 
                        onClick={() => setActiveTab('Settings')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    </SidebarBtn>


                </div>
                    {/* button left section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} >
                    <div className="left buttom-panel" style={{ padding: '15px', 
                            borderRight: '1px solid rgba(255, 255, 255, 0.1)', // Subtle white line
                            padding: '20px',
                            flexDirection: 'column',
                            display: 'flex',

                            /* --- THE GLASS LOOK --- */
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',   // 1. Semi-transparent white
                            backdropFilter: 'blur(12px)',                  // 2. The "Frosted" blur
                            WebkitBackdropFilter: 'blur(12px)',
                            borderRadius: '16px', // Smooth corners
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                        <p style={{ color: 'white', margin: 0, fontWeight: '600' }}>Malvin AI</p>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '5px 0 0 0' }}>Your intelligent collaborator partner</p>
                            
                    </div>
                    <div className="left-user-panel" style={{ padding: '15px',
                            flexDirection: 'column', 
                            display: 'flex',
                            padding: '20px',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}> 
                        <div style={{ color: 'white', fontSize: '14px' }}>{typeof username !== 'undefined' ? username : "Guest User"}</div>
                        <div style={{color: 'white', fontSize: '11px', opacity: 0.4 }}>User: {userEmail}</div>
                    </div>       
                </div>
                
            </div>

            {/* 2. MIDDLE */}
            <div className="middle-section" style={{ flex: 4, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '40px' }}>
                <div className="status-pill-container" style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', width: '100%', paddingBottom: '20px', alignSelf: 'stretch'}}>
                    <div className="status-pill" style={{ marginTop: '-18px', marginLeft: '-12px' }}>
                        <span className="live-dot"></span>
                        <span className="status-text">LIVE SESSION</span>
                        <span className="status-timer">{formatTime()}</span>
                    </div>
                </div>
                <div className="ai-face" style={{fontSize: '100px', color: 'white'}}>O</div>

                {/* bottom */}
                <div style={{gap: '10px', display: 'flex', alignItems: 'center',  width: '100%', justifyContent: 'center', marginBottom: '-14px'}}>
                    {/* pill */}
                    <div className="input-pill" style={{ display: 'flex', alignItems: 'center', background: '#211f31', borderRadius: '50px', padding: '10px 20px', width: '600px', backgroundColor: 'rgba(255, 255, 255, 0.03)',   // 1. Semi-transparent white
                            backdropFilter: 'blur(12px)',                  // 2. The "Frosted" blur
                            WebkitBackdropFilter: 'blur(12px)',
                            borderRadius: '50px', // Smooth corners
                            border: '1px solid rgba(255, 255, 255, 0.1)'}}>
                        {/* + */}
                        <div style={{ position: 'relative' }}>
                            {showExtras && (
                                <div className="extra-buttons-popup" style={{ position: 'absolute', bottom: '50px', display: 'flex', flexDirection: 'row', gap: '10px' }}>
                                    <button className="popup-item" style={btnReset}><CameraIcon enabled={!disabled && !!localParticipant?.isCameraEnabled}
                                     onClick={async () => { if(!disabled && localParticipant) { await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled); triggerActivity(); } }} />
                                    </button>
                                    <button className="popup-item" style={btnReset}><ScreenShareIcon enabled={!disabled && !!localParticipant?.isScreenShareEnabled}
                                    onClick={async () => { if(!disabled && localParticipant) { await localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled); triggerActivity(); } }} /></button>
                                    <button className="popup-item" style={btnReset}><ClipIcon/></button>
                                </div>
                            )}
                            <button onClick={() => setShowExtras(!showExtras)} style={{...btnReset, color:'white', fontSize:'28x', width: '40px', height: '40px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '0', paddingBottom: '4px', transition: 'background 0.2s', cursor: 'pointer'}} >+</button>
                        </div>
                        <input 
                            placeholder="say something..." 
                            value={textInput} 
                            onChange={(e)=>setTextInput(e.target.value)}
                            style={{ flex: 1, background: 'none', border: 'none', color: 'white', marginLeft: '15px', outline: 'none' }} 
                        />
                    </div>
                    {/* mic*/}
                    {/* mic */}
                    <div style={btnReset}>
                        <div className="mic-button">
                            <button 
                            onClick={async () => { 
                                if(!disabled && localParticipant) { 
                                await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled); 
                                triggerActivity(); 
                                } 
                            }}
                            >
                            {/* Put the Icon INSIDE the button, and close it with /> */}
                            <MicIcon enabled={!disabled && !!localParticipant?.isMicrophoneEnabled} 
                             style={{ 
                                    color: 'white',        // Forces it to white
                                    strokeWidth: '2.5px',   // Makes the lines thicker (default is usually 2)
                                    width: '24px',          // Ensure size is consistent
                                    height: '24px' 
                                }}
                            />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. RIGHT */}
            <div className="Right-section" style={{ flex: 1, display: 'flex', borderRight: '1px solid #222', padding: '20px', gap: '10px', display: 'flex', flexDirection: 'column'}}>
                <div style={{color: 'white'}}>Participants</div>
                <div className="Right-top panel" style={{ width: '200px', height: '100px', 
                        borderRight: '1px solid rgba(255, 255, 255, 0.1)', // Subtle white line
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',

                        /* --- THE GLASS LOOK --- */
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',   // 1. Semi-transparent white
                        backdropFilter: 'blur(12px)',                  // 2. The "Frosted" blur
                        WebkitBackdropFilter: 'blur(12px)',
                        borderRadius: '16px', // Smooth corners
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>

                </div>
                    {/* button right section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} >
                    <div className="left buttom-panel" style={{ padding: '15px', height: '100px',
                            borderRight: '1px solid rgba(255, 255, 255, 0.1)', // Subtle white line
                            padding: '15px 20px',
                            flexDirection: 'column',
                            display: 'flex',
                            justifyContent: 'flex-start', /* 1. Pushes content to the TOP */
                            alignItems: 'flex-start',

                            /* --- THE GLASS LOOK --- */
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',   // 1. Semi-transparent white
                            backdropFilter: 'blur(12px)',                  // 2. The "Frosted" blur
                            WebkitBackdropFilter: 'blur(12px)',
                            borderRadius: '16px', // Smooth corners
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                        <p style={{ color: 'white', margin: 0, fontWeight: '400', opacity: 0.6 }}>activities</p>
                            
                    </div>
                    <div className="Right-panel" style={{ padding: '15px', height: '100px',
                            flexDirection: 'column', 
                            display: 'flex',
                            padding: '20px',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}> 
                    </div>       
                </div>
                
            </div>
        </div>
    );
};

export default Malvinui;