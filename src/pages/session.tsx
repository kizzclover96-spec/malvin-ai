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
const GearIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>;
const CameraIcon = ({ enabled }: { enabled: boolean }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.3 }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const MicIcon = ({ enabled }: { enabled: boolean }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={neonBlue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: enabled ? 1 : 0.3 }}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" /></svg>;

function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [activeTab, setActiveTab] = useState<'notes' | 'style' | 'system'>('notes');
  const [notes, setNotes] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [bgBlur, setBgBlur] = useState(0);
  
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([{ source: Track.Source.Camera, pks: [localParticipant?.identity || ''] }]);
  const cameraTrack = tracks.find(t => t.participant.identity === localParticipant?.identity);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // Sync Notes from Data Packets
  useEffect(() => {
    if (!localParticipant) return;
    const onData = (payload: Uint8Array, _p: any, _k: any, topic?: string) => {
      if (topic === "note_update") {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (data.notes) setNotes(data.notes);
        } catch (e) { console.error(e); }
      }
    };
    localParticipant.on('dataReceived', onData);
    return () => { localParticipant.off('dataReceived', onData); };
  }, [localParticipant]);

  const downloadNotes = () => {
    const blob = new Blob([notes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'notes.txt'; a.click();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
      
      {/* 1. VIDEO LAYER (Full Screen) */}
      {cameraTrack && localParticipant?.isCameraEnabled && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <VideoTrack trackRef={cameraTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* 2. WALLPAPER LAYER */}
      {backgroundImage && (
        <div style={{ 
            position: 'absolute', inset: 0, zIndex: 2,
            backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center',
            filter: `blur(${bgBlur}px)`, transform: 'scale(1.1)' 
        }} />
      )}
      
      {/* 3. DIMMER */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3, backgroundColor: 'rgba(0,0,0,0.5)' }} />

      {/* --- SIDEBAR --- */}
      {isSettingsOpen && (
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: '300px',
          backgroundColor: 'rgba(10,10,10,0.95)', borderRight: `1px solid ${neonBlue}33`,
          zIndex: 100, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', marginTop: '60px', borderBottom: '1px solid #222' }}>
            {['notes', 'style', 'system'].map((t: any) => (
              <div key={t} onClick={() => setActiveTab(t)} style={{
                flex: 1, padding: '15px 0', textAlign: 'center', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold',
                color: activeTab === t ? neonBlue : '#444', borderBottom: activeTab === t ? `2px solid ${neonBlue}` : 'none'
              }}>{t.toUpperCase()}</div>
            ))}
          </div>

          <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
            {activeTab === 'notes' && (
              <div>
                <p style={{ fontSize: '12px', color: '#555', marginBottom: '15px' }}>Malvin's Notepad</p>
                {notes.map((n, i) => <div key={i} style={{ padding: '10px', background: '#111', borderRadius: '5px', marginBottom: '8px', borderLeft: `2px solid ${neonBlue}`, fontSize: '13px' }}>{n}</div>)}
              </div>
            )}
            {activeTab === 'style' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <button onClick={() => bgInputRef.current?.click()} style={{ padding: '10px', background: 'none', border: `1px solid ${neonBlue}55`, color: '#fff', borderRadius: '5px', cursor: 'pointer' }}>Change Wallpaper</button>
                <input type="file" ref={bgInputRef} hidden accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { const reader = new FileReader(); reader.onloadend = () => setBackgroundImage(reader.result as string); reader.readAsDataURL(file); }
                }} />
                {backgroundImage && <input type="range" min="0" max="25" value={bgBlur} onChange={(e) => setBgBlur(parseInt(e.target.value))} style={{ width: '100%', accentColor: neonBlue }} />}
              </div>
            )}
            {activeTab === 'system' && (
              <button onClick={downloadNotes} style={{ width: '100%', padding: '10px', background: neonBlue, border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Download .txt</button>
            )}
          </div>
        </div>
      )}

      {/* OVERLAY TO CLOSE SIDEBAR */}
      {isSettingsOpen && <div onClick={() => setIsSettingsOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 90 }} />}

      {/* UI ELEMENTS */}
      <div style={{ position: 'absolute', top: '25px', left: '25px', zIndex: 110 }}>
        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><GearIcon /></button>
      </div>

      <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 110 }}>
        <div style={{ width: '90%', maxWidth: '440px', height: '52px', backgroundColor: 'rgba(15,15,15,0.95)', borderRadius: '26px', border: `1px solid ${neonBlue}44`, display: 'flex', alignItems: 'center', padding: '0 15px' }}>
          <button onClick={onDisconnect} style={{ color: neonRed, background: 'none', border: `1px solid ${neonRed}`, borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', marginRight: '10px' }}>✕</button>
          <input placeholder="Say something..." style={{ flex: 1, background: 'none', border: 'none', color: '#fff', outline: 'none' }} />
          <div style={{ display: 'flex', gap: '12px' }}>
             <button onClick={() => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><CameraIcon enabled={!!localParticipant?.isCameraEnabled} /></button>
             <button onClick={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><MicIcon enabled={!!localParticipant?.isMicrophoneEnabled} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Session({ token, serverUrl, onDisconnect }: SessionProps) {
  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect={true} audio={true} video={false}>
      <LayoutContextProvider>
        <RoomAudioRenderer />
        <VideoStage onDisconnect={onDisconnect} />
      </LayoutContextProvider>
    </LiveKitRoom>
  );
}