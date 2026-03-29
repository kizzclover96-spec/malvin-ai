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

/* ---------------- ICONS ---------------- */
const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

/* ---------------- AI FACE ---------------- */
function MalvinFace({ agent, isDead, isSleeping, onToggle }: any) {
  const isSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (isDead || isSleeping) return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, [isDead, isSleeping]);

  return (
    <div 
      onClick={onToggle}
      className={isDead ? "pulse-red-dead" : ""}
      style={{
        width: '110px', height: '42px', backgroundColor: 'rgba(10,10,10,0.95)',
        borderRadius: '21px', border: `1.5px solid ${isDead ? neonRed : neonBlue}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        position: 'relative', transition: 'all 0.3s ease',
        boxShadow: isSpeaking && !isDead ? `0 0 20px ${neonBlue}66` : 'none'
      }}
    >
      {/* Floating Zzz particles drift from the head */}
      {isSleeping && !isDead && (
        <div className="zzz-container">
          <span className="z1">z</span><span className="z2">z</span><span className="z3">z</span>
        </div>
      )}

      <svg width="50" height="20" viewBox="0 0 60 20">
        {isDead ? (
          <g stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 6l8 8M20 6l-8 8" />
            <path d="M40 6l8 8M48 6l-8 8" />
          </g>
        ) : (
          <g fill="white">
            <rect x="12" y={isSleeping || blink ? "9" : (isSpeaking ? "2" : "5")} width="10" height={isSleeping || blink ? "2" : (isSpeaking ? "16" : "10")} rx="1" />
            <rect x="38" y={isSleeping || blink ? "9" : (isSpeaking ? "2" : "5")} width="10" height={isSleeping || blink ? "2" : (isSpeaking ? "16" : "10")} rx="1" />
          </g>
        )}
      </svg>
    </div>
  );
}

/* ---------------- MAIN STAGE ---------------- */
function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");
  const [isDead, setIsDead] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const lastActivity = useRef(Date.now());

  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const cameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current > 60000 && !isDead) setIsSleeping(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [isDead]);

  const resetActivity = () => {
    lastActivity.current = Date.now();
    if (isSleeping) setIsSleeping(false);
  };

  const btnStyle: CSSProperties = {
    background: 'none', border: 'none', padding: 0,
    cursor: isDead ? 'default' : 'pointer',
    opacity: isDead ? 0.15 : 1,
    pointerEvents: isDead ? 'none' : 'auto',
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px'
  };

  return (
    <div 
      style={{ position: 'fixed', inset: 0, backgroundColor: '#000', overflow: 'hidden' }} 
      onMouseMove={resetActivity}
      onKeyDown={resetActivity}
    >
      {/* Background Camera */}
      {localParticipant?.isCameraEnabled && cameraTrack && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, filter: isDead ? 'grayscale(1) brightness(0.4)' : 'none', transition: 'filter 1s' }}>
          <VideoTrack trackRef={cameraTrack as any} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Top Bar (Aligned Gear & Face) */}
      <div style={{ position: 'absolute', top: 25, left: 25, right: 25, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div style={{ position: 'absolute', left: 0 }}>
          <button style={btnStyle}><GearIcon /></button>
        </div>
        <MalvinFace 
          agent={agent} 
          isDead={isDead} 
          isSleeping={isSleeping} 
          onToggle={() => setIsDead(!isDead)} 
        />
      </div>

      {/* Bottom Control Pill */}
      <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <div style={{
          width: '90%', maxWidth: 450, height: 52, 
          backgroundColor: isDead ? 'rgba(5,5,5,0.9)' : 'rgba(15,15,15,0.95)',
          borderRadius: 26, border: `1px solid ${isDead ? '#333' : neonBlue}`,
          display: 'flex', alignItems: 'center', padding: '0 15px',
          transition: 'all 0.5s ease'
        }}>
          <button onClick={onDisconnect} style={{ ...btnStyle, width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${neonRed}`, color: neonRed, marginRight: 12, opacity: 1, pointerEvents: 'auto' }}>✕</button>
          
          <input 
            placeholder={isDead ? "SYSTEM CRITICAL" : "just say the word..."}
            disabled={isDead}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', color: isDead ? '#444' : '#fff', outline: 'none', fontSize: '14px' }}
          />

          <div style={{ display: 'flex', gap: 14, marginLeft: 10, fontSize: '18px' }}>
             <button style={btnStyle}>📎</button>
             <button style={btnStyle} onClick={() => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)}>📷</button>
             <button style={btnStyle} onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)}>🎙️</button>
          </div>
        </div>
      </div>

      <style>{`
        .pulse-red-dead { animation: red-pulse 2s infinite; }
        @keyframes red-pulse {
          0% { box-shadow: 0 0 0px rgba(255, 59, 48, 0); }
          50% { box-shadow: 0 0 20px rgba(255, 59, 48, 0.6); }
          100% { box-shadow: 0 0 0px rgba(255, 59, 48, 0); }
        }
        .zzz-container { position: absolute; top: -15px; right: 10px; font-family: 'Courier New', monospace; font-weight: bold; }
        .zzz-container span { position: absolute; color: ${neonBlue}; opacity: 0; animation: float-z 3s infinite linear; }
        .z1 { animation-delay: 0s; }
        .z2 { animation-delay: 1s; }
        .z3 { animation-delay: 2s; }
        @keyframes float-z {
          0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translate(20px, -50px) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

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