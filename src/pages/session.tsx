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
import { jsPDF } from "jspdf";

interface SessionProps {
  token: string;
  serverUrl: string;
  userEmail: string; 
  onDisconnect: () => void;
}

const neonBlue = "#00d2ff";
const neonRed = "#ff3b30";

// --- ICONS ---
const GearIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const CameraIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.4 }}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

const ClipIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const MicIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.4 }}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
  </svg>
);

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
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages, isAgentTyping]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div ref={scrollRef} style={{ width: '90%', maxWidth: '450px', padding: '120px 10px 180px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'auto', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}>
        {chatMessages.map((msg, index) => {
          const isMe = !msg.from || msg.from.identity === localParticipant?.identity;
          return (
            <div key={msg.id || index} style={{ maxWidth: '85%', alignSelf: isMe ? 'flex-end' : 'flex-start', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ padding: '10px 16px', borderRadius: '18px', backgroundColor: isMe ? `${neonBlue}E6` : 'rgba(245, 245, 245, 0.92)', color: isMe ? '#fff' : '#111', fontSize: '0.92rem', boxShadow: '0 4px 15px rgba(0,0,0,0.25)', borderBottomLeftRadius: isMe ? '18px' : '4px', borderBottomRightRadius: isMe ? '4px' : '18px' }}>
                {msg.message}
              </div>
              <span style={{ fontSize: '9px', color: '#fff', opacity: 0.5, marginTop: '4px' }}>{isMe ? 'You' : (msg.from?.name || 'Malvin')}</span>
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
    <div onClick={onToggleDisable} style={{ width: '110px', height: '42px', backgroundColor: 'rgba(10, 10, 10, 0.9)', borderRadius: '21px', border: `1.5px solid ${disabled ? neonRed : neonBlue}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', boxShadow: disabled ? `0 0 20px ${neonRed}77` : isAgentSpeaking ? `0 0 15px ${neonBlue}55` : `0 0 5px ${neonBlue}22` }}>
      <style>{`@keyframes floatZ { 0% { transform: translate(0, 0) scale(0.5); opacity: 0; } 20% { opacity: 1; } 100% { transform: translate(10px, -25px) scale(1.3); opacity: 0; } } @keyframes pulseDead { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.92); } }`}</style>
      {disabled ? (
        <svg width="45" height="18" viewBox="0 0 60 20" style={{ animation: 'pulseDead 2s infinite' }}><text x="10" y="15" fill={neonRed} fontSize="16" fontWeight="bold">X</text><text x="36" y="15" fill={neonRed} fontSize="16" fontWeight="bold">X</text></svg>
      ) : sleeping ? (
        <>
          <svg width="45" height="18" viewBox="0 0 60 20"><rect x="12" y="10" width="10" height="2" rx="1" fill="white" opacity="0.6" /><rect x="38" y="10" width="10" height="2" rx="1" fill="white" opacity="0.6" /></svg>
          {[0, 1, 2].map((i) => (<div key={i} style={{ position: 'absolute', right: '10px', top: '-5px', color: 'white', fontSize: i === 0 ? '12px' : '8px', animation: `floatZ 3s infinite ${i * 0.8}s linear`, opacity: 0 }}>Z</div>))}
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
  const { send } = useChat();
  const tracks = useTracks([{ source: Track.Source.Camera, pks: [localParticipant?.identity || ''] }]);
  const cameraTrack = tracks.find(t => t.participant.identity === localParticipant?.identity);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const storageKey = `malvin_v2_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Persist State
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const d = JSON.parse(saved);
      if (d.notes) setNotes(d.notes);
      if (d.bg) setBackgroundImage(d.bg);
      if (d.blur !== undefined) setBgBlur(d.blur);
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ notes, bg: backgroundImage, blur: bgBlur }));
  }, [notes, backgroundImage, bgBlur, storageKey]);

  const saveAsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20); doc.text("Malvin Conversation Notes", 10, 20);
    doc.setFontSize(12);
    notes.forEach((note, i) => doc.text(`• ${note}`, 10, 35 + (i * 10)));
    doc.save(`Malvin_Notes_${userEmail}.pdf`);
  };

  const resetAll = () => {
    if (confirm("Reset everything for this account?")) {
      setNotes([]); setBackgroundImage(null); setBgBlur(0);
      localStorage.removeItem(storageKey);
    }
  };

  const handleSendMessage = async () => {
    if (disabled || !textInput.trim() || !send) return;
    await send(textInput); setTextInput(""); triggerActivity();
  };

  const btnReset: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden' }}>
      {cameraTrack && localParticipant?.isCameraEnabled && <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}><VideoTrack trackRef={cameraTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
      {backgroundImage && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: `blur(${bgBlur}px)`, zIndex: 2 }} />}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 10 }} />

      <BackgroundChat />

      {/* Sidebar UI */}
      <div style={{ position: 'absolute', top: 0, left: isSettingsOpen ? 0 : '-320px', display: isSettingsOpen ? 'flex' : 'none', width: '280px', height: '100%', backgroundColor: 'rgba(10,10,10,0.98)', borderRight: `1px solid ${neonBlue}44`, zIndex: 200, transition: '0.4s', flexDirection: 'column' }}>
        <div style={{ display: 'flex', marginTop: '70px', padding: '0 20px', borderBottom: '1px solid #222' }}>
           {['notes', 'appearance', 'system'].map((t) => (
             <div key={t} onClick={() => setActiveTab(t as any)} style={{ flex: 1, padding: '10px 0', textAlign: 'center', cursor: 'pointer', fontSize: '11px', color: activeTab === t ? neonBlue : '#444', borderBottom: activeTab === t ? `2px solid ${neonBlue}` : 'none' }}>{t.toUpperCase()}</div>
           ))}
        </div>
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><h4 style={{ color: neonBlue, margin: 0 }}>NOTEPAD</h4><button onClick={saveAsPDF} style={{ background: 'none', border: `1px solid ${neonBlue}`, color: neonBlue, fontSize: '9px', borderRadius: '4px', cursor: 'pointer' }}>PDF ↓</button></div>
               {notes.map((n, i) => <div key={i} style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', borderLeft: `2px solid ${neonBlue}`, fontSize: '12px' }}>{n}</div>)}
            </div>
          )}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <button onClick={() => bgInputRef.current?.click()} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${neonBlue}44`, color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🖼️ CUSTOMIZE BACKGROUND</button>
              <input type="file" ref={bgInputRef} hidden accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const r = new FileReader(); r.onloadend = () => setBackgroundImage(r.result as string); r.readAsDataURL(file); } }} />
              {backgroundImage && <div><label style={{ fontSize: '10px', color: '#888' }}>BLUR: {bgBlur}px</label><input type="range" min="0" max="20" value={bgBlur} onChange={(e) => setBgBlur(parseInt(e.target.value))} style={{ width: '100%', accentColor: neonBlue }} /></div>}
            </div>
          )}
          {activeTab === 'system' && <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}><div style={{ fontSize: '12px', color: neonBlue }}>User: {userEmail}</div><button onClick={resetAll} style={{ padding: '10px', color: neonRed, border: `1px solid ${neonRed}44`, background: 'none', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold' }}>RESET ALL DATA</button></div>}
        </div>
      </div>

      {isSettingsOpen && <div onClick={() => setIsSettingsOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 199 }} />}

      {/* Main Overlay UI */}
      <div style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 201 }}><button onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={btnReset}><GearIcon /></button></div>
      <div style={{ position: 'absolute', top: '25px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100 }}>{agent && <MalvinVoiceIsland agent={agent} disabled={disabled} activitySignal={activitySignal} onToggleDisable={() => setDisabled(!disabled)} />}</div>

      {/* Input Bar */}
      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        <div style={{ width: '90%', maxWidth: '450px', height: '52px', backgroundColor: 'rgba(15,15,15,0.95)', borderRadius: '26px', border: `1px solid ${disabled ? '#333' : neonBlue}`, display: 'flex', alignItems: 'center', padding: '0 15px' }}>
          <button onClick={onDisconnect} style={{ ...btnReset, color: neonRed, marginRight: '12px', fontSize: '18px' }}>✕</button>
          <input placeholder={disabled ? "Offline..." : "say something..."} value={textInput} disabled={disabled} onChange={(e) => { setTextInput(e.target.value); triggerActivity(); }} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: '10px' }}>
            <button style={btnReset}><ClipIcon /></button>
            <button onClick={async () => { if(localParticipant) await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled); triggerActivity(); }} style={btnReset}><CameraIcon enabled={!!localParticipant?.isCameraEnabled} /></button>
            <button onClick={async () => { if(localParticipant) await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled); triggerActivity(); }} style={btnReset}><MicIcon enabled={!!localParticipant?.isMicrophoneEnabled} /></button>
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