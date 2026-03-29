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
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={enabled ? neonBlue : "#555"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

const ClipIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const MicIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={enabled ? neonBlue : "#444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
  </svg>
);

// --- 2. MAIN STAGE ---
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
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden' }}>
      
      {/* KILL SWITCH (LOGOUT - Bottom Left) */}
      <div style={{ position: 'absolute', bottom: '110px', left: '25px', zIndex: 100, pointerEvents: 'auto' }}>
        <button onClick={onDisconnect} style={{
          width: '44px', height: '44px', borderRadius: '22px', border: `2px solid ${neonRed}`,
          backgroundColor: 'rgba(255, 59, 48, 0.1)', color: neonRed, fontSize: '20px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: `0 0 15px ${neonRed}44`
        }}>✕</button>
      </div>

      {/* GEAR (TOP LEFT) */}
      <div style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 100, pointerEvents: 'auto' }}>
        <button onClick={() => setIsMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><GearIcon /></button>
      </div>

      {/* TOP MALVIN FACE */}
      <div style={{ position: 'absolute', top: '25px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        <div style={{
          width: '90px', height: '36px', borderRadius: '18px', border: `1.5px solid ${neonBlue}`,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 12px ${neonBlue}44`
        }}>
           <div style={{ display: 'flex', gap: '4px' }}>
              {[1,2,3].map(i => <div key={i} style={{ width: '3px', height: '10px', backgroundColor: '#fff', borderRadius: '2px' }} />)}
           </div>
        </div>
      </div>

      {/* CHAT BUBBLES */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px', pointerEvents: 'none' }}>
        {localMessages.slice(-2).map((msg, i) => (
          <div key={i} style={{ textAlign: msg.isLocal ? 'right' : 'left', margin: '10px 0' }}>
            <span style={{ padding: '10px 16px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${neonBlue}22`, backdropFilter: 'blur(5px)' }}>{msg.message}</span>
          </div>
        ))}
      </div>

      {/* BOTTOM INPUT AREA */}
      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
        
        {/* Main Capsule */}
        <div style={{
          width: '75%', maxWidth: '400px', height: '54px', backgroundColor: 'rgba(20,20,20,0.9)',
          borderRadius: '27px', border: `1px solid ${neonBlue}`, display: 'flex', alignItems: 'center', padding: '0 15px',
          boxShadow: `0 0 15px ${neonBlue}22`, pointerEvents: 'auto'
        }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}><ClipIcon /></button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
          
          <input 
            placeholder="just say the word..." 
            value={textInput} 
            onChange={(e) => setTextInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none', padding: '0 10px', fontSize: '15px' }} 
          />

          <button onClick={() => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
            <CameraIcon enabled={!!localParticipant?.isCameraEnabled} />
          </button>

          {textInput.trim() && <button onClick={handleSendMessage} style={{ color: neonBlue, background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginLeft: '5px' }}>↑</button>}
        </div>

        {/* Free-standing Mic */}
        <button 
          onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '15px', pointerEvents: 'auto' }}
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