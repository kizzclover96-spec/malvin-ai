

const Malvinui: React.FC<{ userEmail?: string }> = ({ userEmail }) => {
    // 1. STATE & VARS (Fixed missing references)
    const [showExtras, setShowExtras] = React.useState(false);
    const [seconds, setSeconds] = React.useState(0);
    const [textInput, setTextInput] = React.useState("");
    
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
    const MicIcon = ({enabled}: any) => <span style={{color: enabled ? 'white' : 'red'}}>🎤</span>;

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

    return (
        <div className="main-full-ui" style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: "black" }}>
            {/* 1. LEFT */}
            <div className="left-section" style={{ width: '250px', borderRight: '1px solid #222', padding: '20px' }}>
                <div style={{color: 'white'}}>User: {userEmail}</div>
            </div>

            {/* 2. MIDDLE */}
            <div className="middle-section" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="status-pill-container">
                    <div className="status-pill">
                        <span className="live-dot"></span>
                        <span className="status-text">LIVE SESSION</span>
                        <span className="status-timer">{formatTime()}</span>
                    </div>
                </div>

                <div className="ai-face" style={{fontSize: '100px', color: 'white'}}>O</div>
                {/* bottom*/}
                <div style={{ position: 'absolute', bottom: '30px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                    {/* mic */}
                    <div className="mic-button">
                        <button style={btnReset}><MicIcon enabled={true}/></button>
                    </div>

                    <div className="input-pill" style={{ display: 'flex', alignItems: 'center', background: '#211f31', borderRadius: '30px', padding: '10px 20px', width: '400px' }}>
                        <div style={{ position: 'relative' }}>
                            {showExtras && (
                                <div className="extra-buttons-popup" style={{ position: 'absolute', bottom: '50px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button className="popup-item" style={btnReset}><CameraIcon enabled={true}/></button>
                                    <button className="popup-item" style={btnReset}><ScreenShareIcon enabled={true}/></button>
                                    <button className="popup-item" style={btnReset}><ClipIcon/></button>
                                </div>
                            )}
                            <button onClick={() => setShowExtras(!showExtras)} style={{...btnReset, color:'white', fontSize:'24px'}}>+</button>
                        </div>
                        <input 
                            placeholder="say something..." 
                            value={textInput} 
                            onChange={(e)=>setTextInput(e.target.value)}
                            style={{ flex: 1, background: 'none', border: 'none', color: 'white', marginLeft: '15px', outline: 'none' }} 
                        />
                    </div>
                </div>
            </div>

            {/* 3. RIGHT */}
            <div className="right-section" style={{ width: '200px', borderLeft: '1px solid #222', color: 'white', padding: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="right-panel" style={{ width: '120px',flex: 1, 
                        borderRight: '1px solid rgba(255, 255, 255, 0.1)', // Subtle white line
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',

                        /* --- THE GLASS LOOK --- */
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',   // 1. Semi-transparent white
                        backdropFilter: 'blur(12px)',                  // 2. The "Frosted" blur
                        WebkitBackdropFilter: 'blur(12px)'
                }}>
                <ul><li>Chat</li><li>Settings</li></ul>
            </div>
        </div>
    );
};

export defau










            {/* 1. LEFT */}
            <div className="left-section" style={{ flex: 1, display: 'flex', borderRight: '1px solid #222', padding: '20px', gap: '15px', display: 'flex', flexDirection: 'column', height: '100%'}}>
                <div style={{color: 'white'}}>MALIVIN</div>
                <div className="left top panel" style={{ width: '120px',flex: 1, 
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
                    {/* button left section */}
                <div>
                    <div className="left buttom-panel" style={{ flex: 1, 
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
                    <div className="left-user-panel" style={{ width: '100px',flex: 1, 
                            display: 'flex',
                            padding: '20px',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                        <div style={{ color: 'white', fontSize: '14px' }}>{typeof username !== 'undefined' ? username : "Guest User"}</div>
                        <div style={{ color: 'white', fontSize: '11px', opacity: 0.4 }}>{userEmail}</div>
                    </div>       
                </div>
                <div style={{color: 'white'}}>User: {userEmail}</div>
            </div>


            const premiumGold = "#FFD700";
            @keyframes premiumGlow { 0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.5); } 50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.5); border-color: ${premiumGold}; } }
        
        @keyframes goldGlow { 0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.3); border-color: rgba(255, 215, 0, 0.5); } 50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.6); border-color: #FFD700; }}
        @keyframes twinkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); }}
      `}</style>
            const StarIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={premiumGold} stroke={premiumGold} strokeWidth="1" style={{ marginRight: '8px' }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
<button style={{ position: 'relative', background: 'rgba(255, 215, 0, 0.05)', border: '1px solid #FFD700', color: '#FFD700', padding: '3px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', animation: 'goldGlow 3s infinite' }}>
          <div style={{ position: 'absolute', top: '-6px', left: '-6px', animation: 'twinkle 2s infinite' }}><StarIcon size={12} /></div>
          GO PREMIUM
        </button>










const [showallcurrent activity, setallcurrent activity] = React.useState(false);
const [showactivity, setactivity] = React.useState(false);

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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        async function current activity(params:type) {
                        button>micicon<>cameraicon<>paperclipicon<>screenshare< !!OnClick==> set activity=showhowactivity
                        }
                    </div>
                </div>