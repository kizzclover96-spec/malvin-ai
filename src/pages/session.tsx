import { useState, useEffect, useRef, CSSProperties } from 'react';
import { ParticipantKind, Track } from 'livekit-client';
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
  useConnectionQuality,
} from '@livekit/components-react';

interface SessionProps {
  token: string;
  serverUrl: string;
  userEmail: string;
  onDisconnect: () => void;
}

const neonBlue = "#00d2ff";
const neonRed = "#ff3b30";
const premiumGold = "#FFD700";
const neonPurple = "#bf00ff";

// --- ICONS ---
const GearIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const StarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={premiumGold} stroke={premiumGold} strokeWidth="1" style={{ marginRight: '8px' }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={neonPurple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const CameraIcon = ({ enabled, size = 22 }: { enabled?: boolean, size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled === false ? 0.4 : 1 }}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

const ClipIcon = ({ size = 22, animated = false }: { size?: number, animated?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: animated ? 'swing 2s ease-in-out infinite' : 'none', transformOrigin: 'top center' }}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const MicIcon = ({ enabled, size = 22 }: { enabled?: boolean, size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled === false ? 0.4 : 1 }}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
  </svg>
);

// --- NETWORK STRIP COMPONENT ---
const NetworkStrip = () => {
  const { localParticipant } = useLocalParticipant();
  const quality = useConnectionQuality(localParticipant);

  const getStatusColor = () => {
    switch (quality) {
      case 'excellent': case 'good': return '#4cd964'; // Green
      case 'poor': return '#ffcc00'; // Yellow
      default: return '#ff3b30'; // Red
    }
  };

  return (
    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
      <div style={{ width: '60px', height: '3px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ 
          width: quality === 'excellent' ? '100%' : quality === 'good' ? '70%' : '30%', 
          height: '100%', backgroundColor: getStatusColor(), transition: 'all 0.5s ease',
          boxShadow: `0 0 8px ${getStatusColor()}`
        }} />
      </div>
      <span style={{ fontSize: '7px', color: getStatusColor(), fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {quality || 'connecting'}
      </span>
    </div>
  );
};

// --- ANIMATED FEATURE ICONS ---
const BrowserIcon = ({ size = 60 }) => (
  <div style={{ position: 'relative' }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    <div style={{ position: 'absolute', top: '50%', left: '15%', width: '70%', height: '2px', background: neonBlue, boxShadow: `0 0 10px ${neonBlue}`, animation: 'scan 2s linear infinite' }} />
  </div>
);
const LocationIcon = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'bounce 1s infinite alternate' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
);
const CookbookIcon = ({ size = 60 }) => (
  <div style={{ position: 'relative' }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    <div style={{ position: 'absolute', right: '10px', top: '5px', width: '20px', height: '40px', borderLeft: `1.5px solid ${neonBlue}`, animation: 'flip 1.5s infinite', transformOrigin: 'left' }} />
  </div>
);
const BrainstormIcon = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'pulseGlow 2s infinite' }}><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>
);
const ScreenShareIcon = ({ size = 60 }) => (
  <div style={{ position: 'relative' }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><polyline points="8 21 12 17 16 21"/></svg>
    <div style={{ position: 'absolute', top: '6px', left: '6px', width: '12px', height: '8px', border: `1px solid ${neonBlue}`, animation: 'blink 2s infinite' }} />
  </div>
);
const NoteIcon = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'float 3s ease-in-out infinite' }}><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/></svg>
);
const StyleIcon = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'rotate 4s linear infinite' }}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
);

