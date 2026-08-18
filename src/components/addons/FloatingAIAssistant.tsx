import React, { useEffect, useRef, useState } from "react";
import { Bot, X, Send } from "lucide-react";
import { TOOLS, ToolKey, ToolState } from "../../config/bvinTools";
import { formatBytes } from "../../utils/storage";
import type { StorageState } from "../../utils/storage";

interface ChatLine { id: string; from: "user" | "assistant"; text: string; }

interface Props {
  enabled: boolean;
  accent: string;
  tools: ToolState;
  toggleTool: (key: ToolKey) => void;
  onOpenFullscreen: (key: string) => void;
  storageState?: StorageState;
  qrScans?: number;
  noticeScans?: number;
  onSetActiveTab?: (tab: string) => void;
}

/* ---------------------------------------------------------------------------
   No external API. Every response comes from local pattern-matching against
   the same TOOLS catalog that drives Enable Tools, plus whatever counters
   the dashboard already tracks (storage, scans). Small talk is a handful of
   canned, randomized replies — nothing here calls out to a model.

   Coverage is intentionally broad: this should be able to do almost
   anything a person could do by tapping around Malvin manually — open any
   tool, enable/disable it, jump to a dashboard tab, or pull up a live
   number — so it reads as one assistant for the whole app, not just the
   Business/Organization/Community tools.
--------------------------------------------------------------------------- */

const GREETING_RE = /\b(hi|hey|hello|yo|good morning|good afternoon|good evening)\b/i;
const HOW_ARE_YOU_RE = /how('?s| is| are)?\s*(you|it going|things)/i;
const THANKS_RE = /\b(thanks|thank you|thx|ty)\b/i;
const BYE_RE = /\b(bye|goodbye|see you|later)\b/i;
const ENABLE_RE = /\b(enable|turn on|activate|switch on)\b\s+(.+)/i;
const OPEN_RE = /\b(open|show me|go to|launch|take me to)\b\s+(.+)/i;
const DISABLE_RE = /\b(disable|turn off|hide|deactivate|switch off)\b\s+(.+)/i;
const STORAGE_RE = /\b(storage|space|how much (room|space))\b/i;
const SCANS_RE = /\b(scans?|visitors?|customers scanned)\b/i;
const HELP_RE = /\b(what can you do|help me|options|commands)\b/i;

const GREETINGS = ["Good morning! ☀️ What can I help with?", "Hey there! How can I help?", "Hi! Ready when you are."];
const HOW_ARE_YOU = ["I'm doing well, thanks for asking! How can I help today?", "All good on my end! What do you need?"];
const THANKS = ["You're welcome!", "Anytime!", "Happy to help."];
const BYES = ["See you later!", "Bye for now!", "Catch you later!"];

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// Dashboard tabs that aren't part of the tool catalog but a person might
// still ask for by name.
const NAV_TARGETS: Record<string, string> = {
  dashboard: "dashboard",
  home: "dashboard",
  orders: "allOrders",
  "all orders": "allOrders",
  chat: "chat",
  team: "team",
  "team hub": "team",
  receipts: "receipts",
};

function findTool(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    TOOLS.find((t) => t.label.toLowerCase() === q) ||
    TOOLS.find((t) => t.label.toLowerCase().includes(q) || q.includes(t.label.toLowerCase()))
  );
}

function findNavTarget(query: string) {
  const q = query.trim().toLowerCase();
  return Object.keys(NAV_TARGETS).find((k) => q.includes(k));
}

