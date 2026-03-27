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

// --- MALVIN FACE ---
function MalvinFace({ isSpeaking }: { isSpeaking: boolean }) {
  const [isBlinking, setIsBlinking] = useState(false);
  useEffect(() => {
    const i = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 6000);
    return () => clearInterval(i);
  }, []);

  return (
    <div style={{
      width: '120px', height: '120px', borderRadius: '50%', background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      border: '3px solid #333', boxShadow: isSpeaking ? '0 0 30px #0a84ff' : 'none',
      transition: 'all 0.3s ease', position: 'relative'
    }}>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
        <div style={{ width: '10px', height: isBlinking ? '2px' : '10px', background: '#fff', borderRadius: '2px' }} />
        <div style={{ width: '10px', height: isBlinking ? '2px' : '10px', background: '#fff', borderRadius: '2px' }} />
      </div>
      <div style={{ width: '25px', height: '2px', background: 'rgba(255,255,255,0.4)' }} />
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

  const toggleCamera = async () => {
    if (!localParticipant) return;
    const nextState = !isCameraEnabled;
    await localParticipant.setCameraEnabled(nextState, { facingMode: isBackCamera ? 'environment' : 'user' });
  };

  return (
    <div style={{ 
      position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff',
      display: 'flex', flexDirection: 'column', overflow: 'hidden' 
    }}>
      
      {/* CAMERA LAYER (Absolute Background) */}
      {isCameraEnabled && localCameraTrack && (
        <div style={{ 
          position: 'absolute', inset: 0, zIndex: 1, 
          transform: isBackCamera ? 'none' : 'scaleX(-1)' 
        }}>
          <VideoTrack trackRef={localCameraTrack as any} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
        </div>
      )}

      {/* UI LAYER (Foreground) */}
      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Header */}
        <div style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
          {isCameraEnabled ? (
            <MalvinFace isSpeaking={isAgentSpeaking} />
          ) : (
            agent && (
              <div style={{ background: 'rgba(30,30,30,0.8)', padding: '15px 25px', borderRadius: '30px', border: '1px solid #444' }}>
                <BarVisualizer 
                  trackRef={{ participant: agent, source: Track.Source.Microphone, publication: agent.getTrackPublication(Track.Source.Microphone) }} 
                  style={{ width: '80px', height: '20px' }} 
                />
              </div>
            )
          )}
        </div>

        {/* Chat */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {localMessages.map((msg, i) => (
            <div key={i} style={{
              alignSelf: msg.isLocal ? 'flex-end' : 'flex-start',
              background: msg.isLocal ? '#333' : '#0a84ff',
              padding: '10px 15px', borderRadius: '15px', maxWidth: '80%'
            }}>{msg.message}</div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ 
            width: '100%', maxWidth: '400px', background: '#1c1c1e', 
            borderRadius: '25px', display: 'flex', alignItems: 'center', padding: '5px 15px' 
          }}>
            <button onClick={onDisconnect} style={{ background: 'none', border: 'none', padding: '10px' }}>❌</button>
            <button onClick={toggleCamera} style={{ background: 'none', border: 'none', fontSize: '20px', color: isCameraEnabled ? '#0a84ff' : '#666' }}>📷</button>
            <input 
              placeholder="Message Malvin..."
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              style={{ flex: 1, background: 'none', border: 'none', color: '#fff', padding: '10px', outline: 'none' }}
            />
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