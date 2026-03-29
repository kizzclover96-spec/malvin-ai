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
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06..." />
  </svg>
);

const CameraIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} style={{ opacity: enabled ? 1 : 0.4 }}>
    <path d="M23 19..." />
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const ClipIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue}>
    <path d="M21.44 11.05..." />
  </svg>
);

const MicIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} style={{ opacity: enabled ? 1 : 0.4 }}>
    <path d="M12 1..." />
  </svg>
);

/* ---------------- AI FACE ---------------- */

function MalvinVoiceIsland({
  agent,
  disabled,
  onToggleDisable,
  activitySignal
}: {
  agent: any;
  disabled: boolean;
  onToggleDisable: () => void;
  activitySignal: number;
}) {
  const isAgentSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);
  const [sleeping, setSleeping] = useState(false);

  // Blink
  useEffect(() => {
    const interval = setInterval(() => {
      if (!sleeping && !disabled) {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [sleeping, disabled]);

  // Sleep logic (reset on activity)
  useEffect(() => {
    setSleeping(false);
    const timer = setTimeout(() => setSleeping(true), 60000);
    return () => clearTimeout(timer);
  }, [activitySignal]);

  return (
    <div
      onClick={onToggleDisable}
      style={{
        width: '110px',
        height: '42px',
        backgroundColor: 'rgba(10,10,10,0.9)',
        borderRadius: '21px',
        border: `1.5px solid ${neonBlue}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: isAgentSpeaking ? `0 0 15px ${neonBlue}55` : `0 0 5px ${neonBlue}22`,
      }}
    >
      {sleeping ? (
        <div style={{ color: "#aaa", fontSize: "12px" }}>- - zzz</div>
      ) : disabled ? (
        <div style={{ color: "white", fontSize: "14px" }}>X&nbsp;&nbsp;X</div>
      ) : (
        <svg width="45" height="18" viewBox="0 0 60 20">
          <rect x="12" y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
          <rect x="38" y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
        </svg>
      )}
    </div>
  );
}

/* ---------------- MAIN UI ---------------- */

function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [activitySignal, setActivitySignal] = useState(0);

  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerActivity = () => setActivitySignal(prev => prev + 1);

  const handleSendMessage = async () => {
    if (textInput.trim() && localParticipant && !disabled) {
      triggerActivity();
      const data = new TextEncoder().encode(textInput);
      await localParticipant.publishData(data, { reliable: true, topic: "user_input" });
      setTextInput("");
    }
  };

  const btnReset: CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', color: '#fff' }}>

      {/* TOP BAR */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <button style={{ ...btnReset, transform: 'scale(0.85)' }} disabled={disabled}>
          <GearIcon />
        </button>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {agent && (
            <MalvinVoiceIsland
              agent={agent}
              disabled={disabled}
              activitySignal={activitySignal}
              onToggleDisable={() => setDisabled(prev => !prev)}
            />
          )}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '90%',
          maxWidth: '450px',
          height: '52px',
          background: 'rgba(15,15,15,0.95)',
          borderRadius: '26px',
          border: `1px solid ${neonBlue}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 15px'
        }}>

          <button onClick={onDisconnect} disabled={disabled} style={{
            ...btnReset,
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            border: `1.5px solid ${neonRed}`,
            color: neonRed
          }}>✕</button>

          <input
            value={textInput}
            disabled={disabled}
            onChange={(e) => {
              triggerActivity();
              setTextInput(e.target.value);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff' }}
          />

          <div style={{ display: 'flex', gap: '14px' }}>
            <button disabled={disabled} onClick={() => fileInputRef.current?.click()} style={btnReset}><ClipIcon /></button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} />

            <button disabled={disabled} onClick={() => {
              triggerActivity();
              localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled);
            }} style={btnReset}>
              <CameraIcon enabled={!!localParticipant?.isCameraEnabled} />
            </button>

            <button disabled={disabled} onClick={() => {
              triggerActivity();
              localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
            }} style={btnReset}>
              <MicIcon enabled={!!localParticipant?.isMicrophoneEnabled} />
            </button>

            {textInput.trim() && (
              <button disabled={disabled} onClick={handleSendMessage} style={{ ...btnReset, color: neonBlue }}>↑</button>
            )}
          </div>
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