// --- COMPONENT: FEATURE SHOWCASE ---
const FeatureShowcase = () => {
  const [step, setStep] = useState(0);
  const features = [
    { word: "SIGHT", icon: <CameraIcon size={60} /> },
    { word: "SPEECH", icon: <MicIcon size={60} enabled={true} /> },
    { word: "ATTACH", icon: <ClipIcon size={60} animated={true} /> },
    { word: "BROWSE", icon: <BrowserIcon size={60} /> },
    { word: "LOCATE", icon: <LocationIcon size={60} /> },
    { word: "COOK", icon: <CookbookIcon size={60} /> },
    { word: "NOTES", icon: <NoteIcon size={60} /> },
    { word: "STYLE", icon: <StyleIcon size={60} /> },
    { word: "STREAM", icon: <ScreenShareIcon size={60} /> },
    { word: "IDEATE", icon: <BrainstormIcon size={60} /> },
  ];

  useEffect(() => {
    const timer = setInterval(() => setStep(s => (s + 1) % features.length), 2000);
    return () => clearInterval(timer);
  }, [features.length]);

  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 12, pointerEvents: 'none' }}>
      <style>{`
        @keyframes fadeInOut { 0%, 100% { opacity: 0; transform: scale(0.9); } 20%, 80% { opacity: 1; transform: scale(1); } }
        @keyframes swing { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
        @keyframes flip { 0% { transform: rotateY(0deg); opacity: 0; } 50% { opacity: 1; } 100% { transform: rotateY(-180deg); opacity: 0; } }
        @keyframes scan { 0% { transform: translateY(-15px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(15px); opacity: 0; } }
        @keyframes pulseGlow { 0%, 100% { filter: drop-shadow(0 0 2px ${neonBlue}); } 50% { filter: drop-shadow(0 0 15px ${neonBlue}); } }
        @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-10px); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes premiumGlow { 0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.2); } 50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.5); } }
        @keyframes purpleGlow { 0%, 100% { box-shadow: 0 0 5px rgba(191, 0, 255, 0.2); } 50% { box-shadow: 0 0 15px rgba(191, 0, 255, 0.5); } }
      `}</style>
      <div key={step} style={{ animation: 'fadeInOut 2s infinite', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {features[step].icon}
        <span style={{ marginTop: '20px', fontSize: '10px', color: neonBlue, letterSpacing: '4px', fontWeight: '900', textTransform: 'uppercase' }}>
          {features[step].word}
        </span>
      </div>
    </div>
  );
};

