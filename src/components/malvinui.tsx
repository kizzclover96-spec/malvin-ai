import { db, auth } from "../firebase";
import { ref as dbRef, onValue, set, update } from "firebase/database";
import { signOut } from "firebase/auth";
import { firestore, auth } from "../firebase"; 
import { collection, addDoc } from "firebase/firestore";
import Memories from './memories'; 
import Simulator from './Simulator';
import MarginCalculator from './MarginCalculator';
import MarketTrends from './MarketTrends';
import Runway from './Runway';
import MainDashboard from './dashboard';
import Settings from './Settings';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import React, {  useRef, useState, useMemo } from "react";
import {  useEffect } from 'react';
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
import { ParticipantKind, Track } from 'livekit-client';

// Define colors so the icons don't crash
const premiumGold = "#FFD700";
const neonBlue = "#00e1ff";
const neonPurple = "#9d00ff";
const glassWhite = "rgba(255, 255, 255, 0.8)";
const ghostWhite = "rgba(255, 255, 255, 0.4)";
const btnReset = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' };

const smallActionStyle = {
    padding: '6px 12px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '9px',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '1px',
    transition: 'all 0.2s'
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

const AIOrb = ({ status }: { status: string }) => {
  return (
    <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 80px rgba(168, 85, 247, 0.6), 0 0 120px rgba(99, 102, 241, 0.4)' }}>
      <style>{`
        @keyframes pulseCore {
          0% { transform: scale(1); box-shadow: 0 0 20px rgba(168, 85, 247, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(168, 85, 247, 0.7); }
          100% { transform: scale(1); box-shadow: 0 0 20px rgba(168, 85, 247, 0.4); }
        }
      `}</style>
      <div style={{
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #fff 0%, #a855f7 50%, #6366f1 100%)',
        animation: 'pulseCore 3s ease-in-out infinite',
        zIndex: 2,
        border: '1px solid rgba(255,255,255,0.3)'
      }} />
    </div>
  );
};



const ImageCycler = ({ interval = 3000 }) => {
  const images = [
    "/AI Chip with Rainbow Glow~Bold, bright, and….png",
    "/Download.png",
    "/Zootopia 4K Wallpaper.png",
    "/Malvin self.png"
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);
    return () => clearInterval(timer);
  }, [images.length, interval]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      borderRadius: '12px',
      overflow: 'hidden', // Crucial to hide the image while it's 'off-screen'
      backgroundColor: '#000'
    }}>
      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0%); }
        }
      `}</style>

      <div 
        key={currentIndex} 
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `url("${encodeURI(images[currentIndex])}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'slideLeft 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
          position: 'absolute',
          inset: 0
        }}
      />
      
      {/* Visual Overlay for that UI feel */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.4))',
        pointerEvents: 'none'
      }} />
    </div>
  );
};


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

const MicIcon = ({ enabled, size = 22 }: { enabled?: boolean, size?: number }) => { 
    // If enabled is false, we want to show the mute line
    const showMuteLine = enabled === false; 

    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ 
                opacity: showMuteLine ? 0.5 : 1, 
                transition: 'all 0.2s ease' 
            }}
        >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" /> 
            
            {showMuteLine && (
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" /> 
            )}
        </svg>
    );    
};

// --- AI FACE COMPONENT ---
// 1. The "Eyes" only exist if the agent exists
const VoiceIslandEyes = ({ agent, blink }: any) => {
  const isSpeaking = useIsSpeaking(agent); 
  return (
    <svg width="45" height="18" viewBox="0 0 60 20">
      <rect x="12" y={blink ? "9" : (isSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isSpeaking ? "16" : "10")} rx="1" fill="white" />
      <rect x="38" y={blink ? "9" : (isSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isSpeaking ? "16" : "10")} rx="1" fill="white" />
    </svg>
  );
};

