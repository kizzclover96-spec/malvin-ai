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
  useLocalParticipant,
  useRoomContext
} from '@livekit/components-react';

interface SessionProps {
  token: string;
  serverUrl: string;
  onDisconnect: () => void;
  userEmail: string;
}

// --- VOICE ISLAND ---
function MalvinVoiceIsland({ agent }: { agent: any }) {
  const isAgentSpeaking = useIsSpeaking(agent);

  return (
    <div style={{
      minWidth: '180px',
      height: '54px',
      backgroundColor: 'rgba(20,20,20,0.95)',
      borderRadius: '27px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 20px',
      border: '1px solid rgba(255,255,255,0.15)',
      opacity: isAgentSpeaking ? 1 : 0.8,
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
  const [notes, setNotes] = useState<string[]>([]);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [isBackCamera, setIsBackCamera] = useState(false);

  const timerRef = useRef<any>(null);
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { chatMessages } = useChat();
  const { localParticipant } = useLocalParticipant();
  const scrollRef = useRef<HTMLDivElement>(null);

  // TRACKS
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
    { source: Track.Source.ScreenShare, withPlaceholder: false }
  ]);

  const localCameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);

  // CHAT SYNC
  useEffect(() => {
    const last = chatMessages[chatMessages.length - 1];
    if (last) {
      setLocalMessages(prev => [...prev, {
        message: last.message,
        isLocal: last.from?.isLocal || false
      }]);
    }
  }, [chatMessages]);

  // SCROLL
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [localMessages]);

  // SEND MESSAGE
  const handleSendMessage = async () => {
    if (!textInput.trim() || !localParticipant) return;

    const data = new TextEncoder().encode(textInput);

    await localParticipant.publishData(data, {
      reliable: true,
      topic: "user_input"
    });

    setLocalMessages(prev => [...prev, { message: textInput, isLocal: true }]);
    setTextInput("");
  };

  // 🔥 CAMERA SWITCH (FIXED)
  const toggleCameraFacing = async () => {
    if (!localParticipant) return;

    const newFacingMode: 'user' | 'environment' = isBackCamera ? 'user' : 'environment';

    try {
      // create new camera
      const newTrack = await createLocalVideoTrack({
        facingMode: newFacingMode
      });

      // remove old camera
      const camPub = Array.from(localParticipant.videoTrackPublications.values())
        .find(pub => pub.source === Track.Source.Camera);

      if (camPub?.track) {
        await localParticipant.unpublishTrack(camPub.track);
        camPub.track.stop();
      }

      // publish new
      await localParticipant.publishTrack(newTrack);

      setIsBackCamera(!isBackCamera);

    } catch (err) {
      console.error("Camera switch failed:", err);
    }
  };

  // HOLD TO SWITCH
  const handlePressStart = () => {
    timerRef.current = setTimeout(() => {
      toggleCameraFacing();
      navigator.vibrate?.(50);
    }, 500);
  };

  const handlePressEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>

      {/* VOICE */}
      <div style={{ position: 'absolute', top: 20, width: '100%', display: 'flex', justifyContent: 'center' }}>
        {agent && <MalvinVoiceIsland agent={agent} />}
      </div>

      {/* CHAT */}
      <div ref={scrollRef} style={{ padding: 20, marginTop: 100, overflowY: 'auto', height: '70%' }}>
        {localMessages.map((msg, i) => (
          <div key={i} style={{
            background: msg.isLocal ? '#1c1c1e' : '#0a84ff',
            color: '#fff',
            padding: 10,
            borderRadius: 10,
            marginBottom: 10,
            alignSelf: msg.isLocal ? 'flex-end' : 'flex-start'
          }}>
            {msg.message}
          </div>
        ))}
      </div>

      {/* CAMERA PREVIEW */}
      {localCameraTrack && (
        <div style={{
          position: 'absolute',
          right: 20,
          top: 120,
          width: 90,
          height: 120,
          overflow: 'hidden',
          borderRadius: 12,
          transform: isBackCamera ? 'none' : 'scaleX(-1)'
        }}>
          <VideoTrack trackRef={localCameraTrack as any} />
        </div>
      )}

      {/* CONTROLS */}
      <div style={{
        position: 'absolute',
        bottom: 30,
        width: '100%',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{
          display: 'flex',
          gap: 10,
          background: '#222',
          padding: 10,
          borderRadius: 30
        }}>
          <button onClick={onDisconnect}>❌</button>

          <button
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
          >
            📷
          </button>

          <input
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          />
        </div>
      </div>
    </div>
  );
}

// --- ROOT ---
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