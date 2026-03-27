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

// --- 1. THE LIVING FACE COMPONENT ---
function MalvinLivingFace({ isSpeaking }: { isSpeaking: boolean }) {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 6000);
    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div style={{
      width: '130px',
      height: '130px',
      borderRadius: '50%',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      border: '3px solid transparent',
      backgroundImage: 'linear-gradient(#000, #000), linear-gradient(to right, #0070f3, #32d74b, #ff453a, #0070f3)',
      backgroundOrigin: 'border-box',
      backgroundClip: 'content-box, border-box',
      animation: 'rotateBorder 4s linear infinite',
      boxShadow: isSpeaking ? '0 0 35px rgba(10, 132, 255, 0.7)' : '0 0 10px rgba(255,255,255,0.1)',
      transition: 'box-shadow 0.3s ease',
    }}>
      <style>{`
        @keyframes rotateBorder { from { background-position: 0% center; } to { background-position: 200% center; } }
      `}</style>
      
      {/* Eyes */}
      <div style={{ display: 'flex', gap: '22px', marginBottom: '12px' }}>
        <div style={{ width: '12px', height: isBlinking ? '2px' : '12px', backgroundColor: '#fff', borderRadius: '2px', transition: 'height 0.1s' }} />
        <div style={{ width: '12px', height: isBlinking ? '2px' : '12px', backgroundColor: '#fff', borderRadius: '2px', transition: 'height 0.1s' }} />
      </div>

      {/* Mouth */}
      <div style={{ width: '28px', height: '2px', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '2px' }} />
    </div>
  );
}

// --- 2. VOICE ISLAND (Capsule) ---
function MalvinVoiceIsland({ agent }: { agent: any }) {
  const isAgentSpeaking = useIsSpeaking(agent);
  return (
    <div style={{
      minWidth: '180px', height: '54px', backgroundColor: 'rgba(20,20,20,0.95)',
      borderRadius: '27px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 20px', border: '1px solid rgba(255,255,255,0.15)', opacity: isAgentSpeaking ? 1 : 0.8,
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

// --- 3. MAIN UI ---
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
  ]);

  const localCameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);
  const isCameraEnabled = localParticipant?.isCameraEnabled ?? false;

  useEffect(() => {
    const last = chatMessages[chatMessages.length - 1];
    if (last) {
      setLocalMessages(prev => [...prev, { message: last.message, isLocal: last.from?.isLocal || false }]);
    }
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

  const getCameraDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'videoinput');
  };

  const toggleCameraFacing = async () => {
    if (!localParticipant || !isCameraEnabled) return;
    try {
      const devices = await getCameraDevices();
      if (devices.length < 2) return;

      const backCam = devices.find(d => d.label.toLowerCase().includes('back'));
      const frontCam = devices.find(d => d.label.toLowerCase().includes('front'));
      const newDevice = isBackCamera ? (frontCam || devices[0]) : (backCam || devices[1]);

      const newTrack = await createLocalVideoTrack({ deviceId: { exact: newDevice.deviceId } });
      const camPub = Array.from(localParticipant.videoTrackPublications.values()).find(pub => pub.source === Track.Source.Camera);

      if (camPub?.track) {
        await localParticipant.unpublishTrack(camPub.track);
        camPub.track.stop();
      }

      await localParticipant.publishTrack(newTrack);
      setIsBackCamera(!isBackCamera);
    } catch (err) { console.error("Switch failed:", err); }
  };

  const handlePressStart = () => {
    if (!isCameraEnabled) return;
    timerRef.current = setTimeout(() => {
      toggleCameraFacing();
      navigator.vibrate?.(50);
    }, 600);
  };

  const handlePressEnd = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      
      {/* BACKGROUND CAMERA */}
      {isCameraEnabled && localCameraTrack && (
        <div style={{ 
          position: 'absolute', inset: 0, zIndex: 0, 
          transform: isBackCamera ? 'none' : 'scaleX(-1)' 
        }}>
          <VideoTrack trackRef={localCameraTrack as any} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
        </div>
      )}

      {/* TOP INTERFACE */}
      <div style={{ position: 'absolute', top: 40, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        {isCameraEnabled ? (
          <MalvinLivingFace isSpeaking={isAgentSpeaking} />
        ) : (
          agent && <MalvinVoiceIsland agent={agent} />
        )}
      </div>

      {/* CHAT AREA */}
      <div ref={scrollRef} style={{ 
        position: 'absolute', bottom: 120, left: 0, right: 0, maxHeight: '50%',
        padding: '0 20px', overflowY: 'auto', zIndex: 5, display: 'flex', flexDirection: 'column'
      }}>
        {localMessages.map((msg, i) => (
          <div key={i} style={{
            background: msg.isLocal ? 'rgba(30,30,30,0.8)' : '#0a84ff',
            color: '#fff', padding: '12px 16px', borderRadius: '18px',
            marginBottom: 10, alignSelf: msg.isLocal ? 'flex-end' : 'flex-start',
            maxWidth: '85%', backdropFilter: 'blur(10px)', fontSize: '15px'
          }}>
            {msg.message}
          </div>
        ))}
      </div>

      {/* CONTROLS */}
      <div style={{ position: 'absolute', bottom: 30, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <div style={{ 
          display: 'flex', gap: 12, background: 'rgba(30,30,30,0.95)', 
          padding: '8px 16px', borderRadius: '32px', width: '92%', maxWidth: '450px',
          alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)'
        }}>
          <button onClick={onDisconnect} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>❌</button>
          
          <button
            onMouseDown={handlePressStart} onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd} onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onClick={() => localParticipant?.setCameraEnabled(!isCameraEnabled)}
            style={{ 
              background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer',
              color: isCameraEnabled ? '#0a84ff' : '#fff'
            }}
          >📷</button>

          <input
            placeholder="Talk to Malvin..."
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '16px' }}
          />
        </div>
      </div>
    </div>
  );
}

// --- ROOT ---
export default function Session({ token, serverUrl, onDisconnect }: SessionProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false} // Camera starts OFF
      onDisconnected={onDisconnect}
    >
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}