// 2. The Main Island Container
function MalvinVoiceIsland({ agent, disabled, onToggleDisable, activitySignal }: any) {
  const [blink, setBlink] = useState(false);
  const [sleeping, setSleeping] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!sleeping && !disabled && agent) {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [sleeping, disabled, agent]);

  useEffect(() => {
    setSleeping(false);
    const timer = setTimeout(() => setSleeping(true), 60000);
    return () => clearTimeout(timer);
  }, [activitySignal]);

  const neonBlue = "#00f2ff";
  const neonRed = "#ff0055";

  return (
    <div onClick={onToggleDisable} style={{ 
      width: '110px', height: '42px', backgroundColor: 'rgba(10, 10, 10, 0.9)', borderRadius: '21px', 
      border: `1.5px solid ${disabled ? neonRed : neonBlue}`, display: 'flex', alignItems: 'center', 
      justifyContent: 'center', cursor: 'pointer', position: 'relative', transition: 'all 0.3s ease',
      boxShadow: disabled ? `0 0 20px ${neonRed}77` : `0 0 5px ${neonBlue}22` 
    }}>
      <style>{`
        @keyframes floatZ { 0% { transform: translate(0, 0) scale(0.5); opacity: 0; } 20% { opacity: 1; } 100% { transform: translate(10px, -25px) scale(1.3); opacity: 0; } } 
        @keyframes pulseDead { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.92); } }
      `}</style>
      
      {disabled ? (
        <svg width="45" height="18" viewBox="0 0 60 20" style={{ animation: 'pulseDead 2s infinite' }}>
          <text x="10" y="15" fill={neonRed} fontSize="16" fontWeight="bold">X</text>
          <text x="36" y="15" fill={neonRed} fontSize="16" fontWeight="bold">X</text>
        </svg>
      ) : (agent && !sleeping) ? (
        /* ✅ Only call the component with the hook if agent IS DEFINED */
        <VoiceIslandEyes agent={agent} blink={blink} />
      ) : (
        /* 💤 Show sleeping eyes if no agent or sleeping */
        <>
          <svg width="45" height="18" viewBox="0 0 60 20">
            <rect x="12" y="10" width="10" height="2" rx="1" fill="white" opacity="0.6" />
            <rect x="38" y="10" width="10" height="2" rx="1" fill="white" opacity="0.6" />
          </svg>
          {agent && [0, 1, 2].map((i) => (
            <div key={i} style={{ position: 'absolute', right: '10px', top: '-5px', color: 'white', fontSize: i === 0 ? '12px' : '8px', animation: `floatZ 3s infinite ${i * 0.8}s linear`, opacity: 0 }}>Z</div>
          ))}
        </>
      )}
    </div>
  );
}


const VideoStage = () => {
    const { localParticipant } = useLocalParticipant();
    const tracks = useTracks([
        { source: Track.Source.Camera, participantIdentities: [localParticipant?.identity || ''] },
        { source: Track.Source.ScreenShare, participantIdentities: [localParticipant?.identity || ''] }
    ]);

    // Check if we have an active video stream
    const activeTrack = tracks.find(t => t.source === Track.Source.ScreenShare) || 
                        tracks.find(t => t.source === Track.Source.Camera);

    // If no camera and no screen share, don't show the box at all
    if (!activeTrack) return null;

    return (
        <div className="video-container" style={{
            width: '100%',
            maxWidth: '800px',
            height: '450px',
            backgroundColor: '#000',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}>
            <VideoTrack 
                trackRef={activeTrack} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
        </div>
    );
};

// 1. Move this OUTSIDE of Malvinui
const MalvinHybridCycler = React.memo(({ content }: { content: any[] }) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (!content || content.length === 0) return;

        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % content.length);
        }, 10000); // 10 Seconds

        return () => clearInterval(timer);
    }, [content.length]); // Only restarts if the list size changes

    const current = content[index];
    if (!current) return null;

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <div 
                key={index} 
                style={{
                    position: 'absolute',
                    inset: 0,
                    animation: 'slideLeft 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}
            >
                {current.type === 'image' ? (
                    <img 
                        src={current.value} 
                        alt="Insight" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} 
                    />
                ) : (
                    <p style={{ fontSize: '18px', color: 'white', textAlign: 'center', fontStyle: 'italic', lineHeight: '1.6' }}>
                        "{current.value}"
                    </p>
                )}
            </div>
        </div>
    );
});

