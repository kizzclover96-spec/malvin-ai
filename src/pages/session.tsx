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

// --- 1. STYLES ---
const pulseStyle: CSSProperties = { position: 'absolute', bottom: '6px', width: '20px', height: '2px', background: '#0a84ff', borderRadius: '2px', animation: 'malvin-pulse 1.5s infinite' };
const cameraCloseBtnStyle: CSSProperties = { position: 'absolute', bottom: '110px', right: '30px', width: '44px', height: '44px', borderRadius: '22px', backgroundColor: 'rgba(255, 69, 58, 0.8)', color: 'white', border: 'none', fontSize: '18px', cursor: 'pointer', backdropFilter: 'blur(5px)', zIndex: 100 };

const sideMenuStyle = (isOpen: boolean): CSSProperties => ({
  position: 'absolute',
  top: 0,
  left: isOpen ? 0 : '-100%',
  width: '50%',
  height: '100%',
  backgroundColor: 'rgba(15, 15, 15, 0.9)',
  backdropFilter: 'blur(20px)',
  zIndex: 1000,
  transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  borderRight: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  flexDirection: 'column',
  padding: '40px 20px',
  pointerEvents: 'auto'
});

const logoutBtnStyle: CSSProperties = {
  position: 'absolute',
  top: '20px',
  right: '20px',
  width: '36px',
  height: '36px',
  borderRadius: '18px',
  backgroundColor: 'rgba(255, 69, 58, 0.2)',
  border: '1px solid rgba(255, 69, 58, 0.4)',
  color: '#ff453a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  zIndex: 100,
  pointerEvents: 'auto',
  fontSize: '14px'
};

const chatAreaStyle: CSSProperties = { position: 'absolute', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px', pointerEvents: 'none', overflowY: 'hidden' };
const pillContainerStyle: CSSProperties = { pointerEvents: 'auto', width: '92%', maxWidth: '450px', minHeight: '60px', backgroundColor: 'rgba(30, 30, 30, 0.75)', backdropFilter: 'blur(20px)', borderRadius: '30px', display: 'flex', alignItems: 'center', padding: '0 10px', border: '1px solid rgba(255,255,255,0.1)' };
const inputStyle: CSSProperties = { flex: 1, backgroundColor: 'transparent', border: 'none', color: 'white', outline: 'none', padding: '0 10px', fontSize: '16px' };
const bottomControlsWrapper: CSSProperties = { position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20 };
const btnStyle: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '10px', display: 'flex', alignItems: 'center' };
const dividerStyle: CSSProperties = { width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 5px' };

// --- 2. COMPONENTS ---

function GearIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#00d2ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="#00d2ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MalvinVoiceIsland({ agent, isSleeping, isConfused }: { agent: any, isSleeping: boolean, isConfused: boolean }) {
  const isAgentSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);
  
  useEffect(() => {
    if (isSleeping) return;
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, [isSleeping]);

  return (
    <div style={{
      width: '110px', height: '44px',
      backgroundColor: 'rgba(20, 20, 20, 0.9)',
      backdropFilter: 'blur(10px)',
      borderRadius: '22px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid rgba(255,255,255,0.15)',
      transition: 'all 0.3s ease',
      transform: isAgentSpeaking ? 'scale(1.05)' : 'scale(1)',
      boxShadow: isAgentSpeaking ? '0 0 20px rgba(10, 132, 255, 0.3)' : '0 4px 15px rgba(0,0,0,0.4)',
      position: 'relative'
    }}>
      <svg width="50" height="15" viewBox="0 0 60 20" fill="none">
        <rect x="15" y={isSleeping || blink ? "9" : "5"} width="8" height={isSleeping || blink ? "2" : "10"} rx="1" fill="white" style={{ transition: 'all 0.15s ease' }} />
        <rect x="37" y={isSleeping || blink ? "9" : "5"} width="8" height={isSleeping || blink ? "2" : "10"} rx="1" fill="white" style={{ transition: 'all 0.15s ease' }} />
      </svg>
      {isAgentSpeaking && <div style={pulseStyle} />}
    </div>
  );
}

// --- 3. MAIN STAGE ---
function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [localMessages, setLocalMessages] = useState<{message: string, isLocal: boolean}[]>([]);
  const [isBackCamera, setIsBackCamera] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isConfused, setIsConfused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { chatMessages = [] } = useChat(); 
  const { localParticipant } = useLocalParticipant();

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const localCameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !localParticipant) return;
    setIsUploading(true);
    // Upload logic here...
    setIsUploading(false);
  };

  useEffect(() => {
    if (chatMessages.length === 0) return;
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage) {
      setLocalMessages(prev => [...prev.slice(-15), { message: lastMessage.message, isLocal: lastMessage.from?.isLocal || false }]);
      if (!lastMessage.from?.isLocal && lastMessage.message.includes("NOTE:")) {
          const noteContent = lastMessage.message.split("NOTE:")[1].trim();
          setNotes(prev => [...prev, noteContent]);
          setIsMenuOpen(true);
      }
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (textInput.trim() && localParticipant) {
      const data = new TextEncoder().encode(textInput);
      await localParticipant.publishData(data, { reliable: true, topic: "user_input" });
      setLocalMessages(prev => [...prev, { message: textInput, isLocal: true }]);
      setTextInput("");
    }
  };

  const toggleCameraFacing = async () => {
    if (!localParticipant) return;
    const mode: 'user' | 'environment' = isBackCamera ? 'user' : 'environment';
    await localParticipant.setCameraEnabled(false);
    await new Promise(r => setTimeout(r, 150));
    await localParticipant.setCameraEnabled(true, { facingMode: mode });
    setIsBackCamera(!isBackCamera);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden' }}>
      
      {/* SIDE MENU */}
      <div style={sideMenuStyle(isMenuOpen)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '24px', color: '#00d2ff', margin: 0 }}>Memory</h2>
          <button onClick={() => setIsMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notes.length === 0 ? (
            <p style={{ color: '#444' }}>No saved notes yet...</p>
          ) : (
            notes.map((n, i) => (
              <div key={i} style={{ padding: '15px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: '10px', fontSize: '14px', borderLeft: '3px solid #00d2ff' }}>
                {n}
              </div>
            ))
          )}
        </div>
      </div>

      {localParticipant?.isCameraEnabled && localCameraTrack && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, transform: isBackCamera ? 'none' : 'scaleX(-1)' }}>
          <VideoTrack trackRef={localCameraTrack as any} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button onClick={() => localParticipant.setCameraEnabled(false)} style={cameraCloseBtnStyle}>✕</button>
        </div>
      )}

      {/* TOP BAR CONTROLS */}
      <button onClick={onDisconnect} style={logoutBtnStyle}>✕</button>

      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100, pointerEvents: 'auto' }}>
        <button onClick={() => setIsMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
          <GearIcon />
        </button>
      </div>

      <div ref={scrollRef} style={chatAreaStyle}>
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', pointerEvents: 'none' }}>
          {localMessages.map((msg, i) => (
            <div key={i} style={{ 
              textAlign: msg.isLocal ? 'right' : 'left',
              margin: '10px 0',
              opacity: i === localMessages.length - 1 ? 1 : 0.3,
              transition: 'all 0.3s ease'
            }}>
              <span style={{ 
                display: 'inline-block',
                padding: '8px 16px',
                borderRadius: '18px',
                backgroundColor: msg.isLocal ? 'rgba(255,255,255,0.1)' : 'rgba(10, 132, 255, 0.2)',
                fontSize: '16px',
                backdropFilter: 'blur(10px)',
              }}>
                {msg.message}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ pointerEvents: 'auto' }}>
            {agent ? <MalvinVoiceIsland agent={agent} isSleeping={isSleeping} isConfused={isConfused} /> : <div style={{ fontSize: '10px', color: '#333' }}>...</div>}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={bottomControlsWrapper}>
          <div style={pillContainerStyle}>
            <button onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} style={{...btnStyle, color: localParticipant?.isMicrophoneEnabled ? '#32d74b' : '#636366'}}>
              {localParticipant?.isMicrophoneEnabled ? '🎙️' : '🔇'}
            </button>
            
            <div style={dividerStyle} />

            <input placeholder="Ask Malvin..." value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} style={inputStyle} />
            
            <button 
              onClick={textInput.trim() ? handleSendMessage : () => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} 
              style={{...btnStyle, color: '#0a84ff'}}
            >
              {textInput.trim() ? '↑' : '📷'}
            </button>
          </div>
        </div>
      </div>
      <style>{` @keyframes malvin-pulse { 0% { opacity: 0.2; transform: scaleX(0.7); } 50% { opacity: 1; transform: scaleX(1.2); } 100% { opacity: 0.2; transform: scaleX(0.7); } } `}</style>
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