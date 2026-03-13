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

function MalvinVoiceIsland({ agent }: { agent: any }) {
  const isAgentSpeaking = useIsSpeaking(agent);

  return (
    <div style={{
      marginTop: '20px',
      minWidth: '200px', 
      height: '60px',
      backgroundColor: '#111',
      borderRadius: '30px',
      display: 'flex', // Fixed: was Display: 'Flex'
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 25px',
      border: '1px solid #222',
      transition: 'all 0.4s ease',
      opacity: isAgentSpeaking ? 1 : 0.4,
      transform: isAgentSpeaking ? 'scale(1.05)' : 'scale(1)',
      boxShadow: isAgentSpeaking ? '0 0 30px rgba(0, 255, 0, 0.15)' : 'none'
    }}>
      <BarVisualizer 
        trackRef={{ 
          participant: agent, // Fixed capitalization
          source: Track.Source.Microphone,
          publication: agent.getTrackPublication(Track.Source.Microphone) // Fixed capitalization
        }} 
        style={{ width: '100px', height: '30px' }}
      />
    </div>
  );
}

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
      position: 'relative', width: '100vw', height: '100vh', 
      backgroundColor: '#000', color: 'white', fontFamily: '"Inter", sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' 
    }}>
      
      {/* 1. TOP ISLAND */}
      {agent ? <MalvinVoiceIsland agent={agent} /> : (
        <div style={{ marginTop: '30px', color: '#444', fontSize: '12px' }}>INITIALIZING MALVIN...</div>
      )}

      {/* 2. CHAT */}
      <div 
        ref={scrollRef}
        style={{
          flex: 1, width: '95%', padding: '20px', overflowY: 'auto', 
          display: 'flex', flexDirection: 'column', gap: '14px', 
          paddingBottom: '120px', scrollbarWidth: 'none'
        }}
      >
        {chatMessages.map((msg, idx) => {
          const isFromUser = msg.from?.isLocal;
          return (
            <div key={idx} style={{
              alignSelf: isFromUser ? 'flex-end' : 'flex-start',
              backgroundColor: isFromUser ? '#1a1a1a' : '#007AFF', 
              color: 'white', padding: '12px 18px', 
              borderRadius: isFromUser ? '20px 20px 2px 20px' : '20px 20px 20px 2px', 
              maxWidth: '80%', fontSize: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', whiteSpace: 'pre-wrap'
            }}>
              <div style={{ fontSize: '10px', opacity: 0.5, marginBottom: '4px', fontWeight: 'bold' }}>
                {isFromUser ? 'YOU' : 'MALVIN'}
              </div>
              {msg.message}
            </div>
          );
        })}
      </div>

      {/* 3. VIDEO WINDOWS (Displays only when active) */}
      <div style={{
        position: 'absolute', bottom: '110px', right: '20px',
        display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 15,
        alignItems: 'flex-end'
      }}>
        {localScreenTrack && (
          <div style={{ ...videoBoxStyle, width: '320px', aspectRatio: '16/9' }}>
            <VideoTrack trackRef={localScreenTrack as any} />
          </div>
        )}
        {localCameraTrack && (
          <div style={{ ...videoBoxStyle, width: '180px', height: '240px' }}>
            <VideoTrack trackRef={localCameraTrack as any} />
          </div>
        )}
      </div>

      {/* 4. DOCK */}
      <div style={{
        position: 'absolute', bottom: '30px', width: '92%', height: '65px',
        backgroundColor: 'rgba(25, 25, 25, 0.85)', backdropFilter: 'blur(20px)', 
        borderRadius: '35px', display: 'flex', alignItems: 'center', padding: '0 15px',
        border: '1px solid rgba(255,255,255,0.08)', zIndex: 10
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
          style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: 'white', outline: 'none', padding: '0 10px', fontSize: '16px' }} 
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

const btnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '8px', color: '#ccc' };
const videoBoxStyle = { borderRadius: '15px', overflow: 'hidden', border: '2px solid #333', backgroundColor: '#111' };

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