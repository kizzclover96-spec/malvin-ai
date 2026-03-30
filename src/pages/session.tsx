import { useState, useEffect, useRef, CSSProperties, useMemo } from 'react';
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
  useConnectionState,
} from '@livekit/components-react';

interface SessionProps {
  token: string;
  serverUrl: string;
  userEmail: string;
  onDisconnect: () => void;
}

const neonBlue = "#00d2ff";
const neonRed = "#ff3b30";
const neonPurple = "#bf00ff";
const premiumGold = "#FFD700";

// --- ICONS ---
const GearIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const StarIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={premiumGold} stroke={premiumGold} strokeWidth="1">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CameraIcon = ({ enabled, size = 22 }: { enabled?: boolean, size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled === false ? 0.4 : 1 }}>
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

const MicIcon = ({ enabled, size = 22 }: { enabled?: boolean, size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled === false ? 0.4 : 1 }}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
  </svg>
);

// --- FEATURE VISUALIZATIONS ---
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
const FeatureScreenShareIcon = ({ size = 60 }) => (
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
    { word: "STREAM", icon: <FeatureScreenShareIcon size={60} /> },
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
        @keyframes scan { 0% { transform: translateY(-15px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(15px); opacity: 0; } }
        @keyframes pulseGlow { 0%, 100% { filter: drop-shadow(0 0 2px ${neonBlue}); } 50% { filter: drop-shadow(0 0 15px ${neonBlue}); } }
        @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-10px); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes goldGlow { 0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.3); border-color: rgba(255, 215, 0, 0.5); } 50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.6); border-color: ${premiumGold}; } }
        @keyframes twinkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes dashboardGlow { 0%, 100% { box-shadow: 0 0 5px rgba(191, 0, 255, 0.2); border-color: rgba(191, 0, 255, 0.5); } 50% { box-shadow: 0 0 15px rgba(191, 0, 255, 0.5); border-color: ${neonPurple}; } }
        @keyframes pulseDead { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.92); } }
        @keyframes swing { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
        @keyframes flip { 0% { transform: rotateY(0deg); opacity: 0; } 50% { opacity: 1; } 100% { transform: rotateY(-180deg); opacity: 0; } }
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

// --- CHAT ---
const BackgroundChat = ({ visibleMessages }: { visibleMessages: any[] }) => {
  const { localParticipant } = useLocalParticipant();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleMessages]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div ref={scrollRef} style={{ width: '90%', maxWidth: '450px', padding: '120px 10px 180px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'auto', maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}>
        {visibleMessages.map((msg, index) => {
          const isMe = !msg.from || msg.from.identity === localParticipant?.identity;
          return (
            <div key={index} style={{ maxWidth: '85%', alignSelf: !isMe ? 'flex-start' : 'flex-end', display: 'flex', flexDirection: 'column', alignItems: !isMe ? 'flex-start' : 'flex-end' }}>
              <div style={{ padding: '10px 16px', borderRadius: '18px', backgroundColor: !isMe ? 'rgba(245, 245, 245, 0.92)' : `${neonBlue}E6`, color: !isMe ? '#111' : '#fff', fontSize: '0.92rem', boxShadow: '0 4px 15px rgba(0,0,0,0.25)', borderBottomLeftRadius: !isMe ? '4px' : '18px', borderBottomRightRadius: !isMe ? '18px' : '4px' }}>
                {msg.message}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- AI FACE ---
function MalvinVoiceIsland({ agent, disabled, onToggleDisable }: any) {
  const isAgentSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => { if (!disabled) { setBlink(true); setTimeout(() => setBlink(false), 150); } }, 4000);
    return () => clearInterval(interval);
  }, [disabled]);

  return (
    <div onClick={onToggleDisable} style={{ width: '110px', height: '42px', backgroundColor: 'rgba(10, 10, 10, 0.9)', borderRadius: '21px', border: `1.5px solid ${disabled ? neonRed : neonBlue}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: disabled ? `0 0 20px ${neonRed}77` : isAgentSpeaking ? `0 0 15px ${neonBlue}55` : `0 0 5px ${neonBlue}22` }}>
      {disabled ? (
        <svg width="45" height="18" viewBox="0 0 60 20" style={{ animation: 'pulseDead 2s infinite' }}><text x="10" y="15" fill={neonRed} fontSize="16" fontWeight="bold">X</text><text x="36" y="15" fill={neonRed} fontSize="16" fontWeight="bold">X</text></svg>
      ) : (
        <svg width="45" height="18" viewBox="0 0 60 20">
          <rect x="12" y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
          <rect x="38" y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
        </svg>
      )}
    </div>
  );
}

// --- VIDEO STAGE ---
function VideoStage({ onDisconnect, userEmail }: { onDisconnect: () => void, userEmail: string }) {
  const [textInput, setTextInput] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'appearance' | 'system'>('notes');
  const [notes] = useState<string[]>([]);
  
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  const { send, chatMessages } = useChat();
  const connectionState = useConnectionState();
  
  const tracks = useTracks([{ source: Track.Source.Camera, pks: [localParticipant?.identity || ''] }, { source: Track.Source.ScreenShare, pks: [localParticipant?.identity || ''] }]);
  const cameraTrack = tracks.find(t => t.source === Track.Source.Camera);
  const screenTrack = tracks.find(t => t.source === Track.Source.ScreenShare);

  const btnReset: CSSProperties = { background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* DASHBOARD MODAL */}
      {isDashboardOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '80%', maxWidth: '600px', background: '#0a0a0a', border: `1px solid ${neonPurple}`, borderRadius: '20px', padding: '40px' }}>
            <h2 style={{ color: neonPurple, marginTop: 0, letterSpacing: '4px' }}>DASHBOARD</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
              <div style={{ padding: '15px', background: 'rgba(191,0,255,0.05)', borderRadius: '10px' }}>
                <div style={{ fontSize: '10px', color: neonPurple }}>ACTIVE NOTES</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{notes.length}</div>
              </div>
            </div>
            <button onClick={() => setIsDashboardOpen(false)} style={{ marginTop: '40px', width: '100%', background: neonPurple, border: 'none', color: '#fff', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>BACK TO SESSION</button>
          </div>
        </div>
      )}

      {/* MEDIA */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
        {screenTrack ? <VideoTrack trackRef={screenTrack} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : cameraTrack && localParticipant?.isCameraEnabled ? <VideoTrack trackRef={cameraTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
      </div>

      <BackgroundChat visibleMessages={chatMessages} />
      {chatMessages.length === 0 && <FeatureShowcase />}

      {/* SIDEBAR */}
      <div style={{ position: 'absolute', top: 0, left: isSettingsOpen ? 0 : '-320px', display: isSettingsOpen ? 'flex' : 'none', width: '280px', height: '100%', backgroundColor: 'rgba(10,10,10,0.98)', borderRight: `1px solid ${neonBlue}44`, zIndex: 200, flexDirection: 'column' }}>
        <div style={{ display: 'flex', marginTop: '70px', padding: '0 20px', borderBottom: '1px solid #222' }}>
           {['notes', 'appearance', 'system'].map((t) => (
             <div key={t} onClick={() => setActiveTab(t as any)} style={{ flex: 1, padding: '10px 0', textAlign: 'center', cursor: 'pointer', fontSize: '11px', color: activeTab === t ? neonBlue : '#444', borderBottom: activeTab === t ? `2px solid ${neonBlue}` : 'none' }}>{t.toUpperCase()}</div>
           ))}
        </div>
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', color: '#555' }}>NETWORK</span>
                  <span style={{ fontSize: '10px', color: connectionState === 'connected' ? '#00ff00' : neonRed }}>{connectionState.toUpperCase()}</span>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#555' }}>ACCOUNT</label>
                  <div style={{ fontSize: '13px', color: neonBlue }}>{userEmail}</div>
                </div>
                <button onClick={() => setIsDashboardOpen(true)} style={{ background: 'rgba(191, 0, 255, 0.1)', border: `1px solid ${neonPurple}`, color: neonPurple, padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', animation: 'dashboardGlow 3s infinite' }}>DASHBOARD</button>
            </div>
          )}
        </div>
      </div>

      {/* TOP BAR */}
      <div style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 201, display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={btnReset}><GearIcon /></button>
        <button style={{ position: 'relative', background: 'rgba(255,215,0,0.1)', border: `1px solid ${premiumGold}`, color: premiumGold, padding: '6px 14px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', animation: 'goldGlow 3s infinite' }}>
          <div style={{ position: 'absolute', top: '-6px', left: '-6px', animation: 'twinkle 2s infinite' }}><StarIcon size={12} /></div>
          GO PREMIUM
        </button>
      </div>

      <div style={{ position: 'absolute', top: '25px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        {agent && <MalvinVoiceIsland agent={agent} disabled={disabled} onToggleDisable={() => setDisabled(!disabled)} />}
      </div>

      {/* BOTTOM CONTROL BAR */}
      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        <div style={{ width: '90%', maxWidth: '450px', height: '52px', backgroundColor: 'rgba(15,15,15,0.95)', borderRadius: '26px', border: `1px solid ${disabled ? '#333' : neonBlue}`, display: 'flex', alignItems: 'center', padding: '0 15px' }}>
          <button onClick={onDisconnect} style={{ ...btnReset, color: neonRed, marginRight: '12px' }}>✕</button>
          <input placeholder="say something..." value={textInput} disabled={disabled} onChange={(e) => setTextInput(e.target.value)} onKeyDown={async (e) => { if (e.key === 'Enter' && textInput.trim()) { await send?.(textInput); setTextInput(""); } }} style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none' }} />
          <div style={{ display: 'flex', gap: '14px' }}>
            <button onClick={() => localParticipant?.setScreenShareEnabled(!localParticipant.isScreenShareEnabled)} style={btnReset}><ScreenShareIcon enabled={!!localParticipant?.isScreenShareEnabled} /></button>
            <button onClick={() => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} style={btnReset}><CameraIcon enabled={!!localParticipant?.isCameraEnabled} /></button>
            <button onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} style={btnReset}><MicIcon enabled={!!localParticipant?.isMicrophoneEnabled} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Session({ token, serverUrl, userEmail, onDisconnect }: SessionProps) {
  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect={true} audio={true}>
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} userEmail={userEmail} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}