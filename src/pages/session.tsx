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

// --- NEON ICONS ---
const GearIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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

// 🔥 UPDATED AI FACE
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
    <div
      onClick={onToggleDisable}
      style={{
        width: '110px',
        height: '42px',
        backgroundColor: 'rgba(10, 10, 10, 0.9)',
        borderRadius: '21px',
        border: `1.5px solid ${neonBlue}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: disabled
          ? `0 0 12px ${neonRed}55`
          : isAgentSpeaking
          ? `0 0 15px ${neonBlue}55`
          : `0 0 5px ${neonBlue}22`,
      }}
    >
      {disabled ? (
        <svg width="45" height="18" viewBox="0 0 60 20">
          <text x="12" y="14" fill="white" fontSize="10">X</text>
          <text x="38" y="14" fill="white" fontSize="10">X</text>
        </svg>
      ) : sleeping ? (
        <>
          <svg width="45" height="18" viewBox="0 0 60 20">
            <rect x="12" y="9" width="10" height="2" rx="1" fill="white" />
            <rect x="38" y="9" width="10" height="2" rx="1" fill="white" />
          </svg>

          <div style={{
            position: 'absolute',
            right: '-10px',
            top: '-8px',
            color: '#aaa',
            fontSize: '10px',
            animation: 'floatZ 2s infinite ease-in-out'
          }}>
            z
          </div>

          <style>
            {`
              @keyframes floatZ {
                0% { transform: translateY(0); opacity: 0.2; }
                50% { transform: translateY(-6px); opacity: 1; }
                100% { transform: translateY(-12px); opacity: 0; }
              }
            `}
          </style>
        </>
      ) : (
        <svg width="45" height="18" viewBox="0 0 60 20">
          <rect x="12" y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
          <rect x="38" y={blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" />
        </svg>
      )}
    </div>
  );
}

function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");

  const [disabled, setDisabled] = useState(false);
  const [activitySignal, setActivitySignal] = useState(0);
  const triggerActivity = () => setActivitySignal(prev => prev + 1);

  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async () => {
    if (textInput.trim() && localParticipant) {
      const data = new TextEncoder().encode(textInput);
      await localParticipant.publishData(data, { reliable: true, topic: "user_input" });
      setTextInput("");
      triggerActivity();
    }
  };

  const btnReset: CSSProperties = {
    background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '24px', height: '24px'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      <div style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 100 }}>
        <button style={btnReset}><GearIcon /></button>
      </div>

      <div style={{ position: 'absolute', top: '25px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        {agent && (
          <MalvinVoiceIsland
            agent={agent}
            disabled={disabled}
            activitySignal={activitySignal}
            onToggleDisable={() => setDisabled(prev => !prev)}
          />
        )}
      </div>

      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        <div style={{
          width: '90%', maxWidth: '450px', height: '52px',
          backgroundColor: 'rgba(15,15,15,0.95)',
          borderRadius: '26px',
          border: `1px solid ${neonBlue}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 15px',
          boxShadow: `0 0 10px ${neonBlue}15`
        }}>
          
          <button onClick={onDisconnect} style={{
            ...btnReset, width: '30px', height: '30px',
            borderRadius: '50%',
            border: `1.5px solid ${neonRed}`,
            color: neonRed,
            fontSize: '14px',
            fontWeight: 'bold',
            marginRight: '12px'
          }}>✕</button>

          <input 
            placeholder="just say the word..." 
            value={textInput} 
            onChange={(e) => {
              setTextInput(e.target.value);
              triggerActivity();
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '14px' }} 
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: '10px' }}>
            <button onClick={() => { fileInputRef.current?.click(); triggerActivity(); }} style={btnReset}><ClipIcon /></button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
            
            <button onClick={() => {
              localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled);
              triggerActivity();
            }} style={btnReset}>
              <CameraIcon enabled={!!localParticipant?.isCameraEnabled} />
            </button>

            <button onClick={() => {
              localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
              triggerActivity();
            }} style={btnReset}>
              <MicIcon enabled={!!localParticipant?.isMicrophoneEnabled} />
            </button>

            {textInput.trim() && (
              <button onClick={handleSendMessage} style={{ ...btnReset, color: neonBlue, fontWeight: 'bold' }}>↑</button>
            )}
          </div>
        </div>
      </div>
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