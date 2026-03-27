import React, { useState, useEffect, useRef } from 'react';
import { ParticipantKind } from 'livekit-client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRemoteParticipant,
  useIsSpeaking,
  LayoutContextProvider,
  useChat,
  useLocalParticipant
} from '@livekit/components-react';

// ---------------- ERROR BOUNDARY ----------------
class ErrorBoundary extends React.Component<any, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("🔥 UI Crash:", error);
  }

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

// ---------------- WAVEFORM ----------------
function WaveBars({ active }: { active: boolean }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          width: 4,
          height: active ? 20 : 8,
          background: "#0a84ff",
          borderRadius: 2,
          animation: active ? `wave 0.6s ${i * 0.1}s infinite alternate` : "none"
        }} />
      ))}

      <style>{`
        @keyframes wave {
          from { height: 6px; }
          to { height: 22px; }
        }
      `}</style>
    </div>
  );
}

// ---------------- AI FACE ----------------
function MalvinFace({ speaking, thinking }: { speaking: boolean; thinking: boolean }) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const glow = speaking
    ? "0 0 50px rgba(10,132,255,0.9)"
    : thinking
    ? "0 0 25px rgba(255,255,255,0.3)"
    : "0 0 10px rgba(255,255,255,0.1)";

  return (
    <div style={{
      width: 150,
      height: 150,
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
      boxShadow: glow,
      transition: "0.3s"
    }}>
      <style>{`
        @keyframes spin {
          0% { background-position: 0% }
          100% { background-position: 200% }
        }
      `}</style>

      <div>
        {/* Eyes */}
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 10 }}>
          <div style={{
            width: 12,
            height: blink ? 2 : 12,
            background: "#fff",
            transition: "0.1s"
          }} />
          <div style={{
            width: 12,
            height: blink ? 2 : 12,
            background: "#fff",
            transition: "0.1s"
          }} />
        </div>

        {/* Mouth / Wave */}
        {speaking ? (
          <WaveBars active />
        ) : (
          <div style={{
            width: 30,
            height: 2,
            background: "#aaa",
            margin: "0 auto"
          }} />
        )}
      </div>
    </div>
  );
}

// ---------------- MAIN UI ----------------
function VideoStage({ onDisconnect }: any) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [thinking, setThinking] = useState(false);

  const agent = useRemoteParticipant({ kind: ParticipantKind.AGENT });

  // ✅ Correct hook usage
  const localParticipant = useLocalParticipant();

  const { chatMessages } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // ⚠️ Safe speaking usage
  const speaking = agent ? useIsSpeaking(agent) : false;

  // ✅ Prevent crash before connection
  if (!localParticipant) {
    return (
      <div style={{
        color: "#fff",
        background: "#000",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        Connecting...
      </div>
    );
  }

  useEffect(() => {
    const last = chatMessages?.[chatMessages.length - 1];
    if (!last) return;

    if (!last.from?.isLocal) {
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

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000",
      display: "flex",
      flexDirection: "column"
    }}>

      {/* AI FACE */}
      <div style={{
        position: "absolute",
        top: 40,
        width: "100%",
        display: "flex",
        justifyContent: "center"
      }}>
        {agent && (
          <MalvinFace speaking={speaking} thinking={thinking} />
        )}
      </div>

      {/* CHAT */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          marginTop: 220,
          padding: 20,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.isLocal ? "flex-end" : "flex-start",
            background: m.isLocal ? "#1c1c1e" : "#0a84ff",
            padding: "10px 14px",
            borderRadius: 14,
            color: "#fff",
            maxWidth: "75%"
          }}>
            {m.message}
          </div>
        ))}

        {thinking && (
          <div style={{ color: "#888" }}>
            Malvin is thinking...
          </div>
        )}
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
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Message Malvin..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#fff",
              outline: "none"
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