// --- AI FACE PILL ---
function MalvinVoiceIsland({ agent, disabled, onToggleDisable }: any) {
  const isAgentSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!disabled) { setBlink(true); setTimeout(() => setBlink(false), 150); }
    }, 4000);
    return () => clearInterval(interval);
  }, [disabled]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div onClick={onToggleDisable} style={{
        width: '110px', height: '42px', backgroundColor: 'rgba(10, 10, 10, 0.95)',
        borderRadius: '21px', border: `1.5px solid ${disabled ? neonRed : neonBlue}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        boxShadow: disabled ? `0 0 15px ${neonRed}44` : isAgentSpeaking ? `0 0 15px ${neonBlue}55` : `0 0 5px ${neonBlue}22`,
      }}>
        <svg width="45" height="18" viewBox="0 0 60 20">
          {disabled ? <text x="12" y="15" fill={neonRed} fontSize="14" fontWeight="bold">OFFLINE</text> : (
            <>
              <rect x="12" y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
              <rect x="38" y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
            </>
          )}
        </svg>
      </div>
      <NetworkStrip />
    </div>
  );
}

// --- MAIN VIDEO STAGE ---
function VideoStage({ onDisconnect, userEmail }: { onDisconnect: () => void, userEmail: string }) {
  const [textInput, setTextInput] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'appearance' | 'system'>('notes');
  const [notes, setNotes] = useState<string[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [bgBlur, setBgBlur] = useState(0);

  const { localParticipant } = useLocalParticipant();
  const { send, chatMessages } = useChat();
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const bgInputRef = useRef<HTMLInputElement>(null);
  const storageKey = `malvin_session_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // SAVE/LOAD DATA
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.notes) setNotes(data.notes);
      if (data.backgroundImage) setBackgroundImage(data.backgroundImage);
      if (data.bgBlur !== undefined) setBgBlur(data.bgBlur);
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ notes, backgroundImage, bgBlur }));
  }, [notes, backgroundImage, bgBlur, storageKey]);

  // CAPTURE AI NOTES
  useEffect(() => {
    if (!localParticipant) return;
    const handleData = (payload: Uint8Array, _p: any, _k: any, topic?: string) => {
      if (topic === "note_update") {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (data.notes) setNotes(data.notes);
          else if (data.note) setNotes(prev => [...prev, data.note]);
        } catch (e) { console.error("Parse error", e); }
      }
    };
    localParticipant.on('dataReceived', handleData);
    return () => { localParticipant.off('dataReceived', handleData); };
  }, [localParticipant]);

  const resetAll = () => { if(window.confirm("Wipe all session data?")) { setNotes([]); setBackgroundImage(null); localStorage.removeItem(storageKey); } };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      {backgroundImage && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', filter: `blur(${bgBlur}px)`, zIndex: 1 }} />}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2 }} />
      
      {chatMessages.length === 0 && <FeatureShowcase />}

      {/* SETTINGS PANEL */}
      <div style={{ position: 'absolute', top: 0, left: isSettingsOpen ? 0 : '-320px', width: '280px', height: '100%', backgroundColor: 'rgba(10,10,10,0.98)', zIndex: 200, transition: '0.4s ease', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${neonBlue}33` }}>
        <div style={{ display: 'flex', marginTop: '70px', borderBottom: '1px solid #222' }}>
           {['notes', 'appearance', 'system'].map(t => (
             <div key={t} onClick={() => setActiveTab(t as any)} style={{ flex: 1, padding: '15px 0', textAlign: 'center', cursor: 'pointer', fontSize: '11px', color: activeTab === t ? neonBlue : '#444', borderBottom: activeTab === t ? `2px solid ${neonBlue}` : 'none' }}>{t.toUpperCase()}</div>
           ))}
        </div>
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {activeTab === 'notes' && notes.map((n, i) => <div key={i} style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', marginBottom: '8px', borderRadius: '6px', borderLeft: `2px solid ${neonBlue}`, fontSize: '12px' }}>{n}</div>)}
          
          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div><label style={{ fontSize: '9px', color: '#444' }}>ACCOUNT</label><div style={{ fontSize: '12px', color: neonBlue }}>{userEmail}</div></div>
              
              <button style={{ background: 'rgba(191,0,255,0.05)', border: `1px solid ${neonPurple}`, color: neonPurple, padding: '12px', borderRadius: '8px', fontWeight: 'bold', animation: 'purpleGlow 3s infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                <DashboardIcon /> DASHBOARD
              </button>

              <button style={{ background: 'rgba(255,215,0,0.05)', border: `1px solid ${premiumGold}`, color: premiumGold, padding: '12px', borderRadius: '8px', fontWeight: 'bold', animation: 'premiumGlow 3s infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                <StarIcon /> PREMIUM
              </button>

              <hr style={{ border: 'none', borderTop: '1px solid #222', margin: '5px 0' }} />
              <button onClick={() => alert("Chat cleared locally.")} style={{ background: 'none', border: '1px solid #333', color: '#888', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}><TrashIcon /> CLEAR CHAT</button>
              <button onClick={resetAll} style={{ background: 'none', border: `1px solid ${neonRed}44`, color: neonRed, padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>RESET ALL SESSION DATA</button>
            </div>
          )}
        </div>
      </div>

      <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 201, background: 'none', border: 'none', cursor: 'pointer' }}><GearIcon /></button>
      
      <div style={{ position: 'absolute', top: '25px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        <MalvinVoiceIsland agent={agent} disabled={disabled} onToggleDisable={() => setDisabled(!disabled)} />
      </div>

      <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '450px', height: '52px', background: 'rgba(15,15,15,0.95)', borderRadius: '26px', border: `1px solid ${neonBlue}`, display: 'flex', alignItems: 'center', padding: '0 15px', zIndex: 100 }}>
        <button onClick={onDisconnect} style={{ color: neonRed, background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px' }}>✕</button>
        <input placeholder="Say something..." value={textInput} onChange={e => setTextInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send?.(textInput)} style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none' }} />
      </div>
    </div>
  );
}

export default function Session(props: SessionProps) {
  return (
    <LiveKitRoom token={props.token} serverUrl={props.serverUrl} connect={true} audio={true}>
      <RoomAudioRenderer />
      <VideoStage {...props} />
    </LiveKitRoom>
  );
}