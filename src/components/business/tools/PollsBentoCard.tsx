import React, { useState } from "react";
import { auth } from "../../../firebase";
import { useBizCollection } from "./BizToolShared";
import { Vote, Plus } from "lucide-react";

interface PollDoc { id: string; question: string; options: string[]; votes: Record<string, string>; }

export const PollsBentoCard: React.FC<{ businessId: string; theme: any; accent: string }> = ({ businessId, theme, accent }) => {
  const { items, add, update } = useBizCollection<PollDoc>(businessId, "bizPolls");
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const uid = auth.currentUser?.uid || "anon";

  const active = items[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const options = optionsText.split(",").map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || options.length < 2) return;
    await add({ question, options, votes: {} });
    setQuestion(""); setOptionsText(""); setCreating(false);
  };

  const vote = (option: string) => {
    if (!active) return;
    update(active.id, { [`votes.${uid}`]: option });
  };

  if (creating || !active) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Vote size={13} color={accent} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{active ? "New Poll" : "No active poll"}</span>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input placeholder="Ask something..." value={question} onChange={(e) => setQuestion(e.target.value)} style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, border: `1px solid ${theme.cardBorder}`, background: theme.cardBg, color: theme.text }} />
          <input placeholder="Options, comma separated" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, border: `1px solid ${theme.cardBorder}`, background: theme.cardBg, color: theme.text }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" style={{ flex: 1, background: accent, border: "none", color: "#fff", padding: "8px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <Plus size={12} /> Post Poll
            </button>
            {active && <button type="button" onClick={() => setCreating(false)} style={{ background: "none", border: `1px solid ${theme.cardBorder}`, color: theme.text, borderRadius: 8, fontSize: 12, cursor: "pointer", padding: "8px 10px" }}>Cancel</button>}
          </div>
        </form>
      </div>
    );
  }

  const voteCounts = active.options.map((opt) => ({
    opt,
    count: Object.values(active.votes || {}).filter((v) => v === opt).length,
  }));
  const totalVotes = voteCounts.reduce((s, v) => s + v.count, 0);
  const myVote = active.votes?.[uid];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Vote size={13} color={accent} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>{active.question}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {voteCounts.map(({ opt, count }) => {
          const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const mine = myVote === opt;
          return (
            <button key={opt} onClick={() => vote(opt)} style={{ position: "relative", textAlign: "left", padding: "7px 10px", borderRadius: 8, border: mine ? `1.5px solid ${accent}` : `1px solid ${theme.cardBorder}`, background: theme.cardBg, cursor: "pointer", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: `${accent}1c`, transition: "width 0.3s ease" }} />
              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ fontWeight: mine ? 700 : 500 }}>{opt}</span>
                <span style={{ opacity: 0.6 }}>{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <button onClick={() => setCreating(true)} style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}>New poll</button>
    </div>
  );
};

export default PollsBentoCard;