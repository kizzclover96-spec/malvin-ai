import { useState, useEffect, useRef } from 'react';
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
  useTranscription, // Added for real-time speech-to-text
} from '@livekit/components-react';

interface SessionProps {
  token: string;
  serverUrl: string;
  onDisconnect: () => void;
}

// --- 1. SUBTITLE OVERLAY ---
function SubtitleOverlay({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'absolute',
      bottom: '25%', // Moved slightly lower than dead center to not block Malvin
      left: '50%',
      transform: 'translateX(-50%)',
      width: '85%',
      textAlign: 'center',
      zIndex: 100,
      pointerEvents: 'none',
    }}>
      <span style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: '500',
        lineHeight: '1.4',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.15)',
        display: 'inline-block',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        animation: 'subtitle-appear 0.2s ease-out'
      }}>
        {message}
      </span>
      <style>{`
        @keyframes subtitle-appear {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// --- 2. MALVIN BOX EYES ISLAND ---
function MalvinVoiceIsland({ agent, isSleeping, isConfused }: { agent: any, isSleeping: boolean, isConfused: boolean }) {
  const isAgentSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const prevSleeping = useRef(isSleeping);

  useEffect(() => {
    if (prevSleeping.current === true && isSleeping === false) {
      setIsWaking(true);
      setTimeout(() => setIsWaking(false), 600);
    }
    prevSleeping.current = isSleeping;
  }, [isSleeping]);

  useEffect(() => {
    if (isSleeping) return;
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, [isSleeping]);

  return (
    <div style={{
      width: '140px', height: '54px',
      backgroundColor: 'rgba(20, 20, 20, 0.85)',
      backdropFilter: 'blur(10px)',
      borderRadius: '27px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid rgba(255,255,255,0.15)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isWaking ? 'scale(1.2)' : (isAgentSpeaking ? 'scale(1.1)' : 'scale(1)'),
      boxShadow: isAgentSpeaking ? '0 0 25px rgba(10, 132, 255, 0.4)' : '0 4px 15px rgba(0,0,0,0.5)',
      position: 'relative'
    }}>
      {isConfused && !isAgentSpeaking && !isSleeping && (
        <div style={{ position: 'absolute', right: '-15px', top: '-5px', color: '#ffcc00', fontSize: '20px', fontWeight: 'bold' }}>?</div>
      )}
      {isSleeping && (
        <div style={{ position: 'absolute', top: '-15px', right: '5px' }}>
          <div className="zzz" style={{ animationDelay: '0s' }}>z</div>
          <div className="zzz" style={{ animationDelay: '1s' }}>z</div>
        </div>
      )}
      <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
        <rect x="12" y={isSleeping || blink ? "9" : (isConfused ? "4" : (isAgentSpeaking ? "2" : "5"))} width="10" height={isSleeping || blink ? "2" : (isConfused ? "12" : (isAgentSpeaking ? "16" : "10"))} rx="1" fill="white" style={{ transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)', opacity: isSleeping ? 0.3 : 1, transform: isWaking ? 'scale(1.4)' : (isConfused ? 'rotate(-10deg)' : 'none'), transformOrigin: 'center' }} />
        <rect x="38" y={isSleeping || blink ? "9" : (isConfused ? "2" : (isAgentSpeaking ? "2" : "5"))} width="10" height={isSleeping || blink ? "2" : (isConfused ? "12" : (isAgentSpeaking ? "16" : "10"))} rx="1" fill="white" style={{ transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)', opacity: isSleeping ? 0.3 : 1, transform: isWaking ? 'scale(1.4)' : (isConfused ? 'rotate(10deg)' : 'none'), transformOrigin: 'center' }} />
      </svg>
      {isAgentSpeaking && <div style={pulseStyle} />}
      <style>{` 
        @keyframes malvin-pulse { 0% { opacity: 0.3; transform: scaleX(0.8); } 50% { opacity: 1; transform: scaleX(1.3); } 100% { opacity: 0.3; transform: scaleX(0.8); } } 
        @keyframes zzz-float { 0% { opacity: 0; transform: translateY(0); } 50% { opacity: 1; } 100% { opacity: 0; transform: translateY(-20px) translateX(10px); } }
        .zzz { position: absolute; animation: zzz-float 3s infinite; color: #0a84ff; font-weight: bold; font-size: 14px; pointer-events: none; }
      `}</style>
    </div>
  );
}

// --- 3. MAIN STAGE ---
function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [isBackCamera, setIsBackCamera] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isConfused, setIsConfused] = useState(false);
  
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  const isUserSpeaking = useIsSpeaking(localParticipant);

  // TRANSCRIPTION HOOK: This catches what Malvin is saying out loud
  const transcriptions = useTranscription(agent);
  const [lastTranscript, setLastTranscript] = useState("");

  useEffect(() => {
    if (transcriptions && transcriptions.length > 0) {
      const latest = transcriptions[transcriptions.length - 1];
      setLastTranscript(latest.text);
      resetInactivity();
      
      // Clear transcript after Malvin stops talking for a bit
      const clearTimer = setTimeout(() => setLastTranscript(""), 3000);
      return () => clearTimeout(clearTimer);
    }
  }, [transcriptions]);

  const resetInactivity = () => {
    setIsSleeping(false);
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    sleepTimer.current = setTimeout(() => setIsSleeping(true), 60000);
  };

  useEffect(() => {
    if (isUserSpeaking || (agent && agent.isSpeaking)) {
      resetInactivity();
    }
  }, [isUserSpeaking, agent?.isSpeaking]);

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const localCameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);

  const toggleCameraFacing = async () => {
    if (!localParticipant) return;
    const mode: 'user' | 'environment' = isBackCamera ? 'user' : 'environment';
    await localParticipant.setCameraEnabled(false);
    await new Promise(r => setTimeout(r, 150));
    await localParticipant.setCameraEnabled(true, { facingMode: mode });
    setIsBackCamera(!isBackCamera);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden' }}>
      
      {localParticipant?.isCameraEnabled && localCameraTrack && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, transform: isBackCamera ? 'none' : 'scaleX(-1)' }}>
          <VideoTrack trackRef={localCameraTrack as any} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button onClick={() => localParticipant.setCameraEnabled(false)} style={cameraCloseBtnStyle}>✕</button>
        </div>
      )}

      {/* CENTER TRANSCRIPTION OVERLAY */}
      <SubtitleOverlay message={lastTranscript} />

      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        
        {/* TOP BAR */}
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '20px', pointerEvents: 'auto' }}>
            <button onClick={() => setIsNotepadOpen(!isNotepadOpen)} style={noteBtnStyle(isNotepadOpen)}>
              {isNotepadOpen ? '📖' : '📁'}
            </button>
            {isNotepadOpen && (
              <div style={notepadBoxStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '10px', color: '#999' }}>NOTES</strong>
                  <button onClick={() => setNotes([])} style={clearBtnStyle}>CLEAR</button>
                </div>
                {notes.map((n, i) => <li key={i} style={noteItemStyle}>{n}</li>)}
              </div>
            )}
          </div>
          
          <div style={{ pointerEvents: 'auto' }}>
            {agent ? <MalvinVoiceIsland agent={agent} isSleeping={isSleeping} isConfused={isConfused} /> : <div style={connectingStyle}>CONNECTING...</div>}
          </div>
        </div>

        {/* SPACER */}
        <div style={{ flex: 1 }} />

        {/* BOTTOM CONTROLS */}
        <div style={bottomControlsWrapper}>
          <div style={pillContainerStyle}>
            <button onClick={onDisconnect} style={{...btnStyle, color: '#ff453a'}}>✕</button>
            <div style={dividerStyle} />
            <button onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} style={{...btnStyle, color: localParticipant?.isMicrophoneEnabled ? '#32d74b' : '#636366'}}>
              {localParticipant?.isMicrophoneEnabled ? '🎙️' : '🔇'}
            </button>
            <input placeholder="Talk to Malvin..." disabled style={inputStyle} />
            <button 
              onMouseDown={() => { timerRef.current = setTimeout(toggleCameraFacing, 800); }} 
              onMouseUp={() => timerRef.current && clearTimeout(timerRef.current)}
              onClick={() => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} 
              style={{...btnStyle, color: localParticipant?.isCameraEnabled ? '#0a84ff' : '#636366'}}
            >📷</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- STYLES ---
const cameraCloseBtnStyle: React.CSSProperties = { position: 'absolute', bottom: '110px', right: '30px', width: '44px', height: '44px', borderRadius: '22px', backgroundColor: 'rgba(255, 69, 58, 0.8)', color: 'white', border: 'none', fontSize: '18px', cursor: 'pointer', backdropFilter: 'blur(5px)', zIndex: 100, pointerEvents: 'auto' };
const pulseStyle: React.CSSProperties = { position: 'absolute', bottom: '8px', width: '24px', height: '2px', background: '#0a84ff', borderRadius: '2px', animation: 'malvin-pulse 1.5s infinite' };
const noteBtnStyle = (isOpen: boolean) => ({ background: isOpen ? '#0a84ff' : 'rgba(30, 30, 30, 0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', padding: '10px', cursor: 'pointer', backdropFilter: 'blur(10px)' });
const notepadBoxStyle: React.CSSProperties = { position: 'absolute', top: '55px', left: 0, width: '220px', maxHeight: '250px', backgroundColor: '#fffbe6', color: '#333', borderRadius: '12px', padding: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflowY: 'auto', pointerEvents: 'auto' };
const inputStyle: React.CSSProperties = { flex: 1, backgroundColor: 'transparent', border: 'none', color: '#999', outline: 'none', padding: '0 10px', fontSize: '15px' };
const pillContainerStyle: React.CSSProperties = { pointerEvents: 'auto', width: '92%', maxWidth: '450px', minHeight: '60px', backgroundColor: 'rgba(30, 30, 30, 0.75)', backdropFilter: 'blur(20px)', borderRadius: '30px', display: 'flex', alignItems: 'center', padding: '0 10px', border: '1px solid rgba(255,255,255,0.1)' };
const bottomControlsWrapper: React.CSSProperties = { paddingBottom: '30px', display: 'flex', justifyContent: 'center' };
const btnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '10px', display: 'flex', alignItems: 'center' };
const dividerStyle = { width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 5px' };
const clearBtnStyle: React.CSSProperties = { border: 'none', background: 'none', fontSize: '10px', color: '#cc0000', cursor: 'pointer' };
const noteItemStyle = { marginBottom: '5px', fontSize: '12px' };
const connectingStyle = { color: '#666', fontSize: '11px' };

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