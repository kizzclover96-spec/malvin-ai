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
}

// --- 1. MALVIN VOICE ISLAND (Visualizer) ---
function MalvinVoiceIsland({ agent }: { agent: any }) {
  const isAgentSpeaking = useIsSpeaking(agent);

  return (
    <div style={{
      marginTop: '20px',
      minWidth: '200px', 
      height: '60px',
      backgroundColor: '#111',
      borderRadius: '30px',
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 25px',
      border: '1px solid #222',
      transition: 'all 0.4s ease',
      opacity: isAgentSpeaking ? 1 : 0.4,
      transform: isAgentSpeaking ? 'scale(1.05)' : 'scale(1)',
      boxShadow: isAgentSpeaking ? '0 0 30px rgba(0, 255, 0, 0.15)' : 'none',
      zIndex: 20
    }}>
      <BarVisualizer 
        trackRef={{ 
          participant: agent, 
          source: Track.Source.Microphone,
          publication: agent.getTrackPublication(Track.Source.Microphone) 
        }} 
        style={{ width: '100px', height: '30px' }}
      />
    </div>
  );
}

// --- 2. VIDEO STAGE (The Main UI) ---
function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { send, chatMessages } = useChat();
  const { localParticipant } = useLocalParticipant();
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
    { source: Track.Source.ScreenShare, withPlaceholder: false }
  ]);

  const localCameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);
  const localScreenTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.ScreenShare);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (textInput.trim()) {
      send(textInput);
      setTextInput("");
    }
  };

  return (
    <div style={{ 
      position: 'fixed', // Use fixed to pin to the actual viewport
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      width: '100%', 
      height: '100%', 
      backgroundColor: '#000', 
      color: 'white', 
      fontFamily: '"Inter", sans-serif',
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      overflow: 'hidden',
      touchAction: 'none' // Prevents accidental drag-scrolling of the UI
    }}>
      
      {/* TOP ISLAND */}
      {agent ? <MalvinVoiceIsland agent={agent} /> : (
        <div style={{ marginTop: '30px', color: '#444', fontSize: '12px', zIndex: 20 }}>INITIALIZING MALVIN...</div>
      )}

      {/* CHAT AREA */}
      <div 
        ref={scrollRef}
        style={{
          flex: 1, 
          width: '95%', 
          padding: '20px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '14px', 
          paddingBottom: '140px', // Extra space for the dock
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch' // Smooth scroll for iOS/Android
        }}
      >
        {chatMessages.map((msg, idx) => {
          const isFromUser = msg.from?.isLocal;
          return (
            <div key={idx} style={{
              alignSelf: isFromUser ? 'flex-end' : 'flex-start',
              backgroundColor: isFromUser ? '#1a1a1a' : '#007AFF', 
              color: 'white', 
              padding: '12px 18px', 
              borderRadius: isFromUser ? '20px 20px 2px 20px' : '20px 20px 20px 2px', 
              maxWidth: '80%', 
              fontSize: '15px', 
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)', 
              whiteSpace: 'pre-wrap'
            }}>
              <div style={{ fontSize: '10px', opacity: 0.5, marginBottom: '4px', fontWeight: 'bold' }}>
                {isFromUser ? 'YOU' : 'MALVIN'}
              </div>
              {msg.message}
            </div>
          );
        })}
      </div>

      {/* FLOATING VIDEO WINDOWS */}
      <div style={{
        position: 'absolute', 
        top: '90px', // Moved down slightly to clear the Voice Island
        left: '20px',
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px', 
        zIndex: 15,
        alignItems: 'flex-start'
      }}>
        {localScreenTrack && (
          <div style={{ ...videoBoxStyle, width: '280px', aspectRatio: '16/9' }}>
            <VideoTrack trackRef={localScreenTrack as any} />
          </div>
        )}
        {localCameraTrack && (
          <div style={{ 
            ...videoBoxStyle, 
            width: '160px', 
            height: '120px', 
            transform: 'scaleX(-1)' 
          }}>
            <VideoTrack 
              trackRef={localCameraTrack as any} 
              style={{ objectFit: 'cover', width: '100%', height: '100%' }} 
            />
          </div>
        )}
      </div>

      {/* BOTTOM CONTROL DOCK */}
      <div style={{
        position: 'absolute', 
        bottom: '35px', // Adjusted for mobile safe-areas
        width: '92%', 
        height: '65px',
        backgroundColor: 'rgba(25, 25, 25, 0.9)', 
        backdropFilter: 'blur(20px)', 
        borderRadius: '35px', 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 15px',
        border: '1px solid rgba(255,255,255,0.08)', 
        zIndex: 100
      }}>
        <button onClick={onDisconnect} style={{...btnStyle, color: '#FF3B30', fontSize: '24px'}}>✕</button>
        <div style={{ width: '1px', height: '25px', backgroundColor: '#333', margin: '0 10px' }} />
        
        <button 
          onClick={() => localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)}
          style={{...btnStyle, color: localParticipant.isMicrophoneEnabled ? '#00FF00' : '#ccc'}}
        >🎙️</button>

        <input 
          placeholder="Message Malvin..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          style={{ 
            flex: 1, 
            backgroundColor: 'transparent', 
            border: 'none', 
            color: 'white', 
            outline: 'none', 
            padding: '0 10px', 
            fontSize: '16px' 
          }} 
        />

        <button onClick={handleSendMessage} style={{ ...btnStyle, color: '#007AFF', fontWeight: 'bold' }}>SEND</button>
        <div style={{ width: '1px', height: '25px', backgroundColor: '#333', margin: '0 10px' }} />

        <button 
          onClick={() => localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled)} 
          style={{...btnStyle, color: localParticipant.isCameraEnabled ? '#007AFF' : '#ccc'}}
        >📷</button>

        <button 
          onClick={() => localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled)}
          style={{...btnStyle, color: localParticipant.isScreenShareEnabled ? '#007AFF' : '#ccc'}}
        >🖥️</button>
      </div>
    </div>
  );
}

// --- STYLES & EXPORT ---
const btnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '8px', color: '#ccc' };
const videoBoxStyle = { 
  borderRadius: '15px', 
  overflow: 'hidden', 
  border: '1px solid #333', 
  backgroundColor: '#000',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)' 
};

export default function Session({ token, serverUrl, onDisconnect }: SessionProps) {
  return (
    <LiveKitRoom 
      token={token} 
      serverUrl={serverUrl} 
      connect={true} 
      audio={true} 
      video={false} 
      screen={false} 
      onDisconnected={onDisconnect}
    >
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}