const Malvinui: React.FC<{ userEmail?: string }> = ({ userEmail }) => {
    // 1. STATE & VARS (Fixed missing references)
    const [marketTrend] = useState([10, 22, 18, 35, 30, 45, 50]);
    const [savedSimulations, setSavedSimulations] = useState<any[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [showTools, setShowTools] = useState(false);
    const { localParticipant } = useLocalParticipant();
    const [showExtras, setShowExtras] = React.useState(false);
    const [seconds, setSeconds] = React.useState(0);
    const [textInput, setTextInput] = React.useState("");
    const [activeTab, setActiveTab] = React.useState('Session'); 
    const [showTrustMsg, setShowTrustMsg] = React.useState(false);
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
    const onToggleDisable = () => {
        setDisabled(!disabled);
        addActivity(disabled ? "System Restored" : "System Paused", "⚠️");
    };
    const noteRef = useRef();
    const [currentNote, setCurrentNote] = useState("");
    const [isViewingHistory, setIsViewingHistory] = useState(false);
    const [savedNotes, setSavedNotes] = useState([]); // Stores { id, title, content, date }
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    // This ensures that when a simulation finishes, 
    // it hits BOTH the specific simulation state and the general history/vault state.
    const handleSaveSimulation = (data: any) => {
        setHistory(prev => [data, ...prev]);
    };

    const handleSaveNote = async () => {
        if (!currentNote.trim()) return;

        // 1. Generate Title from the first line or first 30 chars
        const firstLine = currentNote.split('\n')[0];
        const generatedTitle = firstLine.length > 25 ? firstLine.substring(0, 25) + "..." : firstLine;

        const newNote = {
            id: Date.now(),
            title: generatedTitle || "Untitled Strategic Note",
            content: currentNote,
            date: new Date().toLocaleDateString()
        };
        const noteData = {
            userId: auth.currentUser?.uid,
            title: generatedTitle || "Untitled Strategic Note",
            content: currentNote,
            date: new Date().toLocaleDateString(),
            createdAt: new Date() // Firestore timestamp
        };

        try {
            // --- THIS IS NUMBER 3 ---
            // Save to permanent Firestore "Memories" collection
            await addDoc(collection(firestore, "memories"), noteData);
            
            // Also update local state so the UI reacts immediately
            setSavedNotes([noteData, ...savedNotes]);
            setCurrentNote(""); 
            setShowHistory(true);
            addActivity(`Archived to Vault: ${noteData.title}`, "💎");
            
            alert("Strategy permanently archived in the Intel Vault.");
        } catch (err) {
            console.error("Firestore Save Error:", err);
            alert("Failed to archive. Check console.");
        }  

        setSavedNotes([newNote, ...savedNotes]);
        setCurrentNote(""); // Clear editor after saving
        setShowHistory(true); // Show them their success
        if (typeof addActivity === 'function') {
            addActivity(`Saved Note: ${newNote.title}`, "💾");
        }
        alert("Strategy Saved to Intel Vault.");
    };

    const handleDeleteNote = (id) => {
        const updatedNotes = savedNotes.filter(note => note.id !== id);
        setSavedNotes(updatedNotes);
        
        // Optional: Add activity log for the delete
        if (typeof addActivity === 'function') {
            addActivity("Deleted a note from Vault", "🗑️");
        }
    };
    
    useEffect(() => {
        // 3. Put the user logic INSIDE the useEffect
        const currentUser = auth.currentUser;

        if (currentUser && db) { 
            const userDbRef = dbRef(db, `users/${currentUser.uid}/brandData`);
            
            const unsubscribe = onValue(userDbRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setUserBrand(prev => ({
                        ...prev,
                        ...data 
                    }));
                }
            });

            return () => unsubscribe();
        }
    }, []);

    const [showUserMenu, setShowUserMenu] = React.useState(false);
    const handleLogout = async () => {
        try {
            await signOut(auth);
            // App.jsx will automatically see the user is null and show the login screen
            console.log("User signed out successfully");
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };
    
    const [userBrand, setUserBrand] = useState({
        name: "Connecting...",
        context: "",
        profilePic: null,
        currency: "Euro (€)",
        language: "English (US)",
        tier: "Basic Free Tier",
        status: "CEO / Founder"
    });

    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const content = `
                <html>
                    <head>
                        <title>Strategic Intel Export</title>
                        <style>
                            body { font-family: monospace; padding: 40px; background: white; color: black; }
                            h1 { color: #bf00ff; border-bottom: 2px solid #bf00ff; padding-bottom: 10px; }
                            .meta { color: #666; font-size: 12px; margin-bottom: 30px; }
                            .note-body { white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
                        </style>
                    </head>
                    <body>
                        <h1>STRATEGIC SESSION NOTES</h1>
                        <div class="meta">
                            <strong>SOURCE:</strong> ${userEmail || 'ARCHIVE_USER'}<br>
                            <strong>TIMESTAMP:</strong> ${new Date().toLocaleString()}
                        </div>
                        <div class="note-body">${currentNote}</div>
                    </body>
                </html>
            `;
            printWindow.document.write(content);
            printWindow.document.close();
            
            // Wait a tiny bit for the styles to load, then trigger print
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    const businessContent = useMemo(() => [
        { type: 'text', value: "Execution is everything." },
        { type: 'image', value: "/Transform your practice with data-driven….png" }, // Make sure names are simple!
        { type: 'text', value: "Solve a real problem, build a real business." },
        { type: 'text', value: "Growth happens outside the comfort zone." },
        { type: 'image', value: "/social media managing.png" },
        { type: 'text', value: "Don't build a product; solve a problem. The product is just the vehicle." },
        { type: 'image', value: "/Best investment strategies for 2026.png" },
        { type: 'image', value: "/Starting and growing profitable business in….png" },
        { type: 'text', value: "Your network is your net worth. Build bridges before you need to cross them." },
        { type: 'image', value: "/Boost business with social media marketing.png" },
        { type: 'image', value: "/Simple Investing Tips for a Richer Future.png" },
        { type: 'text', value: "The biggest risk is taking no risk at all in a rapidly changing world." }

        // ... all your other items
    ], []);

        

    const ActionPill = ({ icon, label, onClick, color = 'white' }: any) => (
        <button 
            onClick={onClick}
            style={{
                ...btnReset,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                color: color,
                fontSize: '13px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
        >
            <span>{icon}</span>
            {label}
        </button>
    );
   

    // Consistent with React.useState
    const [activities, setActivities] = React.useState([{ 
        id: Date.now(), 
        text: "System Ready", 
        icon: "✨", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }]);

    const [activityIcon, setActivityIcon] = React.useState("✨");
    const fileInputRef = React.useRef(null);
    const username = "User";

    // --- HELPER TO LOG NEW ACTIVITIES ---
    const addActivity = (text, icon = "✨") => {
        const newEntry = {
            id: Date.now(),
            text: text,
            icon: icon,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        // This spreads the existing activities and puts the NEW one at the top
        setActivities(prev => [newEntry, ...prev]);
    };
    
    const appIconStyle: React.CSSProperties = {
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        cursor: 'pointer',
        transition: 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)'
    };

    const iconBackground: React.CSSProperties = {
        width: '60px',
        height: '60px',
        margin: '0 auto 8px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 15px rgba(0,0,0,0.2)'
    };

    const iconLabelStyle: React.CSSProperties = {
        fontSize: '11px', 
        fontWeight: '500', 
        color: 'white',
        textAlign: 'center'
    }; 
    

    // Placeholder logic (Replace with your real props/hooks later)
    const [disabled, setDisabled] = React.useState(false);
    

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

    
    // Add this inside Malvinui to auto-persist the memories
    useEffect(() => {
        const saved = localStorage.getItem('malvin_history');
        if (saved) setHistory(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('malvin_history', JSON.stringify(history));
    }, [history]);

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
    
    const [brandData, setBrandData] = useState<any>(null);
    const SidebarBtn = ({ children, label, isActive, onClick }: any) => (
        <button 
            onClick={onClick}
            style={{ ...btnReset, display: 'flex',alignItems: 'center', padding: '10px 14px', borderRadius: '12px', color: 'white', fontSize: '14px', gap: '12px', transition: 'all 0.2s ease', cursor: 'pointer', width: '100%',
                backgroundColor: isActive ? 'rgba(191, 0, 255, 0.1)' : 'transparent',
                
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
    
    if (!userBrand) {
        return (
            <div style={{ 
                height: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: '#000', 
                color: '#bf00ff',
                fontFamily: 'sans-serif' 
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ marginBottom: '10px' }}>⚡</div>
                    <p>Initializing Malvin...</p>
                </div>
            </div>
        );
    }
    
    

    return (
        <>
           {/* CASE A: FULL SCREEN MEMORIES TAKEOVER */}
            {activeTab === 'Settings' ? (
                <Settings 
                    userBrand={userBrand} 
                    setUserBrand={setUserBrand} 
                    onBack={() => setActiveTab('Session')} // Goes back to main view 
                    onSave={(updatedBrand) => {
                        setUserBrand(updatedBrand);
                        setBrandData(updatedBrand); // If you still use brandData elsewhere
                        setActiveTab('Session');
                    }}
                />
            ) : activeTab === 'Memories' ? (
                <Memories 
                   onBack={() => setActiveTab('Session')}
                   savedSimulations={savedSimulations}
                   data={history}
                />
            ) : activeTab === 'Calculator' ? (
                <MarginCalculator onBack={() => setActiveTab('Session')} />
            ) : activeTab === 'MainDashboard' ? (
                <MainDashboard onBack={() => setActiveTab('Session')} 
                userBrand={userBrand} />
            ) : activeTab === 'Trends' ? (
                <MarketTrends 
                 onBack={() => setActiveTab('Session')} 
                 userBrand={userBrand}
                />
            ) : activeTab === 'Runway' ? (
                <Runway
                   onBack={() => setActiveTab('Session')} 
                />
            ) : activeTab === 'Simulator' ? (
                <Simulator 
                   onBack={() => setActiveTab('Session')} 
                   onSave={handleSaveSimulation}
                />
            ) : (
                <div className="main-full-ui" style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: "black" }}> 
                    <GlobalStyles />
                    <div className="background-blobs">
                        <div className="blob purple"></div>
                        <div className="blob blue"></div>
                        <div className="blob pink"></div>
                    </div>
                    {showTools && (
                        <div 
                            onClick={() => setShowTools(false)} // Close when clicking outside
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 100,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0,0,0,0.2)' // Dim the background slightly
                            }}
                        >
                            {/* THE GLASS CONTAINER */}
                            <div 
                                onClick={(e) => e.stopPropagation()} 
                                style={{
                                    width: '280px',
                                    padding: '24px',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    backdropFilter: 'blur(30px)',
                                    WebkitBackdropFilter: 'blur(30px)',
                                    borderRadius: '38px', // More rounded for that Apple feel
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)', 
                                    gap: '20px',
                                    boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                                }}
                            >
                                {/* SIMULATIONS APP ICON */}
                                <div 
                                    onClick={() => {
                                        setActiveTab('Simulator');
                                        setShowTools(false);
                                        addActivity("Launched Simulator", "🎮");
                                    }}
                                    style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)' 
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        margin: '0 auto 8px',
                                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                        borderRadius: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 10px 20px rgba(168, 85, 247, 0.3)'
                                    }}>
                                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                        </svg>
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: '500', color: 'white' }}>
                                        Simulate
                                    </span>
                                </div>
                                
                                {/* 1. CALCULATOR: UNIT ECONOMICS */}
                                <div 
                                    onClick={() => { setActiveTab('Calculator'); setShowTools(false); addActivity("Opened Margin Calc", "🧮"); }}
                                    style={appIconStyle}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <div style={{ ...iconBackground, background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <rect x="4" y="2" width="16" height="20" rx="2" />
                                            <line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" />
                                            <path d="M8 14h2m4 0h2m-6 4h2m4 0h2" />
                                        </svg>
                                    </div>
                                    <span style={iconLabelStyle}>Margins</span>
                                </div>

                                {/* 2. TRENDS: MARKET PULSE */}
                                <div 
                                    onClick={() => { setActiveTab('Trends'); setShowTools(false); addActivity("Checked Trends", "📈"); }}
                                    style={appIconStyle}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <div style={{ ...iconBackground, background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <path d="M23 6l-9.5 9.5-5-5L1 18" /><polyline points="17 6 23 6 23 12" />
                                        </svg>
                                    </div>
                                    <span style={iconLabelStyle}>Trends</span>
                                </div>

                                {/* 3. CASHFLOW: BURN SENTRY */}
                                <div 
                                    onClick={() => { setActiveTab('Runway'); setShowTools(false); addActivity("Audited Cashflow", "🔥"); }}
                                    style={appIconStyle}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <div style={{ ...iconBackground, background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                        </svg>
                                    </div>
                                    <span style={iconLabelStyle}>Runway</span>
                                </div>

                                {/* Placeholder for more apps */}
                                <div style={{ opacity: 0.3 }}>
                                    <div style={{ width: '60px', height: '60px', margin: '0 auto 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '14px' }} />
                                    <span style={{ fontSize: '11px' }}>Coming...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* 1. LEFT */}
                    <div className="left-section" style={{ flex: 1, display: 'flex', borderRight: '1px solid #222', padding: '20px', gap: '10px', flexDirection: 'column'}}>
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
                            <SidebarBtn 
                                label="Memories"
                                isActive={activeTab === 'Memories'} 
                                onClick={() => {
                                    // 1. Switch the view to the Vault
                                    setActiveTab('Memories');
                                    
                                    // 2. Add the activity notification to your log
                                    addActivity("Opened memories", "🧠");
                                    
                                    // 3. Update the global status icon
                                    setActivityIcon("🧠");
                                }}
                            >
                                {/* Updated to a "Brain" icon for better iPhone-style consistency */}
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.79-2.74 2.5 2.5 0 0 1-2-4.7 2.5 2.5 0 0 1 2-4.7 2.5 2.5 0 0 1 2.79-2.74A2.5 2.5 0 0 1 9.5 2Z"/>
                                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.79-2.74 2.5 2.5 0 0 0 2-4.7 2.5 2.5 0 0 0-2-4.7 2.5 2.5 0 0 0-2.79-2.74A2.5 2.5 0 0 0 14.5 2Z"/>
                                </svg>
                            </SidebarBtn>

                            <SidebarBtn label="Dashboard"
                                isActive={activeTab === 'Dashboard'} 
                                onClick={() => setActiveTab('MainDashboard')}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            </SidebarBtn>

                            <SidebarBtn label="Tools"
                                isActive={activeTab === 'Tools'} 
                                onClick={() => {
                                    setActiveTab('Tools');
                                    setShowTools(!showTools); // Toggles the glass pop-out
                                    addActivity("Accessed Toolset", "🛠️");
                                }}>
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
                                onClick={() => {setActiveTab('Settings');
                                     // 2. Add the activity notification to your log
                                    addActivity("Settings", "⚙️");
                                    
                                    // 3. Update the global status icon
                                    setActivityIcon("⚙️");
                                }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                            </SidebarBtn>
                            <SidebarBtn 
                                label="Notes" 
                                isActive={activeTab === 'Notes'} 
                                onClick={() => {
                                    // 1. Switch the tab
                                    setActiveTab('Notes');
                                    
                                    // 2. Add the activity notification
                                    addActivity("Opened Notes", "📝");
                                    
                                    // 3. Update the status icon (if you're using that state)
                                    setActivityIcon("📝");
                                }}
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
                            <div className="left buttom-panel" style={{ 
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
                            {/* --- THE USER PANEL SECTION --- */}
                            <div style={{ position: 'relative', width: '100%', marginTop: 'auto' }}>

                                {/* 🚪 LOGOUT POPUP MENU */}
                                {showUserMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '100%', 
                                        left: '0',
                                        right: '0',
                                        marginBottom: '10px',
                                        backgroundColor: 'rgba(15, 15, 15, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        borderRadius: '12px',
                                        padding: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                        zIndex: 100
                                    }}>
                                        <button 
                                            onClick={handleLogout} // 👈 TRIGGERS FIREBASE SIGNOUT
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                backgroundColor: 'rgba(255, 59, 48, 0.15)',
                                                border: '1px solid rgba(255, 59, 48, 0.3)',
                                                borderRadius: '8px',
                                                color: '#ff3b30',
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '10px'
                                            }}
                                        >
                                            LOG OUT
                                        </button>
                                    </div>
                                )}

                                {/* 👤 THE USER PANEL TRIGGER */}
                                <div 
                                    className="left-user-panel" 
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    style={{ 
                                        padding: '15px 20px',
                                        flexDirection: 'column', 
                                        display: 'flex',
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        backdropFilter: 'blur(12px)',
                                        borderRadius: '16px',
                                        border: showUserMenu ? '1px solid #bf00ff' : '1px solid rgba(255, 255, 255, 0.1)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                > 
                                    <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                                        {userEmail?.split('@')[0] || "Guest User"} 
                                    </div>
                                    <div style={{ color: 'white', fontSize: '11px', opacity: 0.4, marginTop: '4px' }}>
                                        {userEmail}
                                    </div>
                                </div> 
                            </div>     
                        </div>
                        
                    </div>

                    {/* 2. MIDDLE */}
                    <div className="middle-section" style={{ flex: 4, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '40px' }}>
                        {/* 🏝️ THE VOICE ISLAND ANCHOR */}
                        <div style={{ 
                            position: 'absolute', 
                            top: '20px', 
                            zIndex: 100, 
                            width: '100%', 
                            display: 'flex', 
                            justifyContent: 'center' 
                        }}>
                            <MalvinVoiceIsland 
                                agent={agent} 
                                disabled={disabled} 
                                onToggleDisable={onToggleDisable} 
                                activitySignal={seconds}
                            />
                        </div>
                        {/* THE SMOKE AREA */}
                        <AuraBackground />
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
                        
                        <VideoStage />
                        <div style={{ display: 'flex', position: 'absolute', bottom: '90px', left: '50%', transform: 'translateX(-50%)', alignItems: 'center', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '850px', zIndex: 10 }}>
                            {activeTab === 'Notes' ? (
                                /* 📝 THE STRATEGIC NOTEPAD (Shows when Notes is clicked) */
                                <div style={{ 
                                    ...glassStyle, width: '100%', height: '600px', 
                                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                                    border: '1px solid rgba(191, 0, 255, 0.3)', // Purple Malvin Tint
                                    animation: 'fadeIn 0.4s ease-out'
                                }}>
                                    {/* NOTEPAD HEADER */}
                                    <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                            <span style={{ color: '#bf00ff', fontWeight: '900', fontSize: '10px', letterSpacing: '2px' }}>INTEL DRAFT</span>
                                            {savedNotes.length > 0 && (
                                                <button 
                                                    onClick={() => setShowHistory(!showHistory)}
                                                    style={{ ...btnReset, color: 'rgba(255,255,255,0.5)', fontSize: '10px', cursor: 'pointer', borderBottom: '1px solid' }}
                                                >
                                                    {showHistory ? "CLOSE HISTORY" : `PREVIOUS NOTES (${savedNotes.length})`}
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={handleSaveNote} style={{...smallActionStyle, border: '1px solid #bf00ff'}}>SAVE TO VAULT</button>
                                            <button onClick={exportToPDF} style={smallActionStyle}>EXPORT PDF</button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                                        {/* PREVIOUS NOTES SIDE-BAR */}
                                        {showHistory && savedNotes.length > 0 && (
                                            <div style={{ width: '220px', borderRight: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)', overflowY: 'auto', padding: '10px' }}>
                                                {savedNotes.map(note => (
                                                    <div 
                                                        key={note.id} 
                                                        onClick={() => setCurrentNote(note.content)}
                                                        style={{ 
                                                            padding: '12px', 
                                                            borderRadius: '8px', 
                                                            marginBottom: '8px', 
                                                            backgroundColor: 'rgba(255,255,255,0.05)', 
                                                            cursor: 'pointer', 
                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                            display: 'flex',          // Added flex to align text and button
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center',
                                                            transition: 'background 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                                    >
                                                        <div style={{ overflow: 'hidden' }}>
                                                            
                                                            <div ref={noteRef} style={{ fontSize: '11px', color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                                {note.title}
                                                            </div>
                                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                                                                {note.date}
                                                            </div>
                                                        </div>

                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Prevents the note from opening when you click delete
                                                                handleDeleteNote(note.id);
                                                            }}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: 'rgba(255, 77, 77, 0.6)', // Slightly faded red
                                                                cursor: 'pointer',
                                                                padding: '4px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.color = '#ff4d4d'} // Bright red on hover
                                                            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 77, 77, 0.6)'}
                                                            title="Delete Note"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* THE TYPEWRITER EDITOR */}
                                        <textarea 
                                            value={currentNote}
                                            onChange={(e) => setCurrentNote(e.target.value)}
                                            placeholder="Type your strategic mission details here..."
                                            style={{
                                                flex: 1, padding: '25px', backgroundColor: 'transparent', border: 'none',
                                                color: 'white', fontSize: '15px', outline: 'none', resize: 'none',
                                                fontFamily: 'monospace', lineHeight: '1.6', caretColor: '#bf00ff', height: '60vh'
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/*center*/}
                                    <div style={{ display: 'flex', position: 'absolute', bottom: '90px', left: '50%', transform: 'translateX(-50%)', alignItems: 'center', flexDirection: 'column',  gap: '8px', width: '100%', maxWidth: '850px', zIndex: 10 }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            gap: '20px', 
                                            width: '100%', 
                                            maxWidth: '850px', 
                                            marginBottom: '25px',
                                            zIndex: 10 
                                        }}>
                                            {/* CARD 1: STRATEGY & QUOTES */}
                                            <div style={{ ...glassStyle, flex: 1, padding: '5px', Height: '180px', overflow: 'hidden' }}>
                                            <MalvinHybridCycler content={businessContent} />
                                            </div>
                                            {/* CARD 2: VENTURE ANALYTICS */}
                                            <div style={{ ...glassStyle, flex: 1, padding: '24px', minHeight: '180px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: neonBlue, boxShadow: `0 0 10px ${neonBlue}` }} />
                                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', letterSpacing: '1.5px' }}>MARKET PULSE</span>
                                                </div>
                                                
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: 'white', opacity: 0.7, fontSize: '13px' }}>Startup Sentiment</span>
                                                        <span style={{ color: '#00ff88', fontSize: '13px', fontWeight: 'bold' }}>Bullish</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                                        <div style={{ width: '75%', height: '100%', backgroundColor: neonBlue, borderRadius: '2px', boxShadow: `0 0 10px ${neonBlue}` }} />
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                                                        <span style={{ color: 'white', opacity: 0.7, fontSize: '13px' }}>AI Integration Rate</span>
                                                        <span style={{ color: neonPurple, fontSize: '13px', fontWeight: 'bold' }}>+22%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ 
                                            display: 'flex', 
                                            gap: '12px', 
                                            marginBottom: '15px', 
                                            overflowX: 'auto', 
                                            padding: '5px',
                                            width: '100%',
                                            maxWidth: '600px',
                                            scrollbarWidth: 'none' // Hides scrollbar on Firefox
                                        }}>
                                            <style>{`div::-webkit-scrollbar { display: none; }`}</style>

                                            <ActionPill icon="💡" label="Create an Idea" onClick={() => setTextInput("I have a new business idea...")} />
                                            <ActionPill icon="📈" label="Work on my Plan" onClick={() => setTextInput("Let's review my current business plan.")} />
                                            <ActionPill icon="💎" label="Go Premium" color={premiumGold} onClick={() => setShowExtras(true)} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        {/* bottom */}
                        <div style={{gap: '10px', display: 'flex', alignItems: 'center',  width: '100%', justifyContent: 'center', marginBottom: '-14px'}}>
                            {/* pill */}
                            <div className="input-pill" style={{ display: 'flex', alignItems: 'center', background: '#211f31', padding: '10px 20px', width: '600px', backgroundColor: 'rgba(255, 255, 255, 0.03)',   // 1. Semi-transparent white
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
                                                style={btnReset} 
                                                onClick={async () => {
                                                    const newState = !localParticipant.isCameraEnabled;
                                                    await localParticipant.setCameraEnabled(newState);
                                                    
                                                    // Update both the single state and the history log
                                                    setCurrentActivity(newState ? "Camera Live" : "Camera Off");
                                                    setActivityIcon(newState ? "📷" : "🚫");
                                                    addActivity(newState ? "Camera Activated" : "Camera Deactivated", newState ? "📷" : "🚫");
                                                }}
                                            >
                                                <CameraIcon enabled={!!localParticipant?.isCameraEnabled} />
                                            </button>

                                            {/* SCREENSHARE BUTTON */}
                                            <button 
                                                style={btnReset} 
                                                onClick={async () => {
                                                    try {
                                                        if (!localParticipant) return;
                                                        const isSharing = !localParticipant.isScreenShareEnabled;
                                                        await localParticipant.setScreenShareEnabled(isSharing);
                                                        
                                                        addActivity(isSharing ? "Screen Sharing Started" : "Screen Sharing Stopped", "🖥️");
                                                        setActivityIcon(isSharing ? "🖥️" : "⏹️");
                                                    } catch (error) {
                                                        console.error("Screen share failed:", error);
                                                        addActivity("Screen Share Denied", "⚠️");
                                                    }
                                                }} // <--- Use only TWO here. One for the 'try/catch', one for the 'onClick'.
                                            >
                                                <ScreenShareIcon enabled={!!localParticipant?.isScreenShareEnabled} />
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
                            {/* mic */}
                            {/* MIC BUTTON HOUSING */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                // Neon Gradient: Dark Blue to Purple
                                background: 'linear-gradient(135deg, #001f3f 0%, #6a0dad 100%)',
                                // Neon Glow effect
                                boxShadow: localParticipant?.isMicrophoneEnabled 
                                    ? '0 0 15px rgba(0, 112, 255, 0.6), 0 0 20px rgba(160, 32, 240, 0.4)' 
                                    : 'none',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                opacity: localParticipant?.sid ? 1 : 0.3, // Dim it until connected
                                pointerEvents: localParticipant?.sid ? 'auto' : 'none', // Disable clicks
                                transition: 'opacity 0.5s ease'
                                
                            }}>
                                <button 
                                    style={{
                                        ...btnReset,
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                    onClick={async () => {
                                        // 1. HARD GUARD: If these are undefined, the engine isn't ready.
                                        if (!localParticipant || !localParticipant.sid) {
                                            console.warn("Connection not established. Please wait a moment.");
                                            addActivity("Connecting...", "⏳");
                                            return; 
                                        }

                                        try {
                                            const nextState = !localParticipant.isMicrophoneEnabled;
                                            
                                            // 2. Set a longer timeout or just await the engine
                                            await localParticipant.setMicrophoneEnabled(nextState);
                                            
                                            addActivity(nextState ? "Mic Unmuted" : "Mic Muted", nextState ? "🎙️" : "🔇");
                                            setActivityIcon(nextState ? "🎙️" : "🔇");
                                        } catch (error) {
                                            // If it still times out, we catch it here
                                            console.error("Mic unable to use:", error);
                                            addActivity("Mic Sync Error", "⚠️");
                                        }
                                    }}
                                >
                                    <MicIcon 
                                        // The "enabled" prop usually controls the cross-line in LiveKit icons
                                        enabled={!!localParticipant?.isMicrophoneEnabled} 
                                        style={{ 
                                            color: localParticipant?.isMicrophoneEnabled ? 'white' : 'rgba(255,255,255,0.4)',
                                            width: '24px',
                                            height: '24px',
                                            transition: 'color 0.3s ease'
                                        }} 
                                    />
                                </button>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                style={{ display: 'none' }} 
                                onChange={(e) => {
                                    try {
                                        const file = e.target.files?.[0];
                                        
                                        if (file) {
                                            // 1. Update the main status pill
                                            setCurrentActivity(`Uploaded: ${file.name}`);
                                            setActivityIcon("📁");

                                            // 2. Add to your new Activity History Log
                                            addActivity(`File Uploaded: ${file.name}`, "📁");

                                            // 3. Logic for actually handling the file (e.g., sending to server)
                                            console.log("File ready for processing:", file.name);
                                        }
                                    } catch (error) {
                                        // This catches unexpected errors
                                        console.error("File selection failed:", error);
                                        addActivity("File Upload Failed", "⚠️");
                                    }
                                    
                                    // Reset input so the user can upload the same file again if they want
                                    e.target.value = '';
                                }}
                            />
                            
                            
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="activities-panel" style={{ 
                                padding: '20px', 
                                minHeight: '120px',
                                maxHeight: '400px', // Prevents it from taking over the whole screen
                                overflowY: 'auto',   // Adds scrollbar when history gets long
                                display: 'flex',
                                flexDirection: 'column',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                scrollbarWidth: 'none' // Hides scrollbar for a cleaner look (Firefox)
                            }}>
                                <p style={{ color: 'white', margin: '0 0 15px 0', fontWeight: '400', opacity: 0.6, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Activity Log
                                </p>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {activities.map((item) => (
                                        <div key={item.id} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between',
                                            animation: 'fadeIn 0.3s ease-out' 
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                                                <span style={{ color: 'white', fontSize: '13px', fontWeight: '500' }}>{item.text}</span>
                                            </div>
                                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{item.time}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="Right-panel" style={{ flex: 2, padding: '15px', height: '100px', minHeight: '300px',
                                flexDirection: 'column', 
                                display: 'flex',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                backdropFilter: 'blur(12px)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}> 
                            <p style={{ fontSize: '12px', opacity: 0.6, marginBottom: '8px', paddingLeft: '5px' }}>
                                GALLERIA
                            </p>
                            {/* THE CYCLER GOES HERE */}
                            <div style={{ flex: 1, height: '300px', width: '100%', borderRadius: '14px', overflow: 'hidden', position: 'relative' }}>
                                <ImageCycler interval={4000} /> 
                            </div>
                        </div>       
                    </div>
                </div>
            )}
        </>    
    );
};

export default function Session({ token, serverUrl, userEmail, onDisconnect }: SessionProps) {
  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect={true} audio={true} video={false} onDisconnected={onDisconnect}>
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <Malvinui userEmail={userEmail} onDisconnect={onDisconnect} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}