const Malvinui: React.FC = () => {
    const [showExtras, setShowExtras] = React.useState(false);
    const [seconds, setSeconds] = React.useState(0);
    React.useEffect(() => {
      const interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }, []);

    const formatTime = () => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const glassWhite = "rgba(255, 255, 255, 0.8)"; // 80% White
    const ghostWhite = "rgba(255, 255, 255, 0.4)"; // 40% White for "disabled"
    const CameraIcon = ({ enabled, size = 22 }: { enabled?: boolean, size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" 
            stroke={enabled === false ? ghostWhite : glassWhite} 
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" 
            className="icon-shadow">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
        </svg>
    );

    const ScreenShareIcon = ({ enabled, size = 22 }: { enabled?: boolean, size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={enabled ? neonPurple : neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled === false ? 0.4 : 1 }}>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><polyline points="8 21 12 17 16 21"/>
    </svg>
    );

    const ClipIcon = ({ size = 22, animated = false }: { size?: number, animated?: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: animated ? 'swing 2s ease-in-out infinite' : 'none', transformOrigin: 'top center' }}>
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
    );



  return (
    <div className="main-full-ui" style={{ flex: 1, bacgroundcolor: "black" }}>
        <div classname="main-full-ui">

            {/* 1. LEFT SECTION (Participants/Ads) */}
            <div className="left-section">
            <div className="participants">User & AI</div>
            <div className="ad-box">Small Ad Box</div>
            </div>



            {/* 2. MIDDLE SECTION */}
            <div className="middle-section" style={{ position: 'relative', height: '100%' }}>
                
                {/* Status Pill Container */}
                <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
                    <div className="status-pill">
                        <span className="live-dot"></span>
                        <span className="status-text">LIVE SESSION</span>
                        <span className="status-timer">{formatTime()}</span>
                    </div>
                </div>
                <div className="ai-face">O</div>
                
                <div style={{ 
                    position: 'absolute', bottom: '30px', left: 0, right: 0, 
                    display: 'flex', justifyContent: 'center', alignItems: 'center', 
                    gap: '20px', zIndex: 100 
                }}>
                    {/* The Mic */}
                    <div className="mic-button">
                        <button onClick={async () => { if(!disabled && localParticipant) { await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled); triggerActivity(); } }} style={btnReset}>
                            <MicIcon enabled={!disabled && !!localParticipant?.isMicrophoneEnabled} />
                        </button>
                    </div>

                    {/* The Pill */}
                    <div style={{ 
                        width: '60%', maxWidth: '400px', height: '52px', 
                        backgroundColor: 'rgba(33, 31, 49, 0.95)', borderRadius: '30px', 
                        border: '1px solid rgba(255,255,255,0.1)', display: 'flex', 
                        alignItems: 'center', padding: '0 15px', gap: '10px' 
                    }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            {showExtras && (
                                <div className="extra-buttons-popup">
                                    {/* CAMERA BUTTON */}
                                    <button className="popup-item" style={btnReset} onClick={async () => { 
                                        if(!disabled && localParticipant) { 
                                            await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled); 
                                            triggerActivity(); 
                                        } 
                                    }}>
                                        <CameraIcon enabled={!disabled && !!localParticipant?.isCameraEnabled} size={20} />
                                    </button>

                                    {/* SCREEN SHARE BUTTON */}
                                    <button className="popup-item" style={btnReset} onClick={async () => { 
                                        if(!disabled && localParticipant) { 
                                            await localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled); 
                                            triggerActivity(); 
                                        } 
                                    }}>
                                        <ScreenShareIcon enabled={!disabled && !!localParticipant?.isScreenShareEnabled} size={20} />
                                    </button>

                                    {/* ATTACHMENT/CLIP BUTTON */}
                                    <button className="popup-item" style={btnReset} onClick={() => alert("File upload clicked!")}>
                                        <ClipIcon size={20} animated={true} />
                                    </button>
                                </div>
                            )}

                            {/* The Toggle Button (+) */}
                            <button onClick={() => setShowExtras(!showExtras)} style={{ ...btnReset, cursor: 'pointer' }}>
                                <div style={{ 
                                    transform: showExtras ? 'rotate(45deg)' : 'rotate(0deg)', 
                                    transition: '0.3s ease', color: 'white', fontSize: '28px' 
                                }}>+</div>
                            </button>
                        </div>
                        
                        <input 
                            type="text" 
                            placeholder="say something..." 
                            value={textInput} 
                            onChange={(e) => { setTextInput(e.target.value); triggerActivity(); }} 
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                            style={{ flex: 1, background: 'none', border: 'none', color: disabled ? '#444' : '#fff', outline: 'none' }} 
                        />
                    </div>   
                </div>
            </div>

            {/* 3. RIGHT SECTION (Always Open Menu) */}
            <div className="right-section">
            <nav>
                <ul>
                <li>Chat</li>
                <li>Files</li>
                <li>Settings</li>
                </ul>
            </nav>
            </div>
        </div>
    </div>
  );
};

export default Malvinui;  