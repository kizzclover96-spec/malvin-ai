import React from "react";
import '../App.css';

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
            <div className="background-blobs">
                <div className="blob purple"></div>
                <div className="blob blue"></div>
                <div className="blob pink"></div>
            </div>
            {/* 1. LEFT */}
            <div className="left-section" style={{ flex: 1, borderRight: '1px solid #222', padding: '20px' }}>
                <div style={{color: 'white'}}>User: {userEmail}</div>
            </div>

            {/* 2. MIDDLE */}
            <div className="middle-section" style={{ flex: 4, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '40px' }}>
                <div className="status-pill-container">
                    <div className="status-pill">
                        <span className="live-dot"></span>
                        <span className="status-text">LIVE SESSION</span>
                        <span className="status-timer">{formatTime()}</span>
                    </div>
                </div>
                <div className="ai-face" style={{fontSize: '100px', color: 'white'}}>O</div>

                {/* bottom */}
                <div style={{gap: '15px', display: 'flex', alignItems: 'center',  width: '100%', justifyContent: 'center', marginBottom: '20px'}}>
                    {/* pill */}
                    <div className="input-pill" style={{ display: 'flex', alignItems: 'center', background: '#211f31', borderRadius: '30px', padding: '10px 20px', width: '400px' }}>
                        {/* + */}
                        <div style={{ position: 'relative' }}>
                            {showExtras && (
                                <div className="extra-buttons-popup" style={{ position: 'absolute', bottom: '50px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button className="popup-item" style={btnReset}><CameraIcon enabled={!disabled && !!localParticipant?.isCameraEnabled}
                                     onClick={async () => { if(!disabled && localParticipant) { await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled); triggerActivity(); } }} />
                                    </button>
                                    <button className="popup-item" style={btnReset}><ScreenShareIcon enabled={!disabled && !!localParticipant?.isScreenShareEnabled}
                                    onClick={async () => { if(!disabled && localParticipant) { await localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled); triggerActivity(); } }} /></button>
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
                            <MicIcon enabled={!disabled && !!localParticipant?.isMicrophoneEnabled} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. RIGHT */}
            <div className="right-section" style={{ flex: 1, borderLeft: '1px solid #222', color: 'white', padding: '20px' }}>
                <ul><li>Chat</li><li>Settings</li></ul>
            </div>
        </div>
    );
};

export default Malvinui;