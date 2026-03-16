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
      minWidth: '180px', 
      height: '54px',
      backgroundColor: 'rgba(15, 15, 15, 0.9)',
      borderRadius: '27px',
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 20px',
      border: '1px solid rgba(255,255,255,0.1)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: isAgentSpeaking ? 1 : 0.6,
      transform: isAgentSpeaking ? 'scale(1.05)' : 'scale(1)',
      boxShadow: isAgentSpeaking ? '0 0 25px rgba(50, 215, 75, 0.2)' : 'none',
      zIndex: 20
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

  // Auto-scroll to bottom on new messages
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
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#000', 
      color: 'white', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      overflow: 'hidden',
    }}>
      
      {/* TOP STATUS / VOICE ISLAND */}
      {agent ? <MalvinVoiceIsland agent={agent} /> : (
        <div style={{ marginTop: '30px', color: '#666', fontSize: '11px', letterSpacing: '1px', zIndex: 20 }}>
          CONNECTING TO MALVIN...
        </div>
      )}

      {/* CHAT AREA */}
      <div 
        ref={scrollRef}
        style={{
          flex: 1, 
          width: '100%', 
          padding: '20px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          paddingBottom: '180px', // Space for dock
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {chatMessages.map((msg, idx) => {
          const isFromUser = msg.from?.isLocal;
          return (
            <div key={idx} style={{
              alignSelf: isFromUser ? 'flex-end' : 'flex-start',
              backgroundColor: isFromUser ? '#1c1c1e' : '#0a84ff', 
              color: 'white', 
              padding: '12px 16px', 
              borderRadius: isFromUser ? '18px 18px 2px 18px' : '18px 18px 18px 2px', 
              maxWidth: '82%', 
              fontSize: '15px', 
              lineHeight: '1.4',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)', 
              whiteSpace: 'pre-wrap'
            }}>
              <div style={{ fontSize: '9px', opacity: 0.5, marginBottom: '4px', fontWeight: '800', textTransform: 'uppercase' }}>
                {isFromUser ? 'YOU' : 'MALVIN'}
              </div>
              {msg.message}
            </div>
          );
        })}
      </div>

      {/* FLOATING SELF-VIEWS */}
      <div style={{
        position: 'absolute', 
        top: '90px', 
        left: '16px',
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px', 
        zIndex: 15,
        pointerEvents: 'none'
      }}>
        {localScreenTrack && (
          <div style={{ ...videoBoxStyle, width: '200px', aspectRatio: '16/9', pointerEvents: 'auto' }}>
            <VideoTrack trackRef={localScreenTrack as any} />
          </div>
        )}
        {localCameraTrack && (
          <div style={{ 
            ...videoBoxStyle, 
            width: '110px', 
            height: '150px', 
            transform: 'scaleX(-1)',
            pointerEvents: 'auto'
          }}>
            <VideoTrack 
              trackRef={localCameraTrack as any} 
              style={{ objectFit: 'cover', width: '100%', height: '100%' }} 
            />
          </div>
        )}
      </div>

      {/* THE CAPSULE DOCK */}
      <div style={{
        position: 'absolute', 
        bottom: '30px', 
        width: '92%', 
        maxWidth: '480px',
        minHeight: '64px',
        backgroundColor: 'rgba(30, 30, 30, 0.85)', 
        backdropFilter: 'blur(20px)', 
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '32px', 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 12px',
        border: '1px solid rgba(255,255,255,0.1)', 
        boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
        zIndex: 100
      }}>
        {/* DISCONNECT */}
        <button onClick={onDisconnect} style={{...btnStyle, color: '#ff453a', fontSize: '22px'}}>✕</button>
        
        <div style={dividerStyle} />
        
        {/* MIC TOGGLE */}
        <button 
          onClick={() => localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)}
          style={{...btnStyle, color: localParticipant.isMicrophoneEnabled ? '#32d74b' : '#636366'}}
        >
          {localParticipant.isMicrophoneEnabled ? '🎙️' : '🔇'}
        </button>

        {/* INPUT */}
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
            fontSize: '16px',
            fontWeight: '400'
          }} 
        />

        {/* ADAPTIVE ACTION BUTTONS */}
        {textInput.trim().length > 0 ? (
           <button 
             onClick={handleSendMessage} 
             style={{ ...btnStyle, color: '#0a84ff', fontSize: '13px', fontWeight: '700', paddingRight: '15px' }}
           >
             SEND
           </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={() => localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled)} 
              style={{...btnStyle, color: localParticipant.isCameraEnabled ? '#0a84ff' : '#636366'}}
            >
              📷
            </button>
            <button 
              onClick={() => localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled)}
              style={{...btnStyle, color: localParticipant.isScreenShareEnabled ? '#0a84ff' : '#636366'}}
            >
              🖥️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- SHARED CONSTANTS ---
const btnStyle = { 
  background: 'none', 
  border: 'none', 
  cursor: 'pointer', 
  fontSize: '20px', 
  padding: '10px', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center' 
};

const dividerStyle = { 
  width: '1px', 
  height: '24px', 
  backgroundColor: 'rgba(255,255,255,0.1)', 
  margin: '0 8px' 
};

const videoBoxStyle = { 
  borderRadius: '16px', 
  overflow: 'hidden', 
  border: '1px solid rgba(255,255,255,0.1)', 
  backgroundColor: '#111',
  boxShadow: '0 8px 20px rgba(0,0,0,0.4)' 
};

// --- MAIN EXPORT ---
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