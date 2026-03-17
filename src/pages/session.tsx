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

// --- 1. MALVIN VOICE ISLAND ---
function MalvinVoiceIsland({ agent }: { agent: any }) {
  const isAgentSpeaking = useIsSpeaking(agent);

  return (
    <div style={{
      position: 'fixed',
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
      opacity: isAgentSpeaking ? 1 : 0.7,
      transform: isAgentSpeaking ? 'scale(1.05)' : 'scale(1)',
      boxShadow: isAgentSpeaking ? '0 0 25px rgba(50, 215, 75, 0.2)' : 'none',
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (textInput.trim()) {
      send(textInput);
      setTextInput("");
    }
  };

  return (
    <div className="moving-gradient" style={{ 
      position: 'fixed', 
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden', // Prevents whole-page wobble
    }}>
      
      {/* --- FIXED HEADER AREA --- */}
      <div style={{
        paddingTop: 'env(safe-area-inset-top, 20px)',
        paddingBottom: '10px',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 100,
      }}>
        {agent ? <MalvinVoiceIsland agent={agent} /> : (
          <div style={{ marginTop: '10px', color: '#666', fontSize: '11px', letterSpacing: '1px' }}>
            CONNECTING TO MALVIN...
          </div>
        )}
      </div>

      {/* --- SCROLLABLE CHAT AREA --- */}
      <div 
        ref={scrollRef}
        style={{
          flex: 1, // Takes up remaining space
          width: '100%', 
          overflowY: 'auto', 
          padding: '0 20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          paddingBottom: '140px', // Prevents last message from being hidden by Dock
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
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
              maxWidth: '85%', 
              fontSize: '15px', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)', 
              whiteSpace: 'pre-wrap'
            }}>
              <div style={{ fontSize: '9px', opacity: 0.5, marginBottom: '4px', fontWeight: '800' }}>
                {isFromUser ? 'YOU' : 'MALVIN'}
              </div>
              {msg.message}
            </div>
          );
        })}
      </div>

      {/* --- FLOATING CAMERA VIEWS --- */}
      <div style={{
        position: 'absolute', 
        top: '100px', 
        left: '16px',
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px', 
        zIndex: 50,
        pointerEvents: 'none'
      }}>
        {localScreenTrack && (
          <div style={{ ...videoBoxStyle, width: '180px', aspectRatio: '16/9', pointerEvents: 'auto' }}>
            <VideoTrack trackRef={localScreenTrack as any} />
          </div>
        )}
        {localCameraTrack && (
          <div style={{ 
            ...videoBoxStyle, 
            width: '90px', height: '120px', 
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

      {/* --- FIXED BOTTOM DOCK --- */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
        left: '50%',
        transform: 'translateX(-50%)',
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
        <button onClick={onDisconnect} style={{...btnStyle, color: '#ff453a', fontSize: '22px'}}>✕</button>
        <div style={dividerStyle} />
        
        <button 
          onClick={() => localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)}
          style={{...btnStyle, color: localParticipant.isMicrophoneEnabled ? '#32d74b' : '#636366'}}
        >
          {localParticipant.isMicrophoneEnabled ? '🎙️' : '🔇'}
        </button>

        <input 
          placeholder="Message Malvin..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          style={{ 
            flex: 1, backgroundColor: 'transparent', border: 'none', 
            color: 'white', outline: 'none', padding: '0 10px', fontSize: '16px'
          }} 
        />

        {textInput.trim().length > 0 ? (
           <button onClick={handleSendMessage} style={{ ...btnStyle, color: '#0a84ff', fontSize: '13px', fontWeight: '700' }}>
             SEND
           </button>
        ) : (
          <div style={{ display: 'flex' }}>
            <button onClick={() => localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled)} 
                    style={{...btnStyle, color: localParticipant.isCameraEnabled ? '#0a84ff' : '#636366'}}>📷</button>
            <button onClick={() => localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled)}
                    style={{...btnStyle, color: localParticipant.isScreenShareEnabled ? '#0a84ff' : '#636366'}}>🖥️</button>
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const dividerStyle = { width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 8px' };
const videoBoxStyle = { borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#111', boxShadow: '0 8px 20px rgba(0,0,0,0.4)' };

export default function Session({ token, serverUrl, onDisconnect }: SessionProps) {
  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect={true} audio={true} video={true} onDisconnected={onDisconnect}>
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}