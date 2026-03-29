import { useState, useEffect, useRef, CSSProperties } from 'react';
import { ParticipantKind, Track } from 'livekit-client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRemoteParticipant,
  useIsSpeaking,
  LayoutContextProvider,
  useLocalParticipant,
} from '@livekit/components-react';

const neonBlue = "#00d2ff";
const neonRed = "#ff3b30";

// --- ICONS ---
const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

// --- MALVIN FACE WITH EMOTIONS ---
function MalvinFace({ agent, isFrozen, onToggleFreeze, isSleeping }: { agent: any, isFrozen: boolean, onToggleFreeze: () => void, isSleeping: boolean }) {
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
    <div 
      onClick={onToggleFreeze}
      style={{
        width: '110px', height: '42px', backgroundColor: 'rgba(10,10,10,0.9)',
        borderRadius: '21px', border: `1.5px solid ${isFrozen ? neonRed : neonBlue}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        boxShadow: isSpeaking ? `0 0 15px ${neonBlue}55` : 'none', position: 'relative'
      }}
    >
      {isSleeping && !isFrozen && (
        <div className="zzz-container" style={{ position: 'absolute', top: '-20px', right: '10px', color: neonBlue, fontSize: '12px' }}>
          <span>z</span><span>z</span><span>z</span>
        </div>
      )}
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

  // Activity Monitor
  useEffect(() => {
    const checkActivity = setInterval(() => {
      if (Date.now() - lastActivity.current > 60000) setIsSleeping(true);
    }, 5000);
    return () => clearInterval(checkActivity);
  }, []);

  const resetActivity = () => {
    lastActivity.current = Date.now();
    if (isSleeping) setIsSleeping(false);
  };

  const btnReset: CSSProperties = {
    background: 'none', border: 'none', padding: 0, cursor: isFrozen ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px',
    opacity: isFrozen ? 0.3 : 1, pointerEvents: isFrozen ? 'none' : 'auto'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden' }} onMouseMove={resetActivity} onKeyDown={resetActivity}>
      
      {/* TOP BAR: Gear & Face Aligned */}
      <div style={{ position: 'absolute', top: '25px', left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', px: '25px' }}>
        <div style={{ position: 'absolute', left: '25px' }}>
          <button style={btnReset}><GearIcon /></button>
        </div>
        <MalvinFace 
          agent={agent} 
          isFrozen={isFrozen} 
          isSleeping={isSleeping}
          onToggleFreeze={() => setIsFrozen(!isFrozen)} 
        />
      </div>

      {/* UNIFIED BOTTOM PILL */}
      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '90%', maxWidth: '450px', height: '52px', backgroundColor: 'rgba(15,15,15,0.95)',
          borderRadius: '26px', border: `1px solid ${isFrozen ? '#333' : neonBlue}`, 
          display: 'flex', alignItems: 'center', padding: '0 15px',
          transition: 'all 0.3s ease', filter: isFrozen ? 'grayscale(1)' : 'none'
        }}>
          
          <button onClick={onDisconnect} style={{ ...btnReset, width: '30px', height: '30px', borderRadius: '50%', border: `1.5px solid ${neonRed}`, color: neonRed, fontSize: '14px', fontWeight: 'bold', marginRight: '12px' }}>✕</button>

          <input 
            placeholder={isFrozen ? "System Frozen..." : "just say the word..."} 
            disabled={isFrozen}
            value={textInput} 
            onChange={(e) => setTextInput(e.target.value)} 
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '14px' }} 
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: '10px' }}>
             {/* Simplified Icons for brevity in this snippet */}
             <div style={btnReset}><span style={{color: neonBlue}}>📎</span></div>
             <div style={btnReset}><span style={{color: neonBlue}}>📷</span></div>
             <div style={btnReset}><span style={{color: neonBlue}}>🎙️</span></div>
          </div>
        </div>
      </div>

      <style>{`
        .zzz-container span { animation: zzz-fade 3s infinite; opacity: 0; position: absolute; }
        .zzz-container span:nth-child(1) { animation-delay: 0s; transform: translate(0, 0); }
        .zzz-container span:nth-child(2) { animation-delay: 1s; transform: translate(5px, -10px); }
        .zzz-container span:nth-child(3) { animation-delay: 2s; transform: translate(10px, -20px); }
        @keyframes zzz-fade {
          0% { opacity: 0; transform: translateY(0) scale(0.8); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-20px) scale(1.2); }
        }
      `}</style>
    </div>
  );
}

export default function Session({ token, serverUrl, onDisconnect }: { token: string, serverUrl: string, onDisconnect: () => void }) {
  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect={true} audio={true}>
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}