import { useState, useEffect, useRef } from 'react';
import { ParticipantKind, Track } from 'livekit-client';
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

// --- MALVIN FACE (Only when Camera is ON) ---
function MalvinFace({ isSpeaking }: { isSpeaking: boolean }) {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200); 
    }, 6000);
    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div style={{
      width: '140px', height: '140px', borderRadius: '50%',
      position: 'relative', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#000',
      border: '3px solid transparent',
      backgroundImage: 'linear-gradient(#000, #000), linear-gradient(to right, #0070f3, #32d74b, #ff453a, #0070f3)',
      backgroundOrigin: 'border-box', backgroundClip: 'content-box, border-box',
      animation: 'rotateBorder 4s linear infinite',
      boxShadow: isSpeaking ? '0 0 40px rgba(0, 112, 243, 0.8)' : '0 0 15px rgba(255,255,255,0.1)',
      transition: 'box-shadow 0.3s ease', zIndex: 10
    }}>
      <style>{`
        @keyframes rotateBorder { from { background-position: 0% center; } to { background-position: 200% center; } }
        .eye { width: 12px; height: ${isBlinking ? '2px' : '12px'}; background: #fff; border-radius: 2px; transition: height 0.1s ease; }
      `}</style>
      <div style={{ display: 'flex', gap: '25px', marginBottom: '15px' }}>
        <div className="eye" />
        <div className="eye" />
      </div>
      <div style={{ width: '30px', height: '2px', background: 'rgba(255,255,255,0.6)', borderRadius: '2px' }} />
    </div>
  );
}

// --- VOICE ISLAND (When Camera is OFF) ---
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

// --- MAIN STAGE ---
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

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const localCameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);
  const isCameraEnabled = localParticipant?.isCameraEnabled ?? false;

  useEffect(() => {
    const last = chatMessages[chatMessages.length - 1];
    if (last) setLocalMessages(prev => [...prev, { message: last.message, isLocal: last.from?.isLocal || false }]);
  }, [chatMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [localMessages]);

  const handleSendMessage = async () => {
    if (!textInput.trim() || !localParticipant) return;
    const data = new TextEncoder().encode(textInput);
    await localParticipant.publishData(data, { reliable: true, topic: "user_input" });
    setLocalMessages(prev => [...prev, { message: textInput, isLocal: true }]);
    setTextInput("");
  };

  const toggleCameraFacing = async () => {
    if (!localParticipant || !isCameraEnabled) return;
    try {
      const newFacingMode: 'user' | 'environment' = isBackCamera ? 'user' : 'environment';
      await localParticipant.setCameraEnabled(false);
      await new Promise(r => setTimeout(r, 300));
      await localParticipant.setCameraEnabled(true, { facingMode: newFacingMode });
      setIsBackCamera(!isBackCamera);
    } catch (err) { console.error(err); }
  };

  const handlePressStart = () => {
    if (!isCameraEnabled) return;
    timerRef.current = setTimeout(() => { toggleCameraFacing(); navigator.vibrate?.(50); }, 700);
  };
  const handlePressEnd = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. BACKGROUND LAYER */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {isCameraEnabled && localCameraTrack ? (
          <div style={{ width: '100%', height: '100%', transform: isBackCamera ? 'none' : 'scaleX(-1)' }}>
            <VideoTrack trackRef={localCameraTrack as any} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#0a0a0a' }} />
        )}
      </div>

      {/* 2. TOP UI (FACE/ISLAND) */}
      <div style={{ position: 'absolute', top: 40, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        {isCameraEnabled ? (
          <MalvinFace isSpeaking={isAgentSpeaking} />
        ) : (
          agent ? <MalvinVoiceIsland agent={agent} /> : <div style={{color: '#444', fontSize: '12px'}}>WAKING MALVIN...</div>
        )}
      </div>

      {/* 3. CHAT AREA */}
      <div ref={scrollRef} style={{ 
        flex: 1, marginTop: '200px', marginBottom: '120px', padding: '0 20px', 
        overflowY: 'auto', zIndex: 5, display: 'flex', flexDirection: 'column', gap: '10px' 
      }}>
        {localMessages.map((msg, i) => (
          <div key={i} style={{
            background: msg.isLocal ? 'rgba(40,40,40,0.8)' : '#0a84ff',
            color: '#fff', padding: '12px 16px', borderRadius: '18px',
            alignSelf: msg.isLocal ? 'flex-end' : 'flex-start',
            maxWidth: '85%', backdropFilter: 'blur(10px)', fontSize: '15px'
          }}>{msg.message}</div>
        ))}
      </div>

      {/* 4. CONTROLS */}
      <div style={{ position: 'absolute', bottom: 30, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <div style={{ 
          display: 'flex', gap: 12, background: 'rgba(25,25,25,0.9)', 
          padding: '8px 16px', borderRadius: '32px', width: '92%', maxWidth: '450px',
          alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)'
        }}>
          <button onClick={onDisconnect} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>❌</button>
          <button
            onMouseDown={handlePressStart} onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd} onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}
            onClick={() => localParticipant?.setCameraEnabled(!isCameraEnabled)}
            style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: isCameraEnabled ? '#0a84ff' : '#666' }}
          >📷</button>
          <input
            placeholder="Talk to Malvin..."
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none' }}
          />
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