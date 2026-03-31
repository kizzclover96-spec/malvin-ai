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
  onSignOut: () => void; // Added onSignOut prop
}

const neonBlue = "#00d2ff";
const neonRed = "#ff3b30";
const neonPurple = "#bf00ff";
const premiumGold = "#FFD700";

// --- ICONS ---
const GearIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const StarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={premiumGold} stroke={premiumGold} strokeWidth="1" style={{ marginRight: '8px' }}>
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

// --- COMPONENT: FEATURE SHOWCASE ---
const FeatureShowcase = () => {
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 12, pointerEvents: 'none' }}>
      <style>{`
        @keyframes scan { 0% { transform: translateY(-15px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(15px); opacity: 0; } }
        @keyframes pulseGlow { 0%, 100% { filter: drop-shadow(0 0 2px ${neonBlue}); } 50% { filter: drop-shadow(0 0 15px ${neonBlue}); } }
        @keyframes goldGlow { 0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.3); border-color: rgba(255, 215, 0, 0.5); } 50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.6); border-color: #FFD700; }}
        @keyframes twinkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); }}
      `}</style>
    </div>
  );
};

// --- COMPONENT: BACKGROUND CHAT ---
const BackgroundChat = ({ visibleMessages }: { visibleMessages: any[] }) => {
  const { localParticipant } = useLocalParticipant();
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localParticipant) return;
    const handleData = (payload: Uint8Array, _p: any, _k: any, topic?: string) => {
      if (topic === "typing") {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          setIsAgentTyping(data.typing);
        } catch (e) { console.error("Typing signal error", e); }
      }
    };
    localParticipant.on('dataReceived', handleData);
    return () => { localParticipant.off('dataReceived', handleData); };
  }, [localParticipant]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages, isAgentTyping]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div
        ref={scrollRef}
        style={{
          width: '90%', maxWidth: '450px', padding: '120px 10px 180px 10px',
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px',
          pointerEvents: 'auto', maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
        }}
      >
        {visibleMessages.map((msg, index) => {
          const isMe = !msg.from || msg.from.identity === localParticipant?.identity;
          const isAgent = !isMe;
          return (
            <div key={msg.id || index} style={{
              maxWidth: '85%', alignSelf: isAgent ? 'flex-start' : 'flex-end',
              display: 'flex', flexDirection: 'column', alignItems: isAgent ? 'flex-start' : 'flex-end',
            }}>
              <div style={{
                padding: '10px 16px', borderRadius: '18px',
                backgroundColor: isAgent ? 'rgba(245, 245, 245, 0.92)' : `${neonBlue}E6`,
                color: isAgent ? '#111' : '#fff', fontSize: '0.92rem', lineHeight: '1.4',
                boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
                borderBottomLeftRadius: isAgent ? '4px' : '18px',
                borderBottomRightRadius: isAgent ? '18px' : '4px',
              }}>{msg.message}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- AI FACE COMPONENT ---
function MalvinVoiceIsland({ agent, disabled, onToggleDisable, activitySignal }: any) {
  const isAgentSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!disabled) {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [disabled]);

  return (
    <div onClick={onToggleDisable} style={{
      width: '110px', height: '42px', backgroundColor: 'rgba(10, 10, 10, 0.9)',
      borderRadius: '21px', border: `1.5px solid ${disabled ? neonRed : neonBlue}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', position: 'relative', transition: 'all 0.3s ease',
      boxShadow: disabled ? `0 0 20px ${neonRed}77` : isAgentSpeaking ? `0 0 15px ${neonBlue}55` : `0 0 5px ${neonBlue}22`,
    }}>
      <svg width="45" height="18" viewBox="0 0 60 20">
        <rect x="12" y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
        <rect x="38" y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
      </svg>
    </div>
  );
}

function VideoStage({ onDisconnect, userEmail, onSignOut }: { onDisconnect: () => void, userEmail: string, onSignOut: () => void }) {
  const [textInput, setTextInput] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [chatVisibleTime, setChatVisibleTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'notes' | 'appearance' | 'system'>('notes');
  const [notes, setNotes] = useState<string[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [bgBlur, setBgBlur] = useState(0);
  const [activitySignal, setActivitySignal] = useState(0);
  
  const triggerActivity = () => setActivitySignal(prev => prev + 1);
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  const { send, chatMessages } = useChat();
  const connectionState = useConnectionState();
  
  const visibleMessages = useMemo(() => chatMessages.filter(m => (m.timestamp || 0) > chatVisibleTime), [chatMessages, chatVisibleTime]);

  const tracks = useTracks([
    { source: Track.Source.Camera, pks: [localParticipant?.identity || ''] },
    { source: Track.Source.ScreenShare, pks: [localParticipant?.identity || ''] }
  ]);
  const cameraTrack = tracks.find(t => t.source === Track.Source.Camera);
  const screenTrack = tracks.find(t => t.source === Track.Source.ScreenShare);

  const handleSendMessage = async () => {
    if (disabled || !textInput.trim() || !send) return;
    await send(textInput);
    setTextInput("");
    triggerActivity();
  };

  const btnReset: CSSProperties = { background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* MEDIA CONTENT */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
        {screenTrack ? <VideoTrack trackRef={screenTrack} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : cameraTrack && localParticipant?.isCameraEnabled ? <VideoTrack trackRef={cameraTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
      </div>

      <div style={{ position: 'absolute', inset: 0, backgroundColor: (backgroundImage || localParticipant?.isCameraEnabled || screenTrack) ? 'rgba(0,0,0,0.4)' : '#000', zIndex: 10 }} />

      <BackgroundChat visibleMessages={visibleMessages} />

      {/* HEADER: GEAR, PREMIUM, AND SIGN OUT ALIGNED */}
      <div style={{ position: 'absolute', top: '25px', left: '25px', right: '25px', zIndex: 201, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={{ ...btnReset, opacity: disabled ? 0.2 : 1 }} disabled={disabled}><GearIcon /></button>
          <button style={{ position: 'relative', background: 'rgba(255, 215, 0, 0.05)', border: '1px solid #FFD700', color: '#FFD700', padding: '3px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', animation: 'goldGlow 3s infinite' }}>
            GO PREMIUM
          </button>
        </div>
        
        <button onClick={onSignOut} style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '10px', fontWeight: '500', padding: '4px 12px', borderRadius: '15px', backdropFilter: 'blur(10px)', textTransform: 'uppercase' }}>
          Log out
        </button>
      </div>

      {/* CENTER AI FACE */}
      <div style={{ position: 'absolute', top: '25px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        {agent && <MalvinVoiceIsland agent={agent} disabled={disabled} activitySignal={activitySignal} onToggleDisable={() => setDisabled(prev => !prev)} />}
      </div>

      {/* BOTTOM CONTROL BAR - REDUCED WIDTH */}
      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        <div style={{
          width: '80%', maxWidth: '380px', height: '52px', backgroundColor: 'rgba(15,15,15,0.95)',
          borderRadius: '26px', border: `1px solid ${disabled ? '#333' : neonBlue}`,
          display: 'flex', alignItems: 'center', padding: '0 15px'
        }}>
          <button onClick={onDisconnect} style={{ ...btnReset, color: neonRed, marginRight: '12px' }}>✕</button>
          <input placeholder={disabled ? "Offline..." : "say something..."} value={textInput} disabled={disabled} onChange={(e) => { setTextInput(e.target.value); triggerActivity(); }} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} style={{ flex: 1, background: 'none', border: 'none', color: disabled ? '#444' : '#fff', outline: 'none', fontSize: '14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: '10px' }}>
            <button onClick={async () => { if(!disabled && localParticipant) { await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled); triggerActivity(); } }} style={btnReset}><CameraIcon enabled={!disabled && !!localParticipant?.isCameraEnabled} /></button>
            <button onClick={async () => { if(!disabled && localParticipant) { await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled); triggerActivity(); } }} style={btnReset}><MicIcon enabled={!disabled && !!localParticipant?.isMicrophoneEnabled} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Session({ token, serverUrl, userEmail, onDisconnect, onSignOut }: SessionProps) {
  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect={true} audio={true} video={false} onDisconnected={onDisconnect}>
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} userEmail={userEmail} onSignOut={onSignOut} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}