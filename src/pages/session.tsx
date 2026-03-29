import { useState, useEffect, useRef, CSSProperties } from 'react';
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

// --- 1. NEON STYLES & SVGS ---

const neonBlue = "#00d2ff";

const GearIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const CameraIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={enabled ? neonBlue : "#666"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

const MicIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={enabled ? neonBlue : "#ff453a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1v10M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
    <rect x="9" y="1" width="6" height="12" rx="3" />
  </svg>
);

// --- 2. DYNAMIC STYLES ---

const sideMenuStyle = (isOpen: boolean): CSSProperties => ({
  position: 'absolute', top: 0, left: isOpen ? 0 : '-100%', width: '60%', height: '100%',
  backgroundColor: 'rgba(10, 10, 10, 0.95)', backdropFilter: 'blur(25px)', zIndex: 1000,
  transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)', borderRight: `1px solid ${neonBlue}44`,
  display: 'flex', flexDirection: 'column', padding: '40px 20px', pointerEvents: 'auto'
});

const whatsappPillStyle: CSSProperties = {
  flex: 1, backgroundColor: 'rgba(30, 30, 30, 0.8)', backdropFilter: 'blur(20px)',
  borderRadius: '30px', display: 'flex', alignItems: 'center', padding: '0 15px',
  border: `1px solid ${neonBlue}66`, boxShadow: `0 0 15px ${neonBlue}22`
};

const floatingMicBtn: CSSProperties = {
  width: '56px', height: '56px', borderRadius: '28px', backgroundColor: 'rgba(30,30,30,0.9)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${neonBlue}66`,
  marginLeft: '10px', cursor: 'pointer', pointerEvents: 'auto', boxShadow: `0 4px 15px ${neonBlue}33`
};

// --- 3. COMPONENTS ---

function MalvinVoiceIsland({ agent }: { agent: any }) {
  const isAgentSpeaking = useIsSpeaking(agent);
  return (
    <div style={{
      width: '100px', height: '40px', backgroundColor: 'rgba(0,0,0,0.8)',
      borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1.5px solid ${neonBlue}`, transition: 'all 0.3s ease',
      boxShadow: isAgentSpeaking ? `0 0 20px ${neonBlue}88` : `0 0 10px ${neonBlue}33`,
    }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            width: '3px', height: isAgentSpeaking ? '15px' : '6px', backgroundColor: '#fff',
            borderRadius: '2px', animation: isAgentSpeaking ? `malvin-pulse 0.8s infinite ease-in-out ${i * 0.2}s` : 'none'
          }} />
        ))}
      </div>
    </div>
  );
}

function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [localMessages, setLocalMessages] = useState<{message: string, isLocal: boolean}[]>([]);
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const localCameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);

  const handleSendMessage = async () => {
    if (textInput.trim() && localParticipant) {
      const data = new TextEncoder().encode(textInput);
      await localParticipant.publishData(data, { reliable: true, topic: "user_input" });
      setLocalMessages(prev => [...prev, { message: textInput, isLocal: true }]);
      setTextInput("");
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* SIDE MENU */}
      <div style={sideMenuStyle(isMenuOpen)}>
         <button onClick={() => setIsMenuOpen(false)} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: neonBlue, fontSize: '24px' }}>✕</button>
         <h3 style={{ color: neonBlue, letterSpacing: '2px' }}>SETTINGS</h3>
         <p style={{ color: '#666', fontSize: '12px' }}>Profile & Memory isolation active.</p>
      </div>

      {localParticipant?.isCameraEnabled && localCameraTrack && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <VideoTrack trackRef={localCameraTrack as any} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* GEAR (TOP LEFT) */}
      <div style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 100, pointerEvents: 'auto' }}>
        <button onClick={() => setIsMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><GearIcon /></button>
      </div>

      {/* CHAT OVERLAY */}
      <div style={{ position: 'absolute', inset: 0, padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', pointerEvents: 'none' }}>
        {localMessages.slice(-3).map((msg, i) => (
          <div key={i} style={{ textAlign: msg.isLocal ? 'right' : 'left', margin: '8px 0' }}>
            <span style={{ padding: '10px 16px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: `1px solid ${neonBlue}22` }}>{msg.message}</span>
          </div>
        ))}
      </div>

      {/* TOP CENTER MALVIN FACE */}
      <div style={{ position: 'absolute', top: '25px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        {agent && <MalvinVoiceIsland agent={agent} />}
      </div>

      {/* BOTTOM CONTROLS (WhatsApp Style) */}
      <div style={{ position: 'absolute', bottom: '30px', left: '0', right: '0', padding: '0 20px', display: 'flex', alignItems: 'center', zIndex: 100 }}>
        <div style={whatsappPillStyle}>
          {/* LOGOUT (Left) */}
          <button onClick={onDisconnect} style={{ background: 'none', border: 'none', color: '#ff453a', padding: '10px', fontSize: '18px', cursor: 'pointer' }}>✕</button>
          
          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 10px' }} />
          
          <input 
            placeholder="Message Malvin..." 
            value={textInput} 
            onChange={(e) => setTextInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '16px' }} 
          />

          {/* CAMERA (Inside Pill) */}
          <button onClick={() => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} style={{ background: 'none', border: 'none', padding: '10px', cursor: 'pointer' }}>
            <CameraIcon enabled={!!localParticipant?.isCameraEnabled} />
          </button>

          {/* SEND (Inside Pill) */}
          {textInput.trim() && (
             <button onClick={handleSendMessage} style={{ color: neonBlue, background: 'none', border: 'none', fontSize: '20px', paddingLeft: '10px', cursor: 'pointer' }}>↑</button>
          )}
        </div>

        {/* MIC (Outside Pill) */}
        <button 
          onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} 
          style={floatingMicBtn}
        >
          <MicIcon enabled={!!localParticipant?.isMicrophoneEnabled} />
        </button>
      </div>

      <style>{`
        @keyframes malvin-pulse {
          0%, 100% { transform: scaleY(1); opacity: 0.5; }
          50% { transform: scaleY(2); opacity: 1; }
        }
      `}</style>
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