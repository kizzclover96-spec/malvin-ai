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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAgentTyping]);

  // Listen for custom typing events
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

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 100, // Ensure it's above video but below modals
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      pointerEvents: 'none',
    }}>
      <div
        ref={scrollRef}
        style={{
          width: '90%',
          maxWidth: '450px',
          height: '60vh', // Limit height so it doesn't cover input
          marginTop: '100px',
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'auto',
        }}
      >
        {chatMessages.map((msg, index) => {
          const isMe = !msg.from || msg.from.identity === localParticipant?.identity;
          const isAgent = !isMe;

          return (
            <div key={msg.id || index} style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: isAgent ? 'flex-start' : 'flex-end',
            }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '18px',
                backgroundColor: isAgent ? 'rgba(240, 240, 240, 0.95)' : `${neonBlue}E6`,
                color: isAgent ? '#000' : '#fff',
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                maxWidth: '85%',
                borderBottomLeftRadius: isAgent ? '4px' : '18px',
                borderBottomRightRadius: isAgent ? '18px' : '4px',
              }}>
                {msg.message}
              </div>
              <span style={{ fontSize: '10px', color: '#fff', opacity: 0.6, marginTop: '4px', textTransform: 'uppercase' }}>
                {isAgent ? (msg.from?.name || 'Malvin') : 'You'}
              </span>
            </div>
          );
        })}
        {isAgentTyping && (
          <div style={{ alignSelf: 'flex-start', padding: '12px 18px', backgroundColor: 'rgba(240, 240, 240, 0.95)', borderRadius: '18px' }}>
            <span style={{ color: '#555', fontSize: '12px' }}>...</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN VIDEO STAGE ---
function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
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

  const handleSendMessage = async () => {
    if (disabled || !textInput.trim() || !send) return;
    await send(textInput);
    setTextInput("");
    triggerActivity();
  };

  const btnReset: CSSProperties = {
    background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden' }}>
      
      {/* Background/Video Layer */}
      {cameraTrack && localParticipant?.isCameraEnabled && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <VideoTrack trackRef={cameraTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      {backgroundImage && (
        <div style={{
          position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover', backgroundPosition: 'center', filter: `blur(${bgBlur}px)`, zIndex: 2
        }} />
      )}
      
      {/* Overlay for contrast */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 3 }} />

      <BackgroundChat />

      {/* Header UI */}
      <div style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 201 }}>
        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={btnReset}><GearIcon /></button>
      </div>

      {/* Input Bar */}
      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 200 }}>
        <div style={{
          width: '90%', maxWidth: '450px', height: '52px', backgroundColor: 'rgba(15,15,15,0.95)',
          borderRadius: '26px', border: `1px solid ${neonBlue}`, display: 'flex', alignItems: 'center', padding: '0 15px'
        }}>
          <button onClick={onDisconnect} style={{ ...btnReset, color: neonRed, marginRight: '10px' }}>✕</button>
          <input 
            placeholder="Say something..." 
            value={textInput} 
            onChange={(e) => setTextInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none' }} 
          />
          {textInput.trim() && <button onClick={handleSendMessage} style={{ ...btnReset, color: neonBlue }}>↑</button>}
        </div>
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