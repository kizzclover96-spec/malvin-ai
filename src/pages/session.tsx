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
  useChat,
  useLocalParticipant,
} from '@livekit/components-react';

interface SessionProps {
  token: string;
  serverUrl: string;
  onDisconnect: () => void;
}

// --- 1. NEON LINE ART ICONS ---
const neonBlue = "#00d2ff";
const neonRed = "#ff3b30";

const GearIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const CameraIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.4 }}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

const ClipIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const MicIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.4 }}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
  </svg>
);

// --- 2. THE AI FACE ---
function MalvinVoiceIsland({ agent, isSleeping }: { agent: any, isSleeping: boolean }) {
  const isAgentSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (isSleeping) return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, [isSleeping]);

  return (
    <div style={{
      width: '110px', height: '42px', backgroundColor: 'rgba(10, 10, 10, 0.9)',
      borderRadius: '21px', border: `1.5px solid ${neonBlue}`, display: 'flex',
      alignItems: 'center', justifyContent: 'center', position: 'relative',
      boxShadow: isAgentSpeaking ? `0 0 15px ${neonBlue}55` : `0 0 5px ${neonBlue}22`,
      transition: 'all 0.3s ease'
    }}>
      <svg width="45" height="18" viewBox="0 0 60 20">
        <rect x="12" y={isSleeping || blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={isSleeping || blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" style={{ transition: 'all 0.1s ease' }} />
        <rect x="38" y={isSleeping || blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={isSleeping || blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" style={{ transition: 'all 0.1s ease' }} />
      </svg>
    </div>
  );
}

// --- 3. MAIN STAGE ---
function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [localMessages, setLocalMessages] = useState<{message: string, isLocal: boolean}[]>([]);
  
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async () => {
    if (textInput.trim() && localParticipant) {
      const data = new TextEncoder().encode(textInput);
      await localParticipant.publishData(data, { reliable: true, topic: "user_input" });
      setLocalMessages(prev => [...prev, { message: textInput, isLocal: true }]);
      setTextInput("");
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* GEAR (TOP LEFT) */}
      <div style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 100, pointerEvents: 'auto' }}>
        <button onClick={() => setIsMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><GearIcon /></button>
      </div>

      {/* AI FACE (TOP CENTER) */}
      <div style={{ position: 'absolute', top: '25px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        {agent && <MalvinVoiceIsland agent={agent} isSleeping={false} />}
      </div>

      {/* CHAT DISPLAY */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px', pointerEvents: 'none' }}>
        {localMessages.slice(-2).map((msg, i) => (
          <div key={i} style={{ textAlign: msg.isLocal ? 'right' : 'left', margin: '8px 0' }}>
            <span style={{ padding: '8px 14px', borderRadius: '18px', backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${neonBlue}15`, backdropFilter: 'blur(5px)', fontSize: '15px' }}>{msg.message}</span>
          </div>
        ))}
      </div>

      {/* TIGHT BOTTOM CONTROL BAR: x (........öß) § */}
      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
        
        {/* x (KILL SWITCH) */}
        <button onClick={onDisconnect} style={{
          width: '38px', height: '38px', borderRadius: '19px', border: `1.5px solid ${neonRed}`,
          backgroundColor: 'rgba(255, 59, 48, 0.08)', color: neonRed, fontSize: '16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px', pointerEvents: 'auto'
        }}>✕</button>

        {/* (................öß) MAIN CAPSULE */}
        <div style={{
          width: '65%', maxWidth: '350px', height: '48px', backgroundColor: 'rgba(15,15,15,0.95)',
          borderRadius: '24px', border: `1px solid ${neonBlue}`, display: 'flex', alignItems: 'center', padding: '0 12px',
          boxShadow: `0 0 10px ${neonBlue}15`, pointerEvents: 'auto'
        }}>
          <input 
            placeholder="just say the word..." 
            value={textInput} 
            onChange={(e) => setTextInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '14px' }} 
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ClipIcon /></button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
            
            <button onClick={() => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <CameraIcon enabled={!!localParticipant?.isCameraEnabled} />
            </button>

            {textInput.trim() && (
              <button onClick={handleSendMessage} style={{ color: neonBlue, background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>↑</button>
            )}
          </div>
        </div>

        {/* § (MIC - TIGHTLY DOCKED) */}
        <button 
          onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px', pointerEvents: 'auto' }}
        >
          <MicIcon enabled={!!localParticipant?.isMicrophoneEnabled} />
        </button>
      </div>

    </div>
  );
}

export default function Session({ token, serverUrl, onDisconnect }: SessionProps) {
  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect={true} audio={true} video={false} onDisconnected={onDisconnect}>
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}