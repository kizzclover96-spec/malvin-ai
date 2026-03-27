import React, { useState, useEffect, useRef } from 'react';
import { ParticipantKind } from 'livekit-client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRemoteParticipant,
  useIsSpeaking,
  LayoutContextProvider,
  useLocalParticipant,
  useConnectionState
} from '@livekit/components-react';

// ---------------- ERROR BOUNDARY ----------------
class ErrorBoundary extends React.Component<any, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: any) { console.error("🔥 UI Crash:", err); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: "#fff", background: "#000", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          UI Error. Please refresh.
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------- AI FACE ----------------
function MalvinFace({ speaking }: { speaking: boolean }) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      width: 140, height: 140, borderRadius: "50%", background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "3px solid transparent",
      backgroundImage: "linear-gradient(#000,#000),linear-gradient(90deg,#00f,#0ff,#0f0,#ff0,#f00,#00f)",
      backgroundClip: "content-box, border-box",
      animation: "spin 4s linear infinite",
      boxShadow: speaking ? "0 0 40px rgba(0,150,255,0.9)" : "0 0 10px rgba(255,255,255,0.1)"
    }}>
      <style>{`@keyframes spin { 0% { background-position: 0% } 100% { background-position: 200% } }`}</style>
      <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
        <div style={{ width: 12, height: blink ? 2 : 12, background: "#fff" }} />
        <div style={{ width: 12, height: blink ? 2 : 12, background: "#fff" }} />
      </div>
    </div>
  );
}

// ---------------- ACTIVE SESSION CONTENT ----------------
// We pull all LiveKit hooks into THIS component. 
// It ONLY renders when connectionState === 'connected'.
function ActiveStage({ onDisconnect }: { onDisconnect: () => void }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { localParticipant } = useLocalParticipant();
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  
  // hook is safe here because this component only mounts when connected
  const speaking = agent ? useIsSpeaking(agent) : false;

  useEffect(() => {
    if (!agent) return;
    const handleData = (payload: Uint8Array) => {
      const msg = new TextDecoder().decode(payload);
      setThinking(false);
      setMessages(prev => [...prev, { message: msg, isLocal: false }]);
    };
    agent.on("dataReceived", handleData);
    return () => { agent.off("dataReceived", handleData); };
  }, [agent]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = async () => {
    if (!text.trim() || !localParticipant) return;
    try {
      setThinking(true);
      const data = new TextEncoder().encode(text);
      await localParticipant.publishData(data, { reliable: true, topic: "user_input" });
      setMessages(prev => [...prev, { message: text, isLocal: true }]);
      setText("");
    } catch (err) {
      setThinking(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", top: 40, width: "100%", display: "flex", justifyContent: "center", zIndex: 10 }}>
        <MalvinFace speaking={speaking} />
      </div>

      <div ref={scrollRef} style={{ flex: 1, marginTop: 220, padding: 20, overflowY: "auto", display: 'flex', flexDirection: 'column' }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: 10, alignSelf: m.isLocal ? "flex-end" : "flex-start",
            background: m.isLocal ? "#1c1c1e" : "#0a84ff",
            padding: "10px 14px", borderRadius: 14, color: "#fff", maxWidth: "75%"
          }}>{m.message}</div>
        ))}
        {thinking && <div style={{ color: "#888" }}>Thinking...</div>}
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", gap: 10, background: "rgba(40,40,40,0.8)", padding: 10, borderRadius: 30 }}>
          <input 
             value={text} 
             onChange={e => setText(e.target.value)} 
             onKeyDown={e => e.key === "Enter" && send()}
             placeholder="Message..." 
             style={{ flex: 1, background: "transparent", border: "none", color: "#fff", outline: "none" }} 
          />
          <button onClick={send} style={{ background: 'none', border: 'none', color: '#0a84ff', fontSize: '20px' }}>➤</button>
          <button onClick={onDisconnect} style={{ background: 'none', border: 'none' }}>❌</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- GATEKEEPER ----------------
function VideoStage({ onDisconnect }: { onDisconnect: () => void }) {
  const connectionState = useConnectionState();

  if (connectionState !== "connected") {
    return (
      <div style={{ color: "#fff", background: "#000", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Connecting to Malvin...
      </div>
    );
  }

  // Only render the components with hooks once connected
  return <ActiveStage onDisconnect={onDisconnect} />;
}

// ---------------- ROOT ----------------
export default function Session(props: any) {
  return (
    <ErrorBoundary>
      <LiveKitRoom
        token={props.token}
        serverUrl={props.serverUrl}
        connect={true}
        audio={true}
        video={false}
        onDisconnected={props.onDisconnect}
      >
        <LayoutContextProvider>
          <RoomAudioRenderer />
          <VideoStage onDisconnect={props.onDisconnect} />
        </LayoutContextProvider>
      </LiveKitRoom>
    </ErrorBoundary>
  );
}