function useAssistantBrain(props: Props) {
  return (input: string): { reply: string; action?: () => void } => {
    const text = input.trim();

    if (HELP_RE.test(text)) {
      return { reply: "I can open or enable any tool (\"open invoices\"), turn things off (\"disable polls\"), jump to a dashboard tab (\"go to orders\"), or pull up a live number (\"how's my storage?\", \"how many scans?\")." };
    }

    if (STORAGE_RE.test(text) && props.storageState) {
      const left = formatBytes(Math.max(0, props.storageState.limitBytes - props.storageState.usedBytes));
      return { reply: `You've used ${formatBytes(props.storageState.usedBytes)} of ${formatBytes(props.storageState.limitBytes)} — ${left} left.` };
    }
    if (SCANS_RE.test(text) && props.qrScans !== undefined) {
      const total = (props.qrScans || 0) + (props.noticeScans || 0);
      return { reply: `You've had ${total} scan${total === 1 ? "" : "s"} total — ${props.qrScans} from your store QR and ${props.noticeScans} from your live notice.` };
    }

    let m = text.match(ENABLE_RE) || text.match(OPEN_RE);
    if (m) {
      const navTarget = findNavTarget(m[2]);
      if (navTarget && props.onSetActiveTab) {
        const tab = NAV_TARGETS[navTarget];
        return { reply: `Taking you to ${navTarget}.`, action: () => props.onSetActiveTab?.(tab) };
      }
      const tool = findTool(m[2]);
      if (!tool) return { reply: `I couldn't find a tool or tab matching "${m[2].trim()}". Try "open invoices" or "go to orders".` };
      if (tool.alwaysOn) return { reply: `${tool.label} is always on already.` };
      const action = () => {
        if (!props.tools[tool.key]) props.toggleTool(tool.key);
        if (tool.fullscreen) props.onOpenFullscreen(tool.key);
      };
      return { reply: tool.fullscreen ? `Opening ${tool.label} for you.` : `Enabled ${tool.label} — you'll find it on your dashboard.`, action };
    }

    m = text.match(DISABLE_RE);
    if (m) {
      const tool = findTool(m[2]);
      if (!tool) return { reply: `I couldn't find a tool matching "${m[2].trim()}".` };
      if (tool.alwaysOn) return { reply: `${tool.label} can't be turned off.` };
      const action = () => { if (props.tools[tool.key]) props.toggleTool(tool.key); };
      return { reply: `Turned off ${tool.label}.`, action };
    }

    if (GREETING_RE.test(text)) return { reply: pick(GREETINGS) };
    if (HOW_ARE_YOU_RE.test(text)) return { reply: pick(HOW_ARE_YOU) };
    if (THANKS_RE.test(text)) return { reply: pick(THANKS) };
    if (BYE_RE.test(text)) return { reply: pick(BYES) };

    return {
      reply: "I can open/enable tools, turn things off, jump to a dashboard tab, or pull up a live number. Ask me \"what can you do?\" for examples.",
    };
  };
}

const FloatingAIAssistant: React.FC<Props> = (props) => {
  const { enabled, accent } = props;
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 90 });
  const [messages, setMessages] = useState<ChatLine[]>([
    { id: "m0", from: "assistant", text: "Hi! I'm your assistant — ask me to open a tool, jump to a tab, or say hi. 👋" },
  ]);
  const [input, setInput] = useState("");
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 20, y: 90 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const brain = useAssistantBrain(props);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!enabled) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { ...position };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging.current) return;
    const deltaX = dragStart.current.x - e.clientX;
    const deltaY = dragStart.current.y - e.clientY;
    setPosition({
      x: Math.max(10, Math.min(window.innerWidth - 70, initialPos.current.x + deltaX)),
      y: Math.max(10, Math.min(window.innerHeight - 70, initialPos.current.y + deltaY)),
    });
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const moveDistance = Math.hypot(dragStart.current.x - e.clientX, dragStart.current.y - e.clientY);
    if (moveDistance < 5) setOpen((o) => !o);
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: ChatLine = { id: "u" + Date.now(), from: "user", text: input };
    const { reply, action } = brain(input);
    setInput("");
    setMessages((m) => [...m, userMsg, { id: "a" + Date.now(), from: "assistant", text: reply }]);
    if (action) setTimeout(action, 250);
  };

  return (
    <>
      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: "fixed", right: `${position.x}px`, bottom: `${position.y}px`,
          width: "54px", height: "54px", borderRadius: "50%",
          background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
          border: "1px solid rgba(255,255,255,0.5)", boxShadow: `0 8px 26px ${accent}55`,
          cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, touchAction: "none",
        }}
        title="AI Assistant"
      >
        <Bot size={22} color="#fff" />
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: `${Math.min(position.x, window.innerWidth - 320)}px`,
            bottom: `${position.y + 66}px`,
            width: "300px", maxHeight: "420px",
            background: "#fff", backdropFilter: "blur(20px)",
            border: "1px solid #E7ECF3", borderRadius: 20,
            boxShadow: "0 20px 60px rgba(15,23,42,0.16)", zIndex: 9999,
            display: "flex", flexDirection: "column", overflow: "hidden",
            animation: "faiPopIn 0.18s ease-out",
          }}
        >
          <style>{`@keyframes faiPopIn { from { opacity:0; transform: translateY(10px) scale(0.96);} to { opacity:1; transform: translateY(0) scale(1);} }`}</style>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid #EEF2F8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#0F172A" }}>
              <Bot size={15} color={accent} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer" }}><X size={15} /></button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%", padding: "8px 12px", borderRadius: m.from === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: m.from === "user" ? accent : "#F1F5FB",
                  color: m.from === "user" ? "#fff" : "#0F172A", fontSize: 12.5, lineHeight: 1.4,
                }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={send} style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid #EEF2F8" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              style={{ flex: 1, background: "#F1F5FB", border: "none", borderRadius: 10, padding: "9px 12px", color: "#0F172A", fontSize: 12.5, outline: "none" }}
            />
            <button type="submit" style={{ width: 34, height: 34, borderRadius: 10, background: accent, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Send size={14} color="#fff" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default FloatingAIAssistant;