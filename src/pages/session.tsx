import { useState, useEffect, useRef } from 'react';
import { ParticipantKind, Track, createLocalVideoTrack } from 'livekit-client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  useRemoteParticipant,
  useIsSpeaking,
  BarVisualizer,
  LayoutContextProvider,
  useChat,
  useLocalParticipant
} from '@livekit/components-react';

interface SessionProps {
  token: string;
  serverUrl: string;
  onDisconnect: () => void;
  userEmail: string;
}

// --- MALVIN FACE COMPONENT ---
function MalvinFace({ isSpeaking }: { isSpeaking: boolean }) {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200); // Blink duration
    }, 6000);
    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div style={{
      width: '140px',
      height: '140px',
      borderRadius: '50%',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      border: '3px solid transparent',
      backgroundImage: 'linear-gradient(#000, #000), linear-gradient(to right, #0070f3, #32d74b, #ff453a, #0070f3)',
      backgroundOrigin: 'border-box',
      backgroundClip: 'content-box, border-box',
      animation: 'rotateBorder 4s linear infinite',
      boxShadow: isSpeaking ? '0 0 40px rgba(0, 112, 243, 0.8)' : '0 0 15px rgba(255,255,255,0.1)',
      transition: 'box-shadow 0.3s ease',
      zIndex: 10
    }}>
      <style>{`
        @keyframes rotateBorder { to { background-position: 200% center; } }
        .eye { width: 12px; height: ${isBlinking ? '2px' : '12px'}; background: #fff; border-radius: 2px; transition: height 0.1s ease; }
      `}</style>
      
      {/* Eyes Container */}
      <div style={{ display: 'flex', gap: '25px', marginBottom: '15px' }}>
        <div className="eye" />
        <div className="eye" />
      </div>

      {/* Mouth */}
      <div style={{ width: '30px', height: '2px', background: 'rgba(255,255,255,0.6)', borderRadius: '2px' }} />
    </div>
  );
}

// --- VOICE ISLAND ---
function MalvinVoiceIsland({ agent }: { agent: any }) {
  const isAgentSpeaking = useIsSpeaking(agent);
  return (
    <div style={{
      minWidth: '180px', height: '54px', backgroundColor: 'rgba(20,20,20,0.9)',
      borderRadius: '27px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 20px', border: '1px solid rgba(255,255,255,0.15)',
      opacity: isAgentSpeaking ? 1 : 0.8, backdropFilter: 'blur(10px)'
    }}>
      <BarVisualizer
        trackRef={{
          participant: agent,
          source: Track.Source.Microphone,
          publication: agent.getTrackPublication(Track.Source.Microphone)
        }}
        style={{ width: '80px', height: '24px' }}
      />
    </div>
  );
}

// --- MAIN UI ---
function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [isBackCamera, setIsBackCamera] = useState(false);

  const timerRef = useRef<any>(null);
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const isAgentSpeaking = useIsSpeaking(agent);
  const { chatMessages } = useChat();
  const { localParticipant } = useLocalParticipant();
  const scrollRef = useRef<HTMLDivElement>(null);

  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
    { source: Track.Source.ScreenShare, withPlaceholder: false }
  ]);

  const localCameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);
  const isCameraEnabled = !!localCameraTrack;

  // Sync Messages
  useEffect(() => {
    const last = chatMessages[chatMessages.length - 1];
    if (last) {
      setLocalMessages(prev => [...prev, { message: last.message, isLocal: last.from?.isLocal || false }]);
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!textInput.trim() || !localParticipant) return;
    const data = new TextEncoder().encode(textInput);
    await localParticipant.publishData(data, { reliable: true, topic: "user_input" });
    setLocalMessages(prev => [...prev, { message: textInput, isLocal: true }]);
    setTextInput("");
  };

  const toggleCameraFacing = async () => {
    if (!localParticipant) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      if (videoDevices.length < 2) return;

      const newFacingMode = isBackCamera ? 'user' : 'environment';
      
      await localParticipant.setCameraEnabled(false);
      await new Promise(r => setTimeout(r, 200));
      await localParticipant.setCameraEnabled(true, { facingMode: newFacingMode });

      setIsBackCamera(!isBackCamera);
    } catch (err) { console.error(err); }
  };

  const handlePressStart = () => { timerRef.current = setTimeout(() => { toggleCameraFacing(); navigator.vibrate?.(50); }, 600); };
  const handlePressEnd = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      
      {/* 1. BACKGROUND CAMERA (Full Screen) */}
      {isCameraEnabled && (
        <div style={{ 
          position: 'absolute', inset: 0, zIndex: 0,
          transform: isBackCamera ? 'none' : 'scaleX(-1)'
        }}>
          <VideoTrack 
            trackRef={localCameraTrack as any} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          {/* Dark overlay to keep chat readable */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
        </div>
      )}

      {/* 2. TOP INTERFACE */}
      <div style={{ 
        position: 'absolute', top: 40, width: '100%', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, zIndex: 10 
      }}>
        {isCameraEnabled ? (
          <MalvinFace isSpeaking={isAgentSpeaking} />
        ) : (
          agent && <MalvinVoiceIsland agent={agent} />
        )}
      </div>

      {/* 3. CHAT MESSAGES */}
      <div ref={scrollRef} style={{ 
        position: 'absolute', bottom: 120, width: '100%', maxHeight: '50%',
        padding: '0 20px', overflowY: 'auto', zIndex: 5, display: 'flex', flexDirection: 'column'
      }}>
        {localMessages.map((msg, i) => (
          <div key={i} style={{
            background: msg.isLocal ? 'rgba(40,40,40,0.8)' : '#0a84ff',
            color: '#fff', padding: '12px 16px', borderRadius: '18px',
            marginBottom: 10, alignSelf: msg.isLocal ? 'flex-end' : 'flex-start',
            maxWidth: '80%', backdropFilter: 'blur(5px)', fontSize: '15px'
          }}>
            {msg.message}
          </div>
        ))}
      </div>

      {/* 4. BOTTOM CONTROLS */}
      <div style={{ position: 'absolute', bottom: 30, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <div style={{ 
          display: 'flex', gap: 12, background: 'rgba(30,30,30,0.9)', 
          padding: '8px 16px', borderRadius: '32px', width: '90%', maxWidth: '400px',
          alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button onClick={onDisconnect} style={{ background: 'none', border: 'none', fontSize: '20px' }}>❌</button>
          
          <button
            onMouseDown={handlePressStart} onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd} onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onClick={() => localParticipant?.setCameraEnabled(!isCameraEnabled)}
            style={{ background: 'none', border: 'none', fontSize: '22px', color: isCameraEnabled ? '#0a84ff' : '#fff' }}
          >
            📷
          </button>

          <input
            placeholder="Talk to Malvin..."
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '16px' }}
          />
          {textInput.trim() && (
            <button onClick={handleSendMessage} style={{ background: 'none', border: 'none', color: '#0a84ff', fontWeight: 'bold' }}>SEND</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Session({ token, serverUrl, onDisconnect }: SessionProps) {
  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect audio video onDisconnected={onDisconnect}>
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}