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
  useLocalParticipant,
} from '@livekit/components-react';

interface SessionProps {
  token: string;
  serverUrl: string;
  onDisconnect: () => void;
}

const neonBlue = "#00d2ff";
const neonRed = "#ff3b30";

/* ---------------- ICONS (Zero Padding / Tight Hitbox) ---------------- */

const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const CameraIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.4 }}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

const ClipIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const MicIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.4 }}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
  </svg>
);

/* ---------------- AI FACE (EMOTIONS) ---------------- */

function MalvinVoiceIsland({ agent, disabled, onToggleDisable, activitySignal }: any) {
  const isAgentSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);
  const [sleeping, setSleeping] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!sleeping && !disabled) {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [sleeping, disabled]);

  useEffect(() => {
    setSleeping(false);
    const timer = setTimeout(() => setSleeping(true), 60000);
    return () => clearTimeout(timer);
  }, [activitySignal]);

  return (
    <div onClick={onToggleDisable} style={{
      width: '110px', height: '42px', backgroundColor: 'rgba(10,10,10,0.9)',
      borderRadius: '21px', border: `1.5px solid ${disabled ? neonRed : neonBlue}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative'
    }}>
      {sleeping && !disabled && (
        <div style={{ position: 'absolute', top: -15, color: neonBlue, fontSize: '10px', fontWeight: 'bold' }}>Zzz...</div>
      )}
      {disabled ? (
        <div style={{ display: 'flex', gap: '8px', color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
          <span>X</span><span>X</span>
        </div>
      ) : (
        <svg width="45" height="18" viewBox="0 0 60 20">
          <rect x="12" y={sleeping || blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={sleeping || blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
          <rect x="38" y={sleeping || blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={sleeping || blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
        </svg>
      )}
    </div>
  );
}

/* ---------------- MAIN STAGE ---------------- */

function VideoStage({ onDisconnect }: any) {
  const [textInput, setTextInput] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [activitySignal, setActivitySignal] = useState(0);

  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const cameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);

  const triggerActivity = () => setActivitySignal(prev => prev + 1);

  const btnReset: CSSProperties = {
    background: 'none', border: 'none', padding: 0, margin: 0,
    width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.3 : 1,
    pointerEvents: disabled ? 'none' : 'auto'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', color: '#fff' }} onMouseMove={triggerActivity} onClick={triggerActivity}>
      
      {/* BACKGROUND VIDEO */}
      {localParticipant?.isCameraEnabled && cameraTrack && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <VideoTrack trackRef={cameraTrack as any} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* TOP ALIGNMENT (Gear and Face on same horizontal line) */}
      <div style={{ position: 'absolute', top: 25, left: 25, right: 25, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
        <div style={{ position: 'absolute', left: 0 }}>
          <button style={btnReset} disabled={disabled}><GearIcon /></button>
        </div>
        <MalvinVoiceIsland
          agent={agent}
          disabled={disabled}
          activitySignal={activitySignal}
          onToggleDisable={() => setDisabled(p => !p)}
        />
      </div>

      {/* BOTTOM UNIFIED PILL */}
      <div style={{ position: 'absolute', bottom: 30, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <div style={{
          width: '90%', maxWidth: 450, height: '52px', background: 'rgba(15,15,15,0.95)',
          borderRadius: 26, border: `1px solid ${disabled ? '#444' : neonBlue}`,
          display: 'flex', alignItems: 'center', padding: '0 15px',
          boxShadow: disabled ? 'none' : `0 0 10px ${neonBlue}22`
        }}>
          
          <button onClick={onDisconnect} style={{ ...btnReset, width: '30px', height: '30px', borderRadius: '50%', border: `1.5px solid ${neonRed}`, color: neonRed, fontSize: '14px', marginRight: '10px', pointerEvents: 'auto', opacity: 1 }}>✕</button>

          <input
            placeholder={disabled ? "Frozen..." : "just say the word..."}
            value={textInput}
            disabled={disabled}
            onChange={(e) => { setTextInput(e.target.value); triggerActivity(); }}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '14px' }}
          />

          <div style={{ display: 'flex', gap: '14px', marginLeft: '10px' }}>
            <button style={btnReset}><ClipIcon /></button>
            <button style={btnReset} onClick={() => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)}>
              <CameraIcon enabled={!!localParticipant?.isCameraEnabled} />
            </button>
            <button style={btnReset} onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)}>
              <MicIcon enabled={!!localParticipant?.isMicrophoneEnabled} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- ROOT ---------------- */

export default function Session({ token, serverUrl, onDisconnect }: SessionProps) {
  return (
    <LiveKitRoom 
      token={token} 
      serverUrl={serverUrl} 
      connect={true} 
      audio={true} 
      video={false} // Match your working code
      onDisconnected={onDisconnect}
    >
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}