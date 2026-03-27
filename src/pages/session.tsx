import React, { useState, useEffect, useRef } from 'react';
import { ParticipantKind } from 'livekit-client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRemoteParticipant,
  useIsSpeaking,
  LayoutContextProvider,
  useChat,
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
        <div style={{
          color: "#fff",
          background: "#000",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
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
      width: 140,
      height: 140,
      borderRadius: "50%",
      background: "#000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "3px solid transparent",
      backgroundImage:
        "linear-gradient(#000,#000),linear-gradient(90deg,#00f,#0ff,#0f0,#ff0,#f00,#00f)",
      backgroundClip: "content-box, border-box",
      animation: "spin 4s linear infinite",
      boxShadow: speaking
        ? "0 0 40px rgba(0,150,255,0.9)"
        : "0 0 10px rgba(255,255,255,0.1)"
    }}>
      <style>{`
        @keyframes spin {
          0% { background-position: 0% }
          100% { background-position: 200% }
        }
      `}</style>

      <div>
        <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
          <div style={{ width: 12, height: blink ? 2 : 12, background: "#fff" }} />
          <div style={{ width: 12, height: blink ? 2 : 12, background: "#fff" }} />
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

  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });
  const localParticipant = useLocalParticipant();
  const connectionState = useConnectionState();

  const { chatMessages } = useChat() || {}; // ✅ SAFE

  const scrollRef = useRef<HTMLDivElement>(null);

  const speaking = agent ? useIsSpeaking(agent) : false;

  // ✅ SAFE CHAT HANDLING
  useEffect(() => {
    if (!chatMessages || chatMessages.length === 0) return;

    const last = chatMessages[chatMessages.length - 1];

    if (!last?.from?.isLocal) {
      setThinking(false);
      setMessages(prev => [...prev, {
        message: last.message,
        isLocal: false
      }]);
    }
  }, [chatMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;

    // ❌ DO NOT SEND if not connected
    if (connectionState !== "connected") {
      console.warn("⚠️ Not connected yet");
      return;
    }

    try {
      setThinking(true);

      const data = new TextEncoder().encode(text);

      await localParticipant.publishData(data, {
        reliable: true,
        topic: "user_input"
      });

      setMessages(prev => [...prev, {
        message: text,
        isLocal: true
      }]);

      setText("");
    } catch (err) {
      console.error("Send failed:", err);
      setThinking(false);
    }
  };

  // ✅ LOADING SCREEN
  if (!localParticipant || connectionState !== "connected") {
    return (
      <div style={{
        color: "#fff",
        background: "#000",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        Connecting to AI...
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000",
      display: "flex",
      flexDirection: "column"
    }}>

      {/* FACE */}
      <div style={{
        position: "absolute",
        top: 40,
        width: "100%",
        display: "flex",
        justifyContent: "center"
      }}>
        {agent && <MalvinFace speaking={speaking} />}
      </div>

      {/* CHAT */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          marginTop: 220,
          padding: 20,
          overflowY: "auto"
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: 10,
            alignSelf: m.isLocal ? "flex-end" : "flex-start",
            background: m.isLocal ? "#1c1c1e" : "#0a84ff",
            padding: "10px 14px",
            borderRadius: 14,
            color: "#fff",
            maxWidth: "70%"
          }}>
            {m.message}
          </div>
        ))}

        {thinking && <div style={{ color: "#888" }}>Malvin is thinking...</div>}
      </div>

      {/* INPUT */}
      <div style={{ padding: 20 }}>
        <div style={{
          display: "flex",
          gap: 10,
          background: "rgba(40,40,40,0.8)",
          padding: 10,
          borderRadius: 30
        }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Message..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#fff"
            }}
          />
          <button onClick={send}>➤</button>
          <button onClick={onDisconnect}>❌</button>
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
        connect
        audio
        video
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