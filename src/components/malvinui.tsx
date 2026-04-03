import React, { useEffect, useRef, useState } from "react";
import '../App.css';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  useRemoteParticipant,
  useIsSpeaking,
  LayoutContextProvider,
  useLocalParticipant,
  useChat,
  useConnectionState,
} from '@livekit/components-react';

const Malvinui: React.FC<{ userEmail?: string }> = ({ userEmail }) => {
    // 1. STATE & VARS (Fixed missing references)
    const { localParticipant } = useLocalParticipant();
    const [showExtras, setShowExtras] = React.useState(false);
    const [seconds, setSeconds] = React.useState(0);
    const [textInput, setTextInput] = React.useState("");
    const [activeTab, setActiveTab] = React.useState('Session'); 
    const [showTrustMsg, setShowTrustMsg] = React.useState(false);
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [currentActivity, setCurrentActivity] = React.useState("No recent activity");
    const [activityIcon, setActivityIcon] = React.useState("✨");
    const fileInputRef = React.useRef(null);
    const username = "User";
    
    
    // Define colors so the icons don't crash
    const premiumGold = "#FFD700";
    const neonBlue = "#00e1ff";
    const neonPurple = "#9d00ff";
    const glassWhite = "rgba(255, 255, 255, 0.8)";
    const ghostWhite = "rgba(255, 255, 255, 0.4)";
    const btnReset = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' };

    // Placeholder logic (Replace with your real props/hooks later)
    const disabled = false;

    const triggerActivity = () => {};
    const handleSendMessage = () => setTextInput("");
    
    const toggleCamera = () => {
        setLocalParticipant(prev => ({ ...prev, isCameraEnabled: !prev.isCameraEnabled }));
        triggerActivity();
    };

    const toggleMic = () => {
        setLocalParticipant(prev => ({ ...prev, isMicrophoneEnabled: !prev.isMicrophoneEnabled }));
        triggerActivity();
    };

    const toggleScreen = () => {
        setLocalParticipant(prev => ({ ...prev, isScreenShareEnabled: !prev.isScreenShareEnabled }));
        triggerActivity();
    };
    const glassStyle: React.CSSProperties = {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
    };

    /*function VideoStage({ participant }: { participant: any }) {
        // 1. Get all tracks from the local user
        const { localParticipant } = useLocalParticipant();
        const tracks = useTracks([
            { source: Track.Source.Camera, participantIdentity: localParticipant?.identity },
            { source: Track.Source.ScreenShare, participantIdentity: localParticipant?.identity }
        ]);

        // 2. Identify which one to show (Prioritize ScreenShare, then Camera)
        const screenTrack = tracks.find(t => t.source === Track.Source.ScreenShare);
        const cameraTrack = tracks.find(t => t.source === Track.Source.Camera);
        const activeTrack = screenTrack || cameraTrack;

        return (
            <div className="video-stage" style={{
                flex: 1, width: '100%', maxWidth: '800px', height: '450px',
                backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '24px',
                position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {/* If a track exists AND camera is enabled in state, show it */}
                /*{activeTrack && participant.isCameraEnabled ? (
                    <VideoTrack 
                        trackRef={activeTrack} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                ) : (
                    /* Fallback when camera is OFF */
                    /*<div style={{ 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', 
                        justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.2)' 
                    }}>
                        <div style={{ fontSize: '50px', marginBottom: '10px' }}>📷</div>
                        <p>Camera is Muted</p>
                    </div>
                )}
            </div>
        );
    }
    */

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
    const StarIcon = ({ size = 18 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={premiumGold} stroke={premiumGold} strokeWidth="1">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    );

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

    const SidebarBtn = ({ children, label, isActive, onClick }: any) => (
    <button 
        onClick={onClick}
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
    const GlobalStyles = () => (
  <style>{`
        @keyframes goldGlow { 
        0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.4); } 
        50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.5); border-color: #FFD700; }
        }
        @keyframes twinkle { 
        0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); } 
        50% { opacity: 1; transform: scale(1.2) rotate(15deg); }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
            .left-section, .Right-section {
            display: none !important; /* Hide sidebars on mobile */
            }
            
            .middle-section {
            flex: 1 !important;
            width: 100vw !important;
            padding: 20px !important;
            }

            .mobile-menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            backdrop-filter: blur(10px);
            z-index: 999;
            display: flex;
            flex-direction: column;
            padding: 40px 20px;
            animation: fadeIn 0.3s ease;
            }
        }
    `}</style>
    );

    return (
        <div className="main-full-ui" style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: "black" }}> 
            <GlobalStyles />
            <div className="background-blobs">
                <div className="blob purple"></div>
                <div className="blob blue"></div>
                <div className="blob pink"></div>
            </div>
            {/* 1. LEFT */}
            <div className="left-section" style={{ flex: 1, display: 'flex', borderRight: '1px solid #222', padding: '20px', gap: '10px', display: 'flex', flexDirection: 'column'}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '1.5px solid #bf00ff', // That Neon Purple "Manly" Ring
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }}>
                        <img 
                            src="/Malvin self.png" 
                            alt="Malvin AI"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                    </div>
                    
                    <span style={{ 
                        color: 'white', 
                        fontWeight: '800', 
                        letterSpacing: '2px', 
                        fontSize: '18px',
                        fontFamily: 'sans-serif' // Or your custom font
                    }}>
                        MALVIN
                    </span>
                </div>
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

                    {/* --- NEW ELITE PREMIUM BUTTON --- */}
                    <div style={{ position: 'relative', marginTop: '4px', width: '100%' }}>
                        <div style={{ 
                            position: 'absolute', 
                            top: '-6px', 
                            left: '-6px', 
                            zIndex: 10,
                            animation: 'twinkle 2s infinite' 
                        }}>
                            <StarIcon size={12} />
                        </div>

                        <button 
                            onClick={() => setActiveTab('Premium')}
                            style={{ 
                                ...btnReset,
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: 'rgba(255, 215, 0, 0.08)', 
                                border: '1px solid #FFD700', 
                                color: '#FFD700', 
                                fontSize: '10px', 
                                fontWeight: '900', 
                                letterSpacing: '1.2px', 
                                textTransform: 'uppercase',
                                animation: 'goldGlow 3s infinite',
                                gap: '12px'
                            }}
                        >
                            <StarIcon size={14} />
                            <span>Go Premium</span>
                        </button>
                    </div>
                
                

                    <SidebarBtn label="Settings"
                        isActive={activeTab === 'Settings'} 
                        onClick={() => setActiveTab('Settings')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    </SidebarBtn>
                    <SidebarBtn 
                        label="Notes" 
                        isActive={activeTab === 'Notes'} 
                        onClick={() => setActiveTab('Notes')}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <line x1="10" y1="9" x2="8" y2="9"/>
                        </svg>
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
                        {/* THE CIRCLE WRAPPER */}
                        <div style={{
                            width: '45px',
                            height: '45px',
                            borderRadius: '50%',
                            overflow: 'hidden', // Ensures the image stays a circle
                            border: '1.5px solid #bf00ff', // Optional: Neon Purple Ring
                            flexShrink: 0, // Prevents the circle from squashing
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)'
                        }}>
                            <img 
                                src="/Malvin self.png" 
                                alt="Malvin AI"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                        </div>
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
                
                {/* --- TOP RIGHT SECURITY & MENU --- */}
                <div style={{ 
                    position: 'absolute', 
                    top: '25px', 
                    right: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    zIndex: 100 
                }}>
                    {/* TRUST SHIELD */}
                    <div style={{ position: 'relative' }}>
                        <div 
                            onClick={() => setShowTrustMsg(!showTrustMsg)}
                            style={{ 
                                cursor: 'pointer', 
                                color: showTrustMsg ? '#4ade80' : 'rgba(255, 255, 255, 0.4)',
                                transition: 'all 0.3s ease',
                                filter: showTrustMsg ? 'drop-shadow(0 0 8px rgba(74, 222, 128, 0.4))' : 'none'
                            }}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                <path d="m9 12 2 2 4-4"/>
                            </svg>
                        </div>

                        {/* POPUP MESSAGE */}
                        {showTrustMsg && (
                            <div style={{
                                position: 'absolute',
                                top: '40px',
                                right: '0',
                                width: '280px',
                                backgroundColor: 'rgba(15, 15, 20, 0.95)',
                                backdropFilter: 'blur(15px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '16px',
                                padding: '20px',
                                zIndex: 101,
                                animation: 'fadeIn 0.2s ease-out'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4ade80' }}></div>
                                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '13px' }}>Secure Session</span>
                                </div>
                                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                                    All conversations are end-to-end encrypted. No Malvin personnel will ever ask for your login info.
                                </p>
                                <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: '12px' }}></div>
                                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                    Support: 
                                    <a 
                                        href="mailto:malvinsupportteam@gmail.com" 
                                        style={{ 
                                            color: '#bf00ff', 
                                            textDecoration: 'none', 
                                            marginLeft: '5px',
                                            fontWeight: 'bold',
                                            transition: 'opacity 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                    >
                                        malvinsupportteam@gmail.com
                                    </a>
                                </p>
                                
                            </div>
                        )}
                    </div>
                </div>
                <div className="status-pill-container" style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', width: '100%', paddingBottom: '20px', alignSelf: 'stretch'}}>
                    <div className="status-pill" style={{ marginTop: '-18px', marginLeft: '-12px' }}>
                        <span className="live-dot"></span>
                        <span className="status-text">LIVE SESSION</span>
                        <span className="status-timer">{formatTime()}</span>
                    </div>
                </div>
                
                {/*<VideoStage participant={localParticipant} />*/}

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
                                    {/* 1. CAMERA BUTTON */}
                                    <button 
                                        className="popup-item" 
                                        style={btnReset}
                                        onClick={async () => {
                                            const newStatus = !localParticipant.isCameraEnabled;
                                            // This actually tells the hardware to turn on/off
                                            await localParticipant.setCameraEnabled(newStatus); 
                                            
                                            // This updates your UI state
                                            setLocalParticipant(prev => ({ ...prev, isCameraEnabled: newStatus }));
                                            setCurrentActivity(newStatus ? "Camera Live" : "Camera Off");
                                        }} 
                                    >
                                        <CameraIcon enabled={!disabled && !!localParticipant?.isCameraEnabled} />
                                    </button>
                                    {/* 2. SCREENSHARE BUTTON */}
                                    <button 
                                        className="popup-item" 
                                        style={btnReset}
                                        onClick={() => {
                                            const newStatus = !localParticipant.isScreenShareEnabled;
                                            setLocalParticipant(prev => ({ ...prev, isScreenShareEnabled: newStatus }));
                                            setCurrentActivity(newStatus ? "Screen sharing" : "Stopped sharing");
                                            setActivityIcon(newStatus ? "🖥️" : "✨");
                                        }}
                                    >
                                        <ScreenShareIcon enabled={!disabled && !!localParticipant?.isScreenShareEnabled} />
                                    </button>
                                    <button className="popup-item" style={btnReset} onClick={() => fileInputRef.current?.click()} ><ClipIcon/></button>
                                </div>
                            )}
                            <button onClick={() => setShowExtras(!showExtras)} style={{...btnReset, color:'white', fontSize:'28px', width: '40px', height: '40px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '0', paddingBottom: '4px', transition: 'background 0.2s', cursor: 'pointer'}} >+</button>
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
                                const newStatus = !localParticipant.isMicrophoneEnabled;
                                // This actually mutes/unmutes the mic
                                await localParticipant.setMicrophoneEnabled(newStatus);
                                
                                setLocalParticipant(prev => ({ ...prev, isMicrophoneEnabled: newStatus }));
                                setCurrentActivity(newStatus ? "Mic Live" : "Mic Muted");
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
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    // Update your Activity Box!
                                    setCurrentActivity(`Uploaded: ${file.name}`);
                                    setActivityIcon("📁");
                                    
                                    // Logic for actually uploading the file goes here
                                    console.log("Selected file:", file);
                                }
                            }} 
                        />
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
                    <div className="activities-panel" style={{ 
                        padding: '20px', 
                        height: '100px',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <p style={{ color: 'white', margin: 0, fontWeight: '400', opacity: 0.6, fontSize: '12px' }}>
                            activities
                        </p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
                            <span style={{ fontSize: '18px' }}>{activityIcon}</span>
                            <span style={{ color: 'white', fontSize: '13px' }}>{currentActivity}</span>
                        </div>
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