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

// --- ICONS (Tight Hitboxes) ---
const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const CameraIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.4 }}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

const ClipIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const MicIcon = ({ enabled }: { enabled: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.4 }}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
  </svg>
);

// --- MALVIN FACE (EMOTIONS) ---
function MalvinFace({ agent, isFrozen, isSleeping, onToggle }: { agent: any, isFrozen: boolean, isSleeping: boolean, onToggle: () => void }) {
  const isSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (isFrozen || isSleeping) return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, [isFrozen, isSleeping]);

  return (
    <div onClick={onToggle} style={{
      width: '110px', height: '42px', backgroundColor: 'rgba(10, 10, 10, 0.9)',
      borderRadius: '21px', border: `1.5px solid ${isFrozen ? neonRed : neonBlue}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      boxShadow: isSpeaking ? `0 0 15px ${neonBlue}55` : `0 0 5px ${neonBlue}22`, transition: 'all 0.3s'
    }}>
      {isSleeping && !isFrozen && <div className="zzz">Zzz</div>}
      <svg width="50" height="20" viewBox="0 0 60 20">
        {isFrozen ? (
          <>
            <path d="M12 5l10 10M22 5l-10 10" stroke="white" strokeWidth="2.5" />
            <path d="M38 5l10 10M48 5l-10 10" stroke="white" strokeWidth="2.5" />
          </>
        ) : (
          <>
            <rect x="12" y={isSleeping || blink ? "9" : (isSpeaking ? "2" : "5")} width="10" height={isSleeping || blink ? "2" : (isSpeaking ? "16" : "10")} rx="1" fill="white" />
            <rect x="38" y={isSleeping || blink ? "9" : (isSpeaking ? "2" : "5")} width="10" height={isSleeping || blink ? "2" : (isSpeaking ? "16" : "10")} rx="1" fill="white" />
          </>
        )}
      </svg>
    </div>
  );
}

function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");
  const [isFrozen, setIsFrozen] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const lastActivity = useRef(Date.now());
  
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const localCameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current > 60000) setIsSleeping(true);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const resetActivity = () => {
    lastActivity.current = Date.now();
    if (isSleeping) setIsSleeping(false);
  };

  const btnReset: CSSProperties = {
    background: 'none', border: 'none', padding: 0, margin: 0, cursor: isFrozen ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px',
    pointerEvents: isFrozen ? 'none' : 'auto', opacity: isFrozen ? 0.3 : 1
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff' }} onMouseMove={resetActivity} onKeyDown={resetActivity}>
      
      {/* BACKGROUND VIDEO */}
      {localParticipant?.isCameraEnabled && localCameraTrack && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <VideoTrack trackRef={localCameraTrack as any} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* TOP BAR (Aligned Gear + AI Face) */}
      <div style={{ position: 'absolute', top: '25px', left: '25px', right: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
        <div style={{ position: 'absolute', left: 0 }}>
          <button style={btnReset}><GearIcon /></button>
        </div>
        <MalvinFace agent={agent} isFrozen={isFrozen} isSleeping={isSleeping} onToggle={() => setIsFrozen(!isFrozen)} />
      </div>

      {/* UNIFIED BOTTOM PILL */}
      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        <div style={{
          width: '90%', maxWidth: '450px', height: '52px', backgroundColor: 'rgba(15,15,15,0.95)',
          borderRadius: '26px', border: `1px solid ${isFrozen ? '#444' : neonBlue}`, display: 'flex', alignItems: 'center', padding: '0 15px',
          boxShadow: `0 0 10px ${neonBlue}15`, transition: 'all 0.3s'
        }}>
          
          <button onClick={onDisconnect} style={{ ...btnReset, width: '30px', height: '30px', borderRadius: '50%', border: `1.5px solid ${neonRed}`, color: neonRed, fontSize: '14px', fontWeight: 'bold', marginRight: '12px', pointerEvents: 'auto', opacity: 1 }}>✕</button>

          <input 
            placeholder={isFrozen ? "Malvin is frozen..." : "just say the word..."} 
            disabled={isFrozen}
            value={textInput} 
            onChange={(e) => setTextInput(e.target.value)} 
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '14px' }} 
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: '10px' }}>
            <button style={btnReset}><ClipIcon /></button>
            <button onClick={() => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} style={btnReset}><CameraIcon enabled={!!localParticipant?.isCameraEnabled} /></button>
            <button onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} style={btnReset}><MicIcon enabled={!!localParticipant?.isMicrophoneEnabled} /></button>
          </div>
        </div>
      </div>

      <style>{`
        .zzz { position: absolute; top: -20px; right: 10px; color: ${neonBlue}; animation: zzzAnim 3s infinite; font-size: 12px; font-weight: bold; pointer-events: none; }
        @keyframes zzzAnim { 0% { opacity:0; transform: translateY(0); } 50% { opacity:1; } 100% { opacity:0; transform: translateY(-20px) translateX(10px); } }
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