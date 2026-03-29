import { useState, useEffect, useRef, CSSProperties } from 'react';
import { ParticipantKind } from 'livekit-client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
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

/* ---------------- ICONS ---------------- */

const GearIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const CameraIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.4 }}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const ClipIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const MicIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.4 }}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
  </svg>
);

/* ---------------- AI FACE ---------------- */

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
      width: '110px',
      height: '42px',
      backgroundColor: 'rgba(10,10,10,0.9)',
      borderRadius: '21px',
      border: `1.5px solid ${neonBlue}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }}>
      {sleeping ? (
        <div style={{ color: "#aaa", fontSize: "12px" }}>- - zzz</div>
      ) : disabled ? (
        <div style={{ color: "white" }}>X X</div>
      ) : (
        <svg width="45" height="18" viewBox="0 0 60 20">
          <rect x="12" y={blink ? "9" : "5"} width="10" height={blink ? "2" : "10"} rx="1" fill="white" />
          <rect x="38" y={blink ? "9" : "5"} width="10" height={blink ? "2" : "10"} rx="1" fill="white" />
        </svg>
      )}
    </div>
  );
}

/* ---------------- MAIN ---------------- */

function VideoStage({ onDisconnect }: any) {
  const [textInput, setTextInput] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [activitySignal, setActivitySignal] = useState(0);

  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerActivity = () => setActivitySignal(prev => prev + 1);

  const btn: CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', color: '#fff' }}>

      {/* TOP */}
      <div style={{ position: 'absolute', top: 20, left: 20, right: 20 }}>
        <button style={{ ...btn, transform: 'scale(0.85)' }} disabled={disabled}>
          <GearIcon />
        </button>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {agent && (
            <MalvinVoiceIsland
              agent={agent}
              disabled={disabled}
              activitySignal={activitySignal}
              onToggleDisable={() => setDisabled(p => !p)}
            />
          )}
        </div>
      </div>

      {/* BOTTOM */}
      <div style={{ position: 'absolute', bottom: 30, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '90%',
          maxWidth: 450,
          height: 52,
          background: '#111',
          borderRadius: 26,
          display: 'flex',
          alignItems: 'center',
          padding: '0 15px'
        }}>
          <button onClick={onDisconnect} disabled={disabled}>✕</button>

          <input
            value={textInput}
            disabled={disabled}
            onChange={(e) => { setTextInput(e.target.value); triggerActivity(); }}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff' }}
          />

          <button disabled={disabled}><ClipIcon /></button>
          <button disabled={disabled}><CameraIcon enabled /></button>
          <button disabled={disabled}><MicIcon enabled /></button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- ROOT ---------------- */

export default function Session({ token, serverUrl, onDisconnect }: SessionProps) {
  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect audio video={false} onDisconnected={onDisconnect}>
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}