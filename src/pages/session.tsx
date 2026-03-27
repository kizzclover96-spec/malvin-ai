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
  useTranscription,
} from '@livekit/components-react';

interface SessionProps {
  token: string;
  serverUrl: string;
  onDisconnect: () => void;
}

// --- 1. CONSTANT STYLES (Hoisted for Rollup/Vercel Build Stability) ---
const pulseStyle: CSSProperties = { position: 'absolute', bottom: '8px', width: '24px', height: '2px', background: '#0a84ff', borderRadius: '2px', animation: 'malvin-pulse 1.5s infinite' };
const chatAreaStyle: CSSProperties = { position: 'absolute', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '100px 40px', pointerEvents: 'none', overflowY: 'hidden', background: 'linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.6) 100%)' };
const pillContainerStyle: CSSProperties = { pointerEvents: 'auto', width: '92%', maxWidth: '450px', minHeight: '60px', backgroundColor: 'rgba(30, 30, 30, 0.85)', backdropFilter: 'blur(20px)', borderRadius: '30px', display: 'flex', alignItems: 'center', padding: '0 15px', border: '1px solid rgba(255,255,255,0.1)' };
const inputStyle: CSSProperties = { flex: 1, backgroundColor: 'transparent', border: 'none', color: 'white', outline: 'none', padding: '0 15px', fontSize: '16px' };
const bottomControlsWrapper: CSSProperties = { position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20 };
const noteBtnStyle = (isOpen: boolean): CSSProperties => ({ background: isOpen ? '#0a84ff' : 'rgba(30, 30, 30, 0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', padding: '10px', cursor: 'pointer', backdropFilter: 'blur(10px)', pointerEvents: 'auto' });
const notepadBoxStyle: CSSProperties = { position: 'absolute', top: '55px', left: 0, width: '220px', maxHeight: '250px', backgroundColor: '#fffbe6', color: '#333', borderRadius: '12px', padding: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflowY: 'auto', pointerEvents: 'auto' };

// --- 2. EYE ISLAND COMPONENT ---
function MalvinVoiceIsland({ agent, isSleeping }: { agent: any, isSleeping: boolean }) {
  const isAgentSpeaking = useIsSpeaking(agent);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (isSleeping) return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, [isSleeping]);

  return (
    <div style={{
      width: '140px', height: '54px', backgroundColor: 'rgba(20, 20, 20, 0.85)',
      backdropFilter: 'blur(10px)', borderRadius: '27px', display: 'flex', 
      alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)',
      transition: 'all 0.3s ease', transform: isAgentSpeaking ? 'scale(1.1)' : 'scale(1)',
      position: 'relative'
    }}>
      {isSleeping && <div style={{ position: 'absolute', top: '-12px', right: '10px', color: '#0a84ff', fontWeight: 'bold', fontSize: '12px' }}>zzz</div>}
      <svg width="60" height="20" viewBox="0 0 60 20">
        <rect x="12" y={isSleeping || blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={isSleeping || blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" style={{ transition: 'all 0.1s ease', opacity: isSleeping ? 0.3 : 1 }} />
        <rect x="38" y={isSleeping || blink ? "9" : (isAgentSpeaking ? "2" : "5")} width="10" height={isSleeping || blink ? "2" : (isAgentSpeaking ? "16" : "10")} rx="1" fill="white" style={{ transition: 'all 0.1s ease', opacity: isSleeping ? 0.3 : 1 }} />
      </svg>
      {isAgentSpeaking && <div style={pulseStyle} />}
      <style>{`@keyframes malvin-pulse { 0% { opacity: 0.3; transform: scaleX(0.8); } 50% { opacity: 1; transform: scaleX(1.3); } 100% { opacity: 0.3; transform: scaleX(0.8); } }`}</style>
    </div>
  );
}

// --- 3. MAIN VIDEO STAGE ---
function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [textInput, setTextInput] = useState("");
  const [localMessages, setLocalMessages] = useState<{message: string, isLocal: boolean}[]>([]);
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [isBackCamera, setIsBackCamera] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const sleepTimer = useRef<any>(null);

  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const { localParticipant } = useLocalParticipant();
  const { chatMessages = [], send } = useChat();

  // VOICE TRANSCRIPTIONS
  const agentTranscriptions = useTranscription(agent);
  const userTranscriptions = useTranscription(localParticipant);

  // Capture Agent Voice
  useEffect(() => {
    const latest = agentTranscriptions[agentTranscriptions.length - 1];
    if (latest?.text && latest.isFinal) {
      setLocalMessages(prev => [...prev.slice(-12), { message: latest.text, isLocal: false }]);
      resetSleepTimer();
    }
  }, [agentTranscriptions]);

  // Capture User Voice
  useEffect(() => {
    const latest = userTranscriptions[userTranscriptions.length - 1];
    if (latest?.text && latest.isFinal) {
      setLocalMessages(prev => [...prev.slice(-12), { message: latest.text, isLocal: true }]);
      resetSleepTimer();
    }
  }, [userTranscriptions]);

  // Capture Text Chat (Backup)
  useEffect(() => {
    if (chatMessages.length > 0) {
      const last = chatMessages[chatMessages.length - 1];
      setLocalMessages(prev => {
        if (prev[prev.length - 1]?.message === last.message) return prev;
        return [...prev.slice(-12), { message: last.message, isLocal: last.from?.isLocal || false }];
      });
      resetSleepTimer();
    }
  }, [chatMessages]);

  const resetSleepTimer = () => {
    setIsSleeping(false);
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    sleepTimer.current = setTimeout(() => setIsSleeping(true), 60000);
  };

  const handleSendText = async () => {
    if (textInput.trim() && send) {
      await send(textInput);
      setTextInput("");
      resetSleepTimer();
    }
  };

  const toggleCamera = async () => {
    if (!localParticipant) return;
    const mode = isBackCamera ? 'user' : 'environment';
    await localParticipant.setCameraEnabled(false);
    setTimeout(async () => {
      await localParticipant.setCameraEnabled(true, { facingMode: mode });
      setIsBackCamera(!isBackCamera);
    }, 200);
  };

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const cameraTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden' }}>
      
      {/* 1. CAMERA BACKGROUND */}
      {localParticipant?.isCameraEnabled && cameraTrack && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, transform: isBackCamera ? 'none' : 'scaleX(-1)' }}>
          <VideoTrack trackRef={cameraTrack as any} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* 2. CHAT HISTORY (Transcriptions + Text) */}
      <div ref={scrollRef} style={chatAreaStyle}>
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          {localMessages.map((msg, i) => (
            <div key={i} style={{ 
              textAlign: msg.isLocal ? 'right' : 'left', margin: '12px 0',
              opacity: i === localMessages.length - 1 ? 1 : 0.4,
              transition: 'all 0.4s ease'
            }}>
              <span style={{ 
                display: 'inline-block', padding: '10px 18px', borderRadius: '18px',
                backgroundColor: msg.isLocal ? 'rgba(255,255,255,0.15)' : 'rgba(10, 132, 255, 0.3)',
                fontSize: '18px', fontWeight: 500, backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {msg.message}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. UI OVERLAYS */}
      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        
        {/* Top Bar */}
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '20px' }}>
            <button onClick={() => setIsNotepadOpen(!isNotepadOpen)} style={noteBtnStyle(isNotepadOpen)}>
              {isNotepadOpen ? '📖' : '📁'}
            </button>
            {isNotepadOpen && (
              <div style={notepadBoxStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '10px' }}>NOTES</strong>
                  <button onClick={() => setNotes([])} style={{ border: 'none', background: 'none', color: 'red', fontSize: '10px', cursor: 'pointer' }}>CLEAR</button>
                </div>
                {notes.map((n, idx) => <div key={idx} style={{ fontSize: '12px', marginBottom: '4px' }}>• {n}</div>)}
              </div>
            )}
          </div>
          <div style={{ pointerEvents: 'auto' }}>
            <MalvinVoiceIsland agent={agent} isSleeping={isSleeping} />
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Bottom Pill */}
        <div style={bottomControlsWrapper}>
          <div style={pillContainerStyle}>
            <button onClick={onDisconnect} style={{ background: 'none', border: 'none', color: '#ff453a', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 10px' }} />
            
            <input 
              placeholder="Message Malvin..." 
              value={textInput} 
              onChange={(e) => setTextInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              style={inputStyle} 
            />

            <button onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: localParticipant?.isMicrophoneEnabled ? '#32d74b' : '#636366' }}>
              {localParticipant?.isMicrophoneEnabled ? '🎙️' : '🔇'}
            </button>
            
            <button 
               onClick={textInput ? handleSendText : () => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} 
               onDoubleClick={toggleCamera}
               style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '10px', color: '#0a84ff' }}
            >
              {textInput ? '↑' : '📷'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 4. EXPORT ---
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