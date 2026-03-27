import { useState, useEffect, useRef } from 'react';
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

// --- 1. MALVIN BOX EYES ISLAND (With Sleep & Confusion) ---
function MalvinVoiceIsland({ 
  agent, 
  isSleeping, 
  isConfused 
}: { 
  agent: any, 
  isSleeping: boolean, 
  isConfused: boolean 
}) {
  const isAgentSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);

  // Normal Blinking Logic
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
      width: '140px', height: '54px',
      backgroundColor: isSleeping ? 'rgba(10, 10, 10, 0.9)' : 'rgba(20, 20, 20, 0.85)',
      backdropFilter: 'blur(10px)',
      borderRadius: '27px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: isSleeping ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.15)',
      transition: 'all 0.8s ease',
      transform: isAgentSpeaking ? 'scale(1.1)' : 'scale(1)',
      boxShadow: isAgentSpeaking ? '0 0 25px rgba(10, 132, 255, 0.4)' : '0 4px 15px rgba(0,0,0,0.5)',
      position: 'relative'
    }}>
      {/* Confusion Question Mark */}
      {isConfused && !isAgentSpeaking && !isSleeping && (
        <div style={questionMarkStyle}>?</div>
      )}

      {/* Sleeping ZZZs */}
      {isSleeping && (
        <>
          <div className="zzz" style={{ ...zzzStyle, animationDelay: '0s' }}>z</div>
          <div className="zzz" style={{ ...zzzStyle, animationDelay: '1s' }}>z</div>
          <div className="zzz" style={{ ...zzzStyle, animationDelay: '2s' }}>Z</div>
        </>
      )}

      <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
        {/* Left Eye */}
        <rect 
          x="12" 
          y={isSleeping || blink ? "9" : (isConfused ? "4" : (isAgentSpeaking ? "2" : "5"))} 
          width="10" 
          height={isSleeping || blink ? "2" : (isConfused ? "12" : (isAgentSpeaking ? "16" : "10"))} 
          rx="1" 
          fill="white" 
          style={{ 
            transition: 'all 0.2s ease-out', 
            transform: isConfused ? 'rotate(-10deg)' : 'none',
            transformOrigin: 'center'
          }} 
        />
        {/* Right Eye */}
        <rect 
          x="38" 
          y={isSleeping || blink ? "9" : (isConfused ? "2" : (isAgentSpeaking ? "2" : "5"))} 
          width="10" 
          height={isSleeping || blink ? "2" : (isConfused ? "12" : (isAgentSpeaking ? "16" : "10"))} 
          rx="1" 
          fill="white" 
          style={{ 
            transition: 'all 0.2s ease-out',
            transform: isConfused ? 'rotate(15deg)' : 'none',
            transformOrigin: 'center'
          }} 
        />
      </svg>
      
      {isAgentSpeaking && <div style={pulseStyle} />}
      
      <style>{` 
        @keyframes malvin-pulse { 0% { opacity: 0.3; transform: scaleX(0.8); } 50% { opacity: 1; transform: scaleX(1.3); } 100% { opacity: 0.3; transform: scaleX(0.8); } } 
        @keyframes zzz-float {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translate(20px, -40px) scale(1.2); }
        }
        .zzz { animation: zzz-float 3s infinite linear; }
      `}</style>
    </div>
  );
}

// --- 2. MAIN STAGE ---
function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [localMessages, setLocalMessages] = useState<{message: string, isLocal: boolean}[]>([]);
  const [isBackCamera, setIsBackCamera] = useState(false);
  
  // New States for Personality
  const [isSleeping, setIsSleeping] = useState(false);
  const [isConfused, setIsConfused] = useState(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confusionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { chatMessages = [] } = useChat(); 
  const { localParticipant } = useLocalParticipant();
  const isAgentSpeaking = useIsSpeaking(agent);

  // 1. Inactivity (Sleep) Logic
  const resetInactivityTimer = () => {
    setIsSleeping(false);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setIsSleeping(true);
    }, 60000); // 1 minute
  };

  useEffect(() => {
    resetInactivityTimer();
    return () => { if (inactivityTimer.current) clearTimeout(inactivityTimer.current); };
  }, [chatMessages, isAgentSpeaking]);

  // 2. Camera Tracks
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const localCameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);

  // 3. Sync Messages & Check Confusion
  useEffect(() => {
    if (!chatMessages || chatMessages.length === 0) return;
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage) {
      setLocalMessages(prev => [...prev, { message: lastMessage.message, isLocal: lastMessage.from?.isLocal || false }]);
      
      // Confusion Logic: Trigger if Malvin's message ends in "?" or contains "don't understand"
      if (!lastMessage.from?.isLocal) {
        if (lastMessage.message.includes("?") || lastMessage.message.toLowerCase().includes("understand")) {
          setIsConfused(true);
          if (confusionTimer.current) clearTimeout(confusionTimer.current);
          confusionTimer.current = setTimeout(() => setIsConfused(false), 5000); // Clear after 5s
        }

        if (lastMessage.message.includes("NOTE:")) {
            const noteContent = lastMessage.message.split("NOTE:")[1].trim();
            setNotes(prev => prev.includes(noteContent) ? prev : [...prev, noteContent]);
            setIsNotepadOpen(true);
        }
      }
    }
  }, [chatMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [localMessages]);

  const handleSendMessage = async () => {
    if (textInput.trim() && localParticipant) {
      const data = new TextEncoder().encode(textInput);
      await localParticipant.publishData(data, { reliable: true, topic: "user_input" });
      setLocalMessages(prev => [...prev, { message: textInput, isLocal: true }]);
      setTextInput("");
      resetInactivityTimer();
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
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff' }}>
      
      {/* FULL SCREEN VIDEO LAYER */}
      {localParticipant?.isCameraEnabled && localCameraTrack && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, transform: isBackCamera ? 'none' : 'scaleX(-1)' }}>
          <VideoTrack trackRef={localCameraTrack as any} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button onClick={() => localParticipant.setCameraEnabled(false)} style={cameraCloseBtnStyle}>✕</button>
        </div>
      )}

      {/* UI OVERLAY LAYER */}
      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '20px', pointerEvents: 'auto' }}>
            <button onClick={() => setIsNotepadOpen(!isNotepadOpen)} style={noteBtnStyle(isNotepadOpen)}>
              {isNotepadOpen ? '📖' : '📁'}
            </button>
            {isNotepadOpen && (
              <div style={notepadBoxStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '10px', color: '#999' }}>NOTES</strong>
                  <button onClick={() => setNotes([])} style={clearBtnStyle}>CLEAR</button>
                </div>
                {notes.map((n, i) => <li key={i} style={noteItemStyle}>{n}</li>)}
              </div>
            )}
          </div>
          
          <div style={{ pointerEvents: 'auto' }}>
            {agent ? (
              <MalvinVoiceIsland 
                agent={agent} 
                isSleeping={isSleeping} 
                isConfused={isConfused} 
              />
            ) : <div style={connectingStyle}>CONNECTING...</div>}
          </div>
        </div>

        <div ref={scrollRef} style={chatAreaStyle}>
          {localMessages.map((msg, idx) => (
            <div key={idx} style={bubbleStyle(msg.isLocal)}>
              <div style={{ fontSize: '9px', opacity: 0.6, marginBottom: '2px', fontWeight: 'bold' }}>
                {msg.isLocal ? 'YOU' : 'MALVIN'}
              </div>
              {msg.message}
            </div>
          ))}
        </div>

        <div style={bottomControlsWrapper}>
          <div style={pillContainerStyle}>
            <button onClick={onDisconnect} style={{...btnStyle, color: '#ff453a'}}>✕</button>
            <div style={dividerStyle} />
            <button onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} style={{...btnStyle, color: localParticipant?.isMicrophoneEnabled ? '#32d74b' : '#636366'}}>
              {localParticipant?.isMicrophoneEnabled ? '🎙️' : '🔇'}
            </button>
            <input placeholder="Message Malvin..." value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} style={inputStyle} />
            {textInput.trim().length > 0 ? (
               <button onClick={handleSendMessage} style={{ ...btnStyle, color: '#0a84ff', fontSize: '12px', fontWeight: 'bold' }}>SEND</button>
            ) : (
              <div style={{ display: 'flex' }}>
                <button 
                  onMouseDown={() => { timerRef.current = setTimeout(toggleCameraFacing, 800); }} 
                  onMouseUp={() => timerRef.current && clearTimeout(timerRef.current)}
                  onClick={() => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} 
                  style={{...btnStyle, color: localParticipant?.isCameraEnabled ? '#0a84ff' : '#636366'}}
                >📷</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- NEW PERSONALITY STYLES ---
const zzzStyle: React.CSSProperties = {
  position: 'absolute', top: '-10px', right: '10px', color: '#0a84ff',
  fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none'
};
const questionMarkStyle: React.CSSProperties = {
  position: 'absolute', right: '-25px', top: '5px', color: '#ffcc00',
  fontSize: '24px', fontWeight: 'bold', textShadow: '0 0 10px rgba(255,204,0,0.5)'
};

// --- REST OF STYLES ---
const cameraCloseBtnStyle: React.CSSProperties = { position: 'absolute', bottom: '30px', right: '30px', width: '50px', height: '50px', borderRadius: '25px', backgroundColor: 'rgba(255, 69, 58, 0.8)', color: 'white', border: 'none', fontSize: '20px', cursor: 'pointer', backdropFilter: 'blur(5px)', zIndex: 100 };
const pulseStyle: React.CSSProperties = { position: 'absolute', bottom: '8px', width: '24px', height: '2px', background: '#0a84ff', borderRadius: '2px', animation: 'malvin-pulse 1.5s infinite' };
const noteBtnStyle = (isOpen: boolean) => ({ background: isOpen ? '#0a84ff' : 'rgba(30, 30, 30, 0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', padding: '10px', cursor: 'pointer', backdropFilter: 'blur(10px)' });
const notepadBoxStyle: React.CSSProperties = { position: 'absolute', top: '55px', left: 0, width: '220px', maxHeight: '250px', backgroundColor: '#fffbe6', color: '#333', borderRadius: '12px', padding: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflowY: 'auto', pointerEvents: 'auto' };
const chatAreaStyle: React.CSSProperties = { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px 20px 100px 20px' };
const bubbleStyle = (isLocal: boolean): React.CSSProperties => ({ alignSelf: isLocal ? 'flex-end' : 'flex-start', backgroundColor: isLocal ? 'rgba(28, 28, 30, 0.8)' : 'rgba(10, 132, 255, 0.9)', color: 'white', padding: '10px 14px', borderRadius: '15px', maxWidth: '80%', fontSize: '14px', backdropFilter: 'blur(5px)' });
const inputStyle: React.CSSProperties = { flex: 1, backgroundColor: 'transparent', border: 'none', color: 'white', outline: 'none', padding: '0 10px', fontSize: '16px', pointerEvents: 'auto' };
const pillContainerStyle: React.CSSProperties = { pointerEvents: 'auto', width: '92%', maxWidth: '450px', minHeight: '60px', backgroundColor: 'rgba(30, 30, 30, 0.75)', backdropFilter: 'blur(20px)', borderRadius: '30px', display: 'flex', alignItems: 'center', padding: '0 10px', border: '1px solid rgba(255,255,255,0.1)' };
const bottomControlsWrapper: React.CSSProperties = { position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center' };
const btnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '10px', display: 'flex', alignItems: 'center' };
const dividerStyle = { width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 5px' };
const clearBtnStyle: React.CSSProperties = { border: 'none', background: 'none', fontSize: '10px', color: '#cc0000', cursor: 'pointer' };
const noteItemStyle = { marginBottom: '5px', fontSize: '12px' };
const connectingStyle = { color: '#666', fontSize: '11px' };

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