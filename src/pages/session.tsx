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

// --- 1. MALVIN BOX EYES ISLAND ---
function MalvinVoiceIsland({ agent }: { agent: any }) {
  const isAgentSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);

  // Periodic Blink Logic
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div style={{
      width: '140px', 
      height: '54px',
      backgroundColor: 'rgba(20, 20, 20, 0.95)', 
      borderRadius: '27px',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      border: '1px solid rgba(255,255,255,0.15)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isAgentSpeaking ? 'scale(1.1)' : 'scale(1)',
      boxShadow: isAgentSpeaking 
        ? '0 0 25px rgba(10, 132, 255, 0.4)' 
        : '0 4px 15px rgba(0,0,0,0.5)',
      position: 'relative'
    }}>
      <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
        {/* Left Eye */}
        <rect 
          x="12" 
          y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} 
          width="10" 
          height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} 
          rx="1" 
          fill="white" 
          style={{ transition: 'all 0.1s ease-out' }}
        />
        {/* Right Eye */}
        <rect 
          x="38" 
          y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} 
          width="10" 
          height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} 
          rx="1" 
          fill="white" 
          style={{ transition: 'all 0.1s ease-out' }}
        />
      </svg>
      
      {/* Animated Voice Indicator */}
      {isAgentSpeaking && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          width: '24px',
          height: '2px',
          background: '#0a84ff',
          borderRadius: '2px',
          animation: 'malvin-pulse 1.5s infinite'
        }} />
      )}

      <style>{`
        @keyframes malvin-pulse {
          0% { opacity: 0.3; transform: scaleX(0.8); }
          50% { opacity: 1; transform: scaleX(1.3); }
          100% { opacity: 0.3; transform: scaleX(0.8); }
        }
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
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { chatMessages = [] } = useChat(); 
  const { localParticipant } = useLocalParticipant();

  // Sync Geolocation
  useEffect(() => {
    if (localParticipant) {
      navigator.geolocation.getCurrentPosition((pos) => {
        localParticipant.setAttributes({
          "user.lat": pos.coords.latitude.toString(),
          "user.lng": pos.coords.longitude.toString()
        });
      }, () => console.log("Location access restricted"));
    }
  }, [localParticipant]);

  // Sync Notes & Local History
  useEffect(() => {
    if (!chatMessages || chatMessages.length === 0) return;
    
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage) {
      setLocalMessages(prev => [...prev, { message: lastMessage.message, isLocal: lastMessage.from?.isLocal || false }]);
      
      if (!lastMessage.from?.isLocal && lastMessage.message.includes("NOTE:")) {
          const noteContent = lastMessage.message.split("NOTE:")[1].trim();
          setNotes(prev => prev.includes(noteContent) ? prev : [...prev, noteContent]);
          setIsNotepadOpen(true);
      }
    }
  }, [chatMessages]);

  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
    { source: Track.Source.ScreenShare, withPlaceholder: false }
  ]);

  const localCameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);
  const localScreenTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.ScreenShare);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [localMessages]);

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
    try {
      const mode: 'user' | 'environment' = isBackCamera ? 'user' : 'environment';
      await localParticipant.setCameraEnabled(false);
      await new Promise(r => setTimeout(r, 150));
      await localParticipant.setCameraEnabled(true, { facingMode: mode });
      setIsBackCamera(!isBackCamera);
    } catch (err) { console.error(err); }
  };

  const handlePressStart = () => {
    timerRef.current = setTimeout(() => {
      toggleCameraFacing();
      if (navigator.vibrate) navigator.vibrate(50);
    }, 800);
  };

  const handlePressEnd = () => timerRef.current && clearTimeout(timerRef.current);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* NOTEPAD */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 110 }}>
        <button onClick={() => setIsNotepadOpen(!isNotepadOpen)} style={noteBtnStyle(isNotepadOpen)}>
          {isNotepadOpen ? '📖' : '📁'}
        </button>
        {isNotepadOpen && (
          <div style={notepadBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong style={{ fontSize: '10px', color: '#999' }}>MALVIN'S NOTES</strong>
              <button onClick={() => setNotes([])} style={clearBtnStyle}>CLEAR</button>
            </div>
            {notes.length === 0 ? <p style={{ fontSize: '12px', opacity: 0.5 }}>Empty...</p> : (
              <ul style={{ paddingLeft: '15px', margin: 0, fontSize: '13px' }}>
                {notes.map((n, i) => <li key={i} style={noteItemStyle}>{n}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* BOX EYES ISLAND */}
      <div style={islandContainerStyle}>
        {agent ? <MalvinVoiceIsland agent={agent} /> : <div style={connectingStyle}>CONNECTING...</div>}
      </div>

      {/* MESSAGES */}
      <div ref={scrollRef} style={chatAreaStyle}>
        {localMessages.map((msg, idx) => (
          <div key={idx} style={bubbleStyle(msg.isLocal)}>
            <div style={{ fontSize: '9px', opacity: 0.5, marginBottom: '4px', fontWeight: '800' }}>
              {msg.isLocal ? 'YOU' : 'MALVIN'}
            </div>
            {msg.message}
          </div>
        ))}
      </div>

      {/* CAMERA OVERLAYS */}
      <div style={videoOverlayStyle}>
        {localScreenTrack && (
          <div style={{ ...videoBoxStyle, width: '160px', aspectRatio: '16/9', pointerEvents: 'auto' }}>
            <VideoTrack trackRef={localScreenTrack as any} />
          </div>
        )}
        {localCameraTrack && (
          <div style={{ ...videoBoxStyle, width: '80px', height: '110px', transform: isBackCamera ? 'none' : 'scaleX(-1)', pointerEvents: 'auto' }}>
            <VideoTrack trackRef={localCameraTrack as any} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          </div>
        )}
      </div>

      {/* CONTROLS */}
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
              <button onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onTouchStart={handlePressStart} onTouchEnd={handlePressEnd} onClick={() => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} style={{...btnStyle, color: localParticipant?.isCameraEnabled ? '#0a84ff' : '#636366'}}>📷</button>
              <button onClick={() => localParticipant?.setScreenShareEnabled(!localParticipant.isScreenShareEnabled)} style={{...btnStyle, color: localParticipant?.isScreenShareEnabled ? '#0a84ff' : '#636366'}}>🖥️</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- STYLES ---
const noteBtnStyle = (isOpen: boolean) => ({ background: isOpen ? '#0a84ff' : 'rgba(30, 30, 30, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', padding: '10px', cursor: 'pointer', fontSize: '18px', backdropFilter: 'blur(10px)' });
const notepadBoxStyle: React.CSSProperties = { position: 'absolute', top: '55px', left: 0, width: '240px', maxHeight: '300px', backgroundColor: '#fffbe6', color: '#333', borderRadius: '12px', padding: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 120, overflowY: 'auto' };
const islandContainerStyle: React.CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: '20px', display: 'flex', justifyContent: 'center', zIndex: 100, pointerEvents: 'none' };
const chatAreaStyle: React.CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '110px 20px 140px 20px', zIndex: 50 };
const bubbleStyle = (isLocal: boolean): React.CSSProperties => ({ alignSelf: isLocal ? 'flex-end' : 'flex-start', backgroundColor: isLocal ? '#1c1c1e' : '#0a84ff', color: 'white', padding: '12px 16px', borderRadius: '18px', maxWidth: '85%', fontSize: '14px' });
const inputStyle: React.CSSProperties = { flex: 1, backgroundColor: 'transparent', border: 'none', color: 'white', outline: 'none', padding: '0 10px', fontSize: '16px' };
const pillContainerStyle: React.CSSProperties = { pointerEvents: 'auto', width: '92%', maxWidth: '480px', minHeight: '64px', backgroundColor: 'rgba(30, 30, 30, 0.9)', backdropFilter: 'blur(20px)', borderRadius: '32px', display: 'flex', alignItems: 'center', padding: '0 12px', border: '1px solid rgba(255,255,255,0.1)' };
const bottomControlsWrapper: React.CSSProperties = { position: 'absolute', bottom: '40px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100, pointerEvents: 'none' };
const videoOverlayStyle: React.CSSProperties = { position: 'absolute', top: '100px', right: '16px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 60 };
const btnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '10px', display: 'flex', alignItems: 'center' };
const dividerStyle = { width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 8px' };
const videoBoxStyle = { borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#111' };
const clearBtnStyle: React.CSSProperties = { border: 'none', background: 'none', fontSize: '10px', color: '#cc0000', cursor: 'pointer' };
const noteItemStyle = { marginBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '4px' };
const connectingStyle = { marginTop: '10px', color: '#666', fontSize: '11px', letterSpacing: '1px' };

export default function Session({ token, serverUrl, onDisconnect }: SessionProps) {
  return (
    <LiveKitRoom 
      token={token} 
      serverUrl={serverUrl} 
      connect={true} 
      audio={true} 
      video={true} 
      onDisconnected={onDisconnect}
    >
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}