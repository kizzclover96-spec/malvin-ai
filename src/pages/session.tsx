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
          Something broke. Reload.
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
      <div>
        <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
          <div style={{ width: 12, height: blink ? 2 : 12, background: "#fff", transition: 'height 0.1s' }} />
          <div style={{ width: 12, height: blink ? 2 : 12, background: "#fff", transition: 'height 0.1s' }} />
        </div>
        <div style={{ width: 30, height: 2, background: "#aaa", margin: "0 auto" }} />
      </div>
    </div>
  );
}

// ---------------- MAIN ----------------
function VideoStage({ onDisconnect }: any) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [thinking, setThinking] = useState(false);

  // 1. Get connection state first
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  
  // 2. Only call hooks if we have an agent
  const speaking = agent ? useIsSpeaking(agent) : false;

  const scrollRef = useRef<HTMLDivElement>(null);

  // ✅ DEFENSIVE DATA RECEIVE
  useEffect(() => {
    if (!agent) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const msg = new TextDecoder().decode(payload);
        setThinking(false);
        setMessages(prev => [...prev, { message: msg, isLocal: false }]);
      } catch (e) {
        console.error("Decode error:", e);
      }
    };

    agent.on("dataReceived", handleData);
    return () => { agent.off("dataReceived", handleData); };
  }, [agent]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  const send = async () => {
    if (!text.trim() || !localParticipant || connectionState !== "connected") return;

    try {
      setThinking(true);
      const data = new TextEncoder().encode(text);
      await localParticipant.publishData(data, { reliable: true, topic: "user_input" });

      setMessages(prev => [...prev, { message: text, isLocal: true }]);
      setText("");
    } catch (err) {
      console.error("Send failed:", err);
      setThinking(false);
    }
  };

  // 3. Render Loading State if not ready
  if (connectionState !== "connected" || !localParticipant) {
    return (
      <div style={{ color: "#fff", background: "#000", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Connecting to Malvin...
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", display: "flex", flexDirection: "column", overflow: 'hidden' }}>
      
      {/* FACE */}
      <div style={{ position: "absolute", top: 40, width: "100%", display: "flex", justifyContent: "center", zIndex: 10 }}>
        <MalvinFace speaking={speaking} />
      </div>

      {/* CHAT */}
      <div ref={scrollRef} style={{ flex: 1, marginTop: 220, padding: "0 20px 20px 20px", overflowY: "auto", display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }} /> {/* Spacer to push messages to bottom */}
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: 10,
            alignSelf: m.isLocal ? "flex-end" : "flex-start",
            background: m.isLocal ? "#1c1c1e" : "#0a84ff",
            padding: "10px 14px",
            borderRadius: 14,
            color: "#fff",
            maxWidth: "75%",
            wordBreak: "break-word"
          }}>
            {m.message}
          </div>
        ))}
        {thinking && <div style={{ color: "#888", fontSize: '14px', fontStyle: 'italic' }}>Malvin is thinking...</div>}
      </div>

      {/* INPUT */}
      <div style={{ padding: 20, zIndex: 20 }}>
        <div style={{ display: "flex", gap: 10, background: "rgba(40,40,40,0.8)", padding: '8px 16px', borderRadius: 30, alignItems: 'center', backdropFilter: 'blur(10px)' }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Talk to Malvin..."
            style={{ flex: 1, background: "transparent", border: "none", color: "#fff", outline: "none", padding: '8px 0' }}
          />
          <button onClick={send} style={{ background: 'none', border: 'none', color: '#0a84ff', fontSize: '20px', cursor: 'pointer' }}>➤</button>
          <button onClick={onDisconnect} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>❌</button>
        </div>
      </div>
    </div>
  );
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