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
        @keyframes sparkle { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes vibrate { 0% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.5); opacity: 0; } 100% { transform: scale(1); opacity: 0; } }
        @keyframes swing { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
        @keyframes flip { 0% { transform: rotateY(0deg); opacity: 0; } 50% { opacity: 1; } 100% { transform: rotateY(-180deg); opacity: 0; } }
        @keyframes scan { 0% { transform: translateY(-15px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(15px); opacity: 0; } }
        @keyframes pulseGlow { 0%, 100% { filter: drop-shadow(0 0 2px ${neonBlue}); } 50% { filter: drop-shadow(0 0 15px ${neonBlue}); } }
        @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-10px); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes premiumGlow { 0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.5); } 50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.5); border-color: ${premiumGold}; } }
      `}</style>
      
      <div key={step} style={{ animation: 'fadeInOut 2s infinite', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {step === 1 && (
             <>
               <div style={{ position: 'absolute', width: '80px', height: '80px', border: `2px solid ${neonBlue}`, borderRadius: '50%', animation: 'vibrate 1.5s infinite' }} />
               <div style={{ position: 'absolute', width: '100px', height: '100px', border: `1px solid ${neonBlue}`, borderRadius: '50%', animation: 'vibrate 1.5s infinite 0.5s' }} />
             </>
          )}
          {features[step].icon}
          {step === 0 && [...Array(5)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute', width: '8px', height: '8px', backgroundColor: '#fff', borderRadius: '50%',
                top: `${20 + Math.random() * 20}%`, left: `${30 + Math.random() * 40}%`,
                boxShadow: `0 0 10px ${neonBlue}`, animation: `sparkle 1.5s infinite ${i * 0.3}s`
              }} />
          ))}
        </div>
        <span style={{ marginTop: '20px', fontSize: '10px', color: neonBlue, letterSpacing: '4px', fontWeight: '900', textTransform: 'uppercase' }}>
          {features[step].word}
        </span>
      </div>
    </div>
  );
};

// --- COMPONENT: BACKGROUND CHAT ---
const BackgroundChat = () => {
  const { chatMessages } = useChat();
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
  }, [chatMessages, isAgentTyping]);

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
        {chatMessages.map((msg, index) => {
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
              }}>
                {msg.message}
              </div>
              <span style={{ fontSize: '9px', color: '#fff', opacity: 0.5, marginTop: '4px', padding: '0 5px', textTransform: 'uppercase' }}>
                {isAgent ? (msg.from?.name || 'Malvin') : 'You'}
              </span>
            </div>
          );
        })}
        {isAgentTyping && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 18px', borderRadius: '18px', backgroundColor: 'rgba(245, 245, 245, 0.92)' }}>
              <div style={{ width: '20px', height: '10px', display: 'flex', gap: '3px' }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#444' }} />
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#444' }} />
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#444' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- AI FACE COMPONENT ---
function MalvinVoiceIsland({ agent, disabled, onToggleDisable, activitySignal }: any) {
  const isAgentSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);
  const [sleeping, setSleeping] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!sleeping && !disabled) {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [sleeping, disabled]);

  useEffect(() => {
    setSleeping(false);
    const timer = setTimeout(() => setSleeping(true), 60000);
    return () => clearTimeout(timer);
  }, [activitySignal]);

  return (
    <div onClick={onToggleDisable} style={{
      width: '110px', height: '42px', backgroundColor: 'rgba(10, 10, 10, 0.9)',
      borderRadius: '21px', border: `1.5px solid ${disabled ? neonRed : neonBlue}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', position: 'relative', transition: 'all 0.3s ease',
      boxShadow: disabled ? `0 0 20px ${neonRed}77` : isAgentSpeaking ? `0 0 15px ${neonBlue}55` : `0 0 5px ${neonBlue}22`,
    }}>
      <style>{`@keyframes floatZ { 0% { transform: translate(0, 0) scale(0.5); opacity: 0; } 20% { opacity: 1; } 100% { transform: translate(10px, -25px) scale(1.3); opacity: 0; } } @keyframes pulseDead { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.92); } }`}</style>
      {disabled ? (
        <svg width="45" height="18" viewBox="0 0 60 20" style={{ animation: 'pulseDead 2s infinite' }}>
          <text x="10" y="15" fill={neonRed} fontSize="16" fontWeight="bold">X</text>
          <text x="36" y="15" fill={neonRed} fontSize="16" fontWeight="bold">X</text>
        </svg>
      ) : sleeping ? (
        <>
          <svg width="45" height="18" viewBox="0 0 60 20">
            <rect x="12" y="10" width="10" height="2" rx="1" fill="white" opacity="0.6" />
            <rect x="38" y="10" width="10" height="2" rx="1" fill="white" opacity="0.6" />
          </svg>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ position: 'absolute', right: '10px', top: '-5px', color: 'white', fontSize: i === 0 ? '12px' : '8px', animation: `floatZ 3s infinite ${i * 0.8}s linear`, opacity: 0 }}>Z</div>
          ))}
        </>
      ) : (
        <svg width="45" height="18" viewBox="0 0 60 20">
          <rect x="12" y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
          <rect x="38" y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
        </svg>
      )}
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
  const [activitySignal, setActivitySignal] = useState(0);
  
  const triggerActivity = () => setActivitySignal(prev => prev + 1);
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  const { send, chatMessages } = useChat();
  
  const tracks = useTracks([{ source: Track.Source.Camera, pks: [localParticipant?.identity || ''] }]);
  const cameraTrack = tracks.find(t => t.participant.identity === localParticipant?.identity);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const storageKey = `malvin_session_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.notes) setNotes(data.notes);
        if (data.backgroundImage) setBackgroundImage(data.backgroundImage);
        if (data.bgBlur !== undefined) setBgBlur(data.bgBlur);
      } catch (e) { console.error("Restore error", e); }
    }
  }, [storageKey]);

  useEffect(() => {
    const state = { notes, backgroundImage, bgBlur };
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [notes, backgroundImage, bgBlur, storageKey]);

  const resetSession = () => {
    if (window.confirm("Clear all notes and background settings for this email?")) {
      setNotes([]);
      setBackgroundImage(null);
      setBgBlur(0);
      localStorage.removeItem(storageKey);
    }
  };

  const saveAsPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const content = `<html><body><h1>Malvin Session Notes</h1><p><strong>User:</strong> ${userEmail}</p>${notes.map(n => `<div style="border-left:4px solid ${neonBlue};padding:10px;">${n}</div>`).join('')}</body></html>`;
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  useEffect(() => {
    if (!localParticipant) return;
    const handleData = (payload: Uint8Array, _p: any, _k: any, topic?: string) => {
      if (topic === "note_update") {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (Array.isArray(data.notes)) setNotes(data.notes);
          else if (data.note) setNotes(prev => [...prev, data.note]);
        } catch (e) { console.error("Parse error", e); }
      }
    };
    localParticipant.on('dataReceived', handleData);
    return () => { localParticipant.off('dataReceived', handleData); };
  }, [localParticipant]);

  const handleSendMessage = async () => {
    if (disabled || !textInput.trim() || !send) return;
    await send(textInput);
    setTextInput("");
    triggerActivity();
  };

  const btnReset: CSSProperties = {
    background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '24px', height: '24px'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      {cameraTrack && localParticipant?.isCameraEnabled && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
          <VideoTrack trackRef={cameraTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      {backgroundImage && (
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: `blur(${bgBlur}px)`, transform: 'scale(1.1)', zIndex: 2 }} />
      )}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: (backgroundImage || localParticipant?.isCameraEnabled) ? 'rgba(0,0,0,0.4)' : '#000', zIndex: 10 }} />

      <BackgroundChat />
      {chatMessages.length === 0 && <FeatureShowcase />}

      <div style={{
        position: 'absolute', top: 0, left: isSettingsOpen ? 0 : '-320px',
        display: isSettingsOpen ? 'flex' : 'none', width: '280px', height: '100%',
        backgroundColor: 'rgba(10,10,10,0.98)', borderRight: `1px solid ${neonBlue}44`,
        zIndex: 200, transition: 'left 0.4s ease', flexDirection: 'column',
        boxShadow: '20px 0 50px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', marginTop: '70px', padding: '0 20px', borderBottom: '1px solid #222' }}>
           {['notes', 'appearance', 'system'].map((t) => (
             <div key={t} onClick={() => setActiveTab(t as any)} style={{ flex: 1, padding: '10px 0', textAlign: 'center', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', color: activeTab === t ? neonBlue : '#444', borderBottom: activeTab === t ? `2px solid ${neonBlue}` : 'none', textTransform: 'uppercase' }}>{t === 'appearance' ? 'style' : t}</div>
           ))}
        </div>
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <h4 style={{ color: neonBlue, margin: 0, fontSize: '14px' }}>NOTEPAD</h4>
                 <button onClick={saveAsPDF} style={{ background: 'none', border: `1px solid ${neonBlue}`, color: neonBlue, padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>PDF ↓</button>
               </div>
               {notes.length === 0 ? <p style={{ fontSize: '12px', color: '#444' }}>Empty...</p> : notes.map((n, i) => <div key={i} style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', borderLeft: `2px solid ${neonBlue}`, fontSize: '12px' }}>{n}</div>)}
            </div>
          )}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <button onClick={() => bgInputRef.current?.click()} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${neonBlue}44`, color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '13px' }}>🖼️ Customize Background</button>
              <input type="file" ref={bgInputRef} hidden accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setBackgroundImage(reader.result as string); reader.readAsDataURL(file); } }} />
              {backgroundImage && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ fontSize: '11px', color: '#888' }}>BLUR: {bgBlur}px</label>
                      <input type="range" min="0" max="20" value={bgBlur} onChange={(e) => setBgBlur(parseInt(e.target.value))} style={{ accentColor: neonBlue }} />
                  </div>
              )}
            </div>
          )}
          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>Account</label>
                  <div style={{ fontSize: '13px', color: neonBlue, marginTop: '4px' }}>{userEmail}</div>
                </div>

                {/* PREMIUM BUTTON */}
                <button 
                  style={{ 
                    background: 'rgba(255, 215, 0, 0.05)', 
                    border: '1px solid #FFD700', 
                    color: premiumGold, 
                    padding: '12px', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    animation: 'premiumGlow 3s infinite'
                  }}
                >
                  <StarIcon /> PREMIUM
                </button>

                <button onClick={resetSession} style={{ background: 'rgba(255, 59, 48, 0.1)', border: `1px solid ${neonRed}44`, color: neonRed, padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>RESET SESSION DATA</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 201 }}>
        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={{ ...btnReset, opacity: disabled ? 0.2 : 1 }} disabled={disabled}><GearIcon /></button>
      </div>

      <div style={{ position: 'absolute', top: '25px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        {agent && <MalvinVoiceIsland agent={agent} disabled={disabled} activitySignal={activitySignal} onToggleDisable={() => setDisabled(prev => !prev)} />}
      </div>

      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        <div style={{
          width: '90%', maxWidth: '450px', height: '52px', backgroundColor: 'rgba(15,15,15,0.95)',
          borderRadius: '26px', border: `1px solid ${disabled ? '#333' : neonBlue}`,
          display: 'flex', alignItems: 'center', padding: '0 15px'
        }}>
          <button onClick={onDisconnect} style={{ ...btnReset, color: neonRed, marginRight: '12px' }}>✕</button>
          <input placeholder={disabled ? "Offline..." : "say something..."} value={textInput} disabled={disabled} onChange={(e) => { setTextInput(e.target.value); triggerActivity(); }} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} style={{ flex: 1, background: 'none', border: 'none', color: disabled ? '#444' : '#fff', outline: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: '10px' }}>
            <button style={btnReset}><ClipIcon /></button>
            <button onClick={async () => { if(!disabled && localParticipant) { await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled); triggerActivity(); } }} style={btnReset}><CameraIcon enabled={!disabled && !!localParticipant?.isCameraEnabled} /></button>
            <button onClick={async () => { if(!disabled && localParticipant) { await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled); triggerActivity(); } }} style={btnReset}><MicIcon enabled={!disabled && !!localParticipant?.isMicrophoneEnabled} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Session({ token, serverUrl, userEmail, onDisconnect }: SessionProps) {
  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect={true} audio={true} video={false} onDisconnected={onDisconnect}>
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} userEmail={userEmail} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}