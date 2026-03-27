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

// --- 1. STYLES (Defined at top to prevent Rollup build errors) ---
const pulseStyle: CSSProperties = { position: 'absolute', bottom: '8px', width: '24px', height: '2px', background: '#0a84ff', borderRadius: '2px', animation: 'malvin-pulse 1.5s infinite' };
const cameraCloseBtnStyle: CSSProperties = { position: 'absolute', bottom: '110px', right: '30px', width: '44px', height: '44px', borderRadius: '22px', backgroundColor: 'rgba(255, 69, 58, 0.8)', color: 'white', border: 'none', fontSize: '18px', cursor: 'pointer', backdropFilter: 'blur(5px)', zIndex: 100, pointerEvents: 'auto' };
const noteBtnStyle = (isOpen: boolean) => ({ background: isOpen ? '#0a84ff' : 'rgba(30, 30, 30, 0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', padding: '10px', cursor: 'pointer', backdropFilter: 'blur(10px)' });
const notepadBoxStyle: CSSProperties = { position: 'absolute', top: '55px', left: 0, width: '220px', maxHeight: '250px', backgroundColor: '#fffbe6', color: '#333', borderRadius: '12px', padding: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflowY: 'auto', pointerEvents: 'auto' };
const chatAreaStyle: CSSProperties = { position: 'absolute', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px', pointerEvents: 'none', overflowY: 'hidden', background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent, rgba(0,0,0,0.4))' };
const pillContainerStyle: CSSProperties = { pointerEvents: 'auto', width: '92%', maxWidth: '450px', minHeight: '60px', backgroundColor: 'rgba(30, 30, 30, 0.75)', backdropFilter: 'blur(20px)', borderRadius: '30px', display: 'flex', alignItems: 'center', padding: '0 10px', border: '1px solid rgba(255,255,255,0.1)' };
const inputStyle: CSSProperties = { flex: 1, backgroundColor: 'transparent', border: 'none', color: 'white', outline: 'none', padding: '0 10px', fontSize: '16px' };
const bottomControlsWrapper: CSSProperties = { position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20 };
const btnStyle: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '10px', display: 'flex', alignItems: 'center' };
const dividerStyle: CSSProperties = { width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 5px' };
const clearBtnStyle: CSSProperties = { border: 'none', background: 'none', fontSize: '10px', color: '#cc0000', cursor: 'pointer' };
const noteItemStyle: CSSProperties = { marginBottom: '5px', fontSize: '12px', listStyle: 'none' };
const connectingStyle: CSSProperties = { color: '#666', fontSize: '11px' };

// --- 2. MALVIN BOX EYES ISLAND ---
function MalvinVoiceIsland({ agent, isSleeping, isConfused }: { agent: any, isSleeping: boolean, isConfused: boolean }) {
  const isAgentSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const prevSleeping = useRef(isSleeping);

  useEffect(() => {
    if (prevSleeping.current === true && isSleeping === false) {
      setIsWaking(true);
      setTimeout(() => setIsWaking(false), 600);
    }
    prevSleeping.current = isSleeping;
  }, [isSleeping]);

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
      backgroundColor: 'rgba(20, 20, 20, 0.85)',
      backdropFilter: 'blur(10px)',
      borderRadius: '27px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid rgba(255,255,255,0.15)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isWaking ? 'scale(1.2)' : (isAgentSpeaking ? 'scale(1.1)' : 'scale(1)'),
      boxShadow: isAgentSpeaking ? '0 0 25px rgba(10, 132, 255, 0.4)' : '0 4px 15px rgba(0,0,0,0.5)',
      position: 'relative'
    }}>
      {isConfused && !isAgentSpeaking && !isSleeping && (
        <div style={{ position: 'absolute', right: '-15px', top: '-5px', color: '#ffcc00', fontSize: '20px', fontWeight: 'bold' }}>?</div>
      )}
      {isSleeping && (
        <div style={{ position: 'absolute', top: '-15px', right: '5px' }}>
          <div className="zzz" style={{ animationDelay: '0s' }}>z</div>
          <div className="zzz" style={{ animationDelay: '1s' }}>z</div>
        </div>
      )}
      <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
        <rect x="12" y={isSleeping || blink ? "9" : (isConfused ? "4" : (isAgentSpeaking ? "2" : "5"))} width="10" height={isSleeping || blink ? "2" : (isConfused ? "12" : (isAgentSpeaking ? "16" : "10"))} rx="1" fill="white" style={{ transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)', opacity: isSleeping ? 0.3 : 1, transform: isWaking ? 'scale(1.4)' : (isConfused ? 'rotate(-10deg)' : 'none'), transformOrigin: 'center' }} />
        <rect x="38" y={isSleeping || blink ? "9" : (isConfused ? "2" : (isAgentSpeaking ? "2" : "5"))} width="10" height={isSleeping || blink ? "2" : (isConfused ? "12" : (isAgentSpeaking ? "16" : "10"))} rx="1" fill="white" style={{ transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)', opacity: isSleeping ? 0.3 : 1, transform: isWaking ? 'scale(1.4)' : (isConfused ? 'rotate(10deg)' : 'none'), transformOrigin: 'center' }} />
      </svg>
      {isAgentSpeaking && <div style={pulseStyle} />}
      <style>{` 
        @keyframes malvin-pulse { 0% { opacity: 0.3; transform: scaleX(0.8); } 50% { opacity: 1; transform: scaleX(1.3); } 100% { opacity: 0.3; transform: scaleX(0.8); } } 
        @keyframes zzz-float { 0% { opacity: 0; transform: translateY(0); } 50% { opacity: 1; } 100% { opacity: 0; transform: translateY(-20px) translateX(10px); } }
        .zzz { position: absolute; animation: zzz-float 3s infinite; color: #0a84ff; font-weight: bold; font-size: 14px; pointer-events: none; }
      `}</style>
    </div>
  );
}

// --- 3. MAIN STAGE ---
function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [localMessages, setLocalMessages] = useState<{message: string, isLocal: boolean}[]>([]);
  const [isBackCamera, setIsBackCamera] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isConfused, setIsConfused] = useState(false);
  
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { chatMessages = [] } = useChat(); 
  const { localParticipant } = useLocalParticipant();
  const isUserSpeaking = useIsSpeaking(localParticipant);

  const resetInactivity = () => {
    setIsSleeping(false);
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    sleepTimer.current = setTimeout(() => setIsSleeping(true), 60000);
  };

  useEffect(() => {
    if (isUserSpeaking || (agent && agent.isSpeaking) || chatMessages.length > 0) {
      resetInactivity();
    }
  }, [isUserSpeaking, agent?.isSpeaking, chatMessages]);

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const localCameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);

  useEffect(() => {
    if (chatMessages.length === 0) return;
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage) {
      setLocalMessages(prev => [...prev.slice(-15), { message: lastMessage.message, isLocal: lastMessage.from?.isLocal || false }]);
      if (!lastMessage.from?.isLocal) {
        if (lastMessage.message.includes("?")) {
          setIsConfused(true);
          setTimeout(() => setIsConfused(false), 4500);
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages]);

  const handleSendMessage = async () => {
    if (textInput.trim() && localParticipant) {
      const data = new TextEncoder().encode(textInput);
      await localParticipant.publishData(data, { reliable: true, topic: "user_input" });
      setLocalMessages(prev => [...prev, { message: textInput, isLocal: true }]);
      setTextInput("");
      resetInactivity();
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
      
      {localParticipant?.isCameraEnabled && localCameraTrack && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, transform: isBackCamera ? 'none' : 'scaleX(-1)' }}>
          <VideoTrack trackRef={localCameraTrack as any} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button onClick={() => localParticipant.setCameraEnabled(false)} style={cameraCloseBtnStyle}>✕</button>
        </div>
      )}

      {/* --- BACKGROUND CHAT LOG (The context you asked for) --- */}
      <div ref={scrollRef} style={chatAreaStyle}>
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', pointerEvents: 'none' }}>
          {localMessages.map((msg, i) => (
            <div key={i} style={{ 
              textAlign: msg.isLocal ? 'right' : 'left',
              margin: '12px 0',
              opacity: i === localMessages.length - 1 ? 1 : 0.4,
              transition: 'all 0.3s ease'
            }}>
              <span style={{ 
                display: 'inline-block',
                padding: '10px 18px',
                borderRadius: '15px',
                backgroundColor: msg.isLocal ? 'rgba(255,255,255,0.1)' : 'rgba(10, 132, 255, 0.25)',
                fontSize: '18px',
                fontWeight: 500,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {msg.message}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        
        {/* TOP BAR */}
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
                {notes.map((n, i) => <li key={i} style={noteItemStyle}>• {n}</li>)}
              </div>
            )}
          </div>
          
          <div style={{ pointerEvents: 'auto' }}>
            {agent ? <MalvinVoiceIsland agent={agent} isSleeping={isSleeping} isConfused={isConfused} /> : <div style={connectingStyle}>CONNECTING...</div>}
          </div>
        </div>

        {/* SPACER */}
        <div style={{ flex: 1 }} />

        {/* BOTTOM CONTROLS */}
        <div style={bottomControlsWrapper}>
          <div style={pillContainerStyle}>
            <button onClick={onDisconnect} style={{...btnStyle, color: '#ff453a'}}>✕</button>
            <div style={dividerStyle} />
            <button onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} style={{...btnStyle, color: localParticipant?.isMicrophoneEnabled ? '#32d74b' : '#636366'}}>
              {localParticipant?.isMicrophoneEnabled ? '🎙️' : '🔇'}
            </button>
            <input placeholder="Message Malvin..." value={textInput} onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} style={inputStyle} />
            <button 
              onMouseDown={() => { timerRef.current = setTimeout(toggleCameraFacing, 800); }} 
              onMouseUp={() => timerRef.current && clearTimeout(timerRef.current)}
              onClick={textInput.trim() ? handleSendMessage : () => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} 
              style={{...btnStyle, color: textInput.trim() ? '#0a84ff' : (localParticipant?.isCameraEnabled ? '#0a84ff' : '#636366')}}
            >
              {textInput.trim() ? '↑' : '📷'}
            </button>
          </div>
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