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
} from '@livekit/components-react';

interface SessionProps {
  token: string;
  serverUrl: string;
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
    return () => interval && clearInterval(interval);
  }, [sleeping, disabled]);

  useEffect(() => {
    setSleeping(false);
    const timer = setTimeout(() => setSleeping(true), 60000);
    return () => timer && clearTimeout(timer);
  }, [activitySignal]);

  return (
    <div
      onClick={onToggleDisable}
      style={{
        width: '110px', height: '42px', backgroundColor: 'rgba(10, 10, 10, 0.9)',
        borderRadius: '21px', border: `1.5px solid ${disabled ? neonRed : neonBlue}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', position: 'relative', transition: 'all 0.3s ease',
        boxShadow: disabled ? `0 0 20px ${neonRed}77` : isAgentSpeaking ? `0 0 15px ${neonBlue}55` : `0 0 5px ${neonBlue}22`,
      }}
    >
      <style>
        {`
          @keyframes floatZ { 0% { transform: translate(0, 0) scale(0.5); opacity: 0; } 20% { opacity: 1; } 100% { transform: translate(10px, -25px) scale(1.3); opacity: 0; } }
          @keyframes pulseDead { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.92); } }
        `}
      </style>
      {disabled ? (
        <svg width="45" height="18" viewBox="0 0 60 20" style={{ animation: 'pulseDead 2s infinite ease-in-out' }}>
          <text x="10" y="15" fill={neonRed} fontSize="16" fontWeight="bold" style={{ fontFamily: 'Arial' }}>X</text>
          <text x="36" y="15" fill={neonRed} fontSize="16" fontWeight="bold" style={{ fontFamily: 'Arial' }}>X</text>
        </svg>
      ) : sleeping ? (
        <>
          <svg width="45" height="18" viewBox="0 0 60 20">
            <rect x="12" y="10" width="10" height="2" rx="1" fill="white" opacity="0.6" />
            <rect x="38" y="10" width="10" height="2" rx="1" fill="white" opacity="0.6" />
          </svg>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ position: 'absolute', right: '10px', top: '-5px', color: 'white', fontSize: i === 0 ? '12px' : '8px', fontWeight: 'bold', animation: `floatZ 3s infinite ${i * 0.8}s linear`, opacity: 0 }}>Z</div>
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
function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [bgBlur, setBgBlur] = useState(0);
  const [activitySignal, setActivitySignal] = useState(0);
  
  const triggerActivity = () => setActivitySignal(prev => prev + 1);
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  
  // Fetch Local Camera Track
  const tracks = useTracks([{ source: Track.Source.Camera, pks: [localParticipant?.identity || ''] }]);
  const cameraTrack = tracks.find(t => t.participant.identity === localParticipant?.identity);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async () => {
    if (disabled) return;
    if (textInput.trim() && localParticipant) {
      const data = new TextEncoder().encode(textInput);
      await localParticipant.publishData(data, { reliable: true, topic: "user_input" });
      setTextInput("");
      triggerActivity();
    }
  };

  const btnReset: CSSProperties = {
    background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '24px', height: '24px', transition: 'opacity 0.3s'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* 1. FULL SCREEN VIDEO LAYER */}
      {cameraTrack && localParticipant?.isCameraEnabled && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
          <VideoTrack trackRef={cameraTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* 2. CUSTOM BACKGROUND IMAGE LAYER */}
      {backgroundImage && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: `blur(${bgBlur}px)`, transform: 'scale(1.1)', zIndex: 2
        }} />
      )}
      
      {/* 3. DARK OVERLAY (Always active to ensure UI is readable) */}
      <div style={{ 
        position: 'absolute', inset: 0, 
        backgroundColor: (backgroundImage || localParticipant?.isCameraEnabled) ? 'rgba(0,0,0,0.3)' : '#000', 
        zIndex: 10 
      }} />

      {/* --- SIDEBAR --- */}
      <div style={{
        position: 'absolute', top: 0, left: isSettingsOpen ? 0 : '-320px',
        display: isSettingsOpen ? 'flex' : 'none',
        width: '280px', height: '100%', backgroundColor: 'rgba(10,10,10,0.98)',
        borderRight: `1px solid ${neonBlue}44`, zIndex: 200, transition: 'left 0.4s ease',
        padding: '80px 24px', flexDirection: 'column', gap: '25px',
        boxShadow: '20px 0 50px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)'
      }}>
        <h3 style={{ color: neonBlue, fontSize: '18px', letterSpacing: '2px' }}>INTERFACE</h3>
        
        <button onClick={() => bgInputRef.current?.click()} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${neonBlue}44`, color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' }}>
           🖼️ Customize Background
        </button>
        <input type="file" ref={bgInputRef} hidden accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => setBackgroundImage(reader.result as string);
              reader.readAsDataURL(file);
            }
        }} />

        {backgroundImage && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '12px', color: '#888' }}>BLUR: {bgBlur}px</label>
                <input type="range" min="0" max="20" value={bgBlur} onChange={(e) => setBgBlur(parseInt(e.target.value))} style={{ accentColor: neonBlue }} />
            </div>
        )}
      </div>

      {isSettingsOpen && <div onClick={() => setIsSettingsOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 199 }} />}

      {/* Gear Icon */}
      <div style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 201 }}>
        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={{ ...btnReset, opacity: disabled ? 0.2 : 1 }} disabled={disabled}><GearIcon /></button>
      </div>

      {/* Center AI Island */}
      <div style={{ position: 'absolute', top: '25px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        {agent && (
          <MalvinVoiceIsland agent={agent} disabled={disabled} activitySignal={activitySignal} onToggleDisable={() => setDisabled(prev => !prev)} />
        )}
      </div>

      {/* Bottom Bar Controls */}
      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        <div style={{
          width: '90%', maxWidth: '450px', height: '52px', backgroundColor: 'rgba(15,15,15,0.95)',
          borderRadius: '26px', border: `1px solid ${disabled ? '#333' : neonBlue}`,
          display: 'flex', alignItems: 'center', padding: '0 15px', boxShadow: disabled ? 'none' : `0 0 10px ${neonBlue}15`
        }}>
          <button onClick={onDisconnect} style={{ ...btnReset, opacity: 1, width: '30px', height: '30px', borderRadius: '50%', border: `1.5px solid ${neonRed}`, color: neonRed, fontSize: '14px', fontWeight: 'bold', marginRight: '12px' }}>✕</button>

          <input placeholder={disabled ? "Offline..." : "say something..."} value={textInput} disabled={disabled} onChange={(e) => { setTextInput(e.target.value); triggerActivity(); }} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} style={{ flex: 1, background: 'none', border: 'none', color: disabled ? '#444' : '#fff', outline: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: '10px' }}>
            <button onClick={() => !disabled && fileInputRef.current?.click()} style={{ ...btnReset, opacity: disabled ? 0.2 : 1 }} disabled={disabled}><ClipIcon /></button>
            <input type="file" ref={fileInputRef} hidden />
            
            {/* TOGGLE CAMERA */}
            <button 
              onClick={async () => { 
                if(!disabled && localParticipant) {
                    const nextState = !localParticipant.isCameraEnabled;
                    await localParticipant.setCameraEnabled(nextState);
                    triggerActivity();
                }
              }} 
              style={{ ...btnReset, opacity: disabled ? 0.2 : 1 }} disabled={disabled}
            >
              <CameraIcon enabled={!disabled && !!localParticipant?.isCameraEnabled} />
            </button>

            {/* TOGGLE MIC */}
            <button 
              onClick={async () => { 
                if(!disabled && localParticipant) {
                    await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
                    triggerActivity();
                }
              }} 
              style={{ ...btnReset, opacity: disabled ? 0.2 : 1 }} disabled={disabled}
            >
              <MicIcon enabled={!disabled && !!localParticipant?.isMicrophoneEnabled} />
            </button>

            {!disabled && textInput.trim() && <button onClick={handleSendMessage} style={{ ...btnReset, color: neonBlue, fontWeight: 'bold' }}>↑</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Session({ token, serverUrl, onDisconnect }: SessionProps) {
  return (
    <LiveKitRoom 
      token={token} 
      serverUrl={serverUrl} 
      connect={true} 
      audio={true} 
      video={false} // CRITICAL: Ensure camera is OFF by default
      onDisconnected={onDisconnect}
    >
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}