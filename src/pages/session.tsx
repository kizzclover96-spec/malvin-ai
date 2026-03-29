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

// --- ICONS ---
const GearIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>;
const CameraIcon = ({ enabled }: { enabled: boolean }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.4 }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const MicIcon = ({ enabled }: { enabled: boolean }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.4 }}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" /></svg>;

type Tab = 'notes' | 'appearance' | 'system';

function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('notes');
  const [notes, setNotes] = useState<string[]>([]); 
  const [textInput, setTextInput] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [bgBlur, setBgBlur] = useState(0);
  
  const { localParticipant } = useLocalParticipant();
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const tracks = useTracks([{ source: Track.Source.Camera, pks: [localParticipant?.identity || ''] }]);
  const cameraTrack = tracks.find(t => t.participant.identity === localParticipant?.identity);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // --- SYNC NOTES FROM AI TOOL ---
  useEffect(() => {
    if (!localParticipant) return;
    const handleData = (payload: Uint8Array, _p: any, _k: any, topic?: string) => {
      if (topic === "note_update") {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (data.notes) setNotes(data.notes);
        } catch (e) { console.error("Data parse error", e); }
      }
    };
    localParticipant.on('dataReceived', handleData);
    return () => { localParticipant.off('dataReceived', handleData); };
  }, [localParticipant]);

  const downloadNotes = () => {
    const content = notes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `malvin_notes.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sidebarTabStyle = (tab: Tab): CSSProperties => ({
    padding: '12px 18px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase',
    color: activeTab === tab ? neonBlue : '#444', borderBottom: activeTab === tab ? `2px solid ${neonBlue}` : '2px solid transparent',
    transition: 'all 0.2s'
  });

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* 1. VIDEO LAYER */}
      {cameraTrack && localParticipant?.isCameraEnabled && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}><VideoTrack trackRef={cameraTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
      )}

      {/* 2. BACKGROUND IMAGE LAYER */}
      {backgroundImage && (
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: `blur(${bgBlur}px)`, transform: 'scale(1.05)', zIndex: 2 }} />
      )}
      
      {/* 3. DIMMER OVERLAY */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: (backgroundImage || localParticipant?.isCameraEnabled) ? 'rgba(0,0,0,0.4)' : '#000', zIndex: 3 }} />

      {/* --- SIDEBAR DRAWER --- */}
      <div style={{
        position: 'absolute', top: 0, left: isSettingsOpen ? 0 : '-350px',
        display: isSettingsOpen ? 'flex' : 'none', width: '300px', height: '100%', 
        backgroundColor: 'rgba(10,10,10,0.98)', borderRight: `1px solid ${neonBlue}33`, zIndex: 200,
        flexDirection: 'column', boxShadow: '20px 0 60px rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)'
      }}>
        <div style={{ display: 'flex', marginTop: '70px', padding: '0 10px', borderBottom: '1px solid #1a1a1a' }}>
          <div onClick={() => setActiveTab('notes')} style={sidebarTabStyle('notes')}>Notes</div>
          <div onClick={() => setActiveTab('appearance')} style={sidebarTabStyle('appearance')}>Style</div>
          <div onClick={() => setActiveTab('system')} style={sidebarTabStyle('system')}>System</div>
        </div>

        <div style={{ padding: '25px', flex: 1, overflowY: 'auto' }}>
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ color: neonBlue, margin: '0 0 10px 0', fontSize: '14px' }}>NOTEPAD</h4>
              {notes.length === 0 ? <p style={{ color: '#333', fontSize: '12px' }}>No notes found.</p> : 
                notes.map((n, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', borderLeft: `2px solid ${neonBlue}`, fontSize: '13px' }}>{n}</div>)
              }
            </div>
          )}

          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <button onClick={() => bgInputRef.current?.click()} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${neonBlue}55`, color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>🖼️ Upload Background</button>
              <input type="file" ref={bgInputRef} hidden accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { const reader = new FileReader(); reader.onloadend = () => setBackgroundImage(reader.result as string); reader.readAsDataURL(file); }
              }} />
              {backgroundImage && (
                <div>
                  <label style={{ fontSize: '11px', color: '#666' }}>BLUR INTENSITY: {bgBlur}px</label>
                  <input type="range" min="0" max="30" value={bgBlur} onChange={(e) => setBgBlur(parseInt(e.target.value))} style={{ width: '100%', accentColor: neonBlue }} />
                  <button onClick={() => setBackgroundImage(null)} style={{ background: 'none', border: 'none', color: neonRed, fontSize: '11px', marginTop: '10px', cursor: 'pointer' }}>Remove Image</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <p>LATENCY: 40ms</p>
                <p>ENCRYPTION: AES-256</p>
              </div>
              <button onClick={downloadNotes} disabled={notes.length === 0} style={{ background: notes.length > 0 ? 'rgba(0,210,255,0.1)' : '#111', border: `1px solid ${notes.length > 0 ? neonBlue : '#222'}`, color: notes.length > 0 ? '#fff' : '#444', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>📥 Download Notes (.txt)</button>
            </div>
          )}
        </div>
      </div>

      {isSettingsOpen && <div onClick={() => setIsSettingsOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 199 }} />}

      {/* TOP GEAR BUTTON */}
      <div style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 201 }}>
        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><GearIcon /></button>
      </div>

      {/* BOTTOM CONTROL BAR */}
      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100 }}>
        <div style={{ width: '90%', maxWidth: '460px', height: '54px', backgroundColor: 'rgba(15,15,15,0.96)', borderRadius: '27px', border: `1px solid ${neonBlue}66`, display: 'flex', alignItems: 'center', padding: '0 18px', boxShadow: `0 0 20px ${neonBlue}11` }}>
            <button onClick={onDisconnect} style={{ color: neonRed, background: 'none', border: `1.5px solid ${neonRed}`, borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', marginRight: '12px', fontWeight: 'bold' }}>✕</button>
            <input 
                placeholder="Talk to Malvin..." 
                style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '14px' }} 
                onKeyDown={async (e) => {
                    if (e.key === 'Enter' && localParticipant) {
                        const data = new TextEncoder().encode((e.target as HTMLInputElement).value);
                        await localParticipant.publishData(data, { reliable: true });
                        (e.target as HTMLInputElement).value = "";
                    }
                }}
            />
            <div style={{ display: 'flex', gap: '15px', marginLeft: '10px' }}>
                <button onClick={() => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <CameraIcon enabled={!!localParticipant?.isCameraEnabled} />
                </button>
                <button onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <MicIcon enabled={!!localParticipant?.isMicrophoneEnabled} />
                </button>
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