import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db, auth } from "../firebase";

interface Props {
  brandName: string;
}

const BusinessInsightsPopup: React.FC<Props> = ({ brandName }) => {
  const [visible, setVisible] = useState(false);
  const [aiAdvice, setAiAdvice] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const [stats, setStats] = useState({
    pendingChats: 0,
    campaignChange: 0,
    reputationScore: 0,
  });

  // ---------------- SOUND ----------------
  const playSound = async () => {
    const audio = new Audio("/popup.mp3");
    audio.volume = 0.4;
    try {
      await audio.play();
    } catch (e) {
      console.log("Audio blocked until user interaction");
    }
  };

  // ---------------- GREETING ----------------
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Morning";
    if (h < 18) return "Afternoon";
    return "Evening";
  };

  // ---------------- FIREBASE ----------------
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const chatRef = ref(db, `users/${userId}/chats`);
    const campaignRef = ref(db, `users/${userId}/campaigns`);
    const userRef = ref(db, `users/${userId}`);

    const unsubChats = onValue(chatRef, (snap) => {
      const data = snap.val() || {};
      const pending = Object.values(data).filter(
        (c: any) => c?.status === "pending"
      ).length;

      setStats((p) => ({ ...p, pendingChats: pending }));
    });

    const unsubCampaigns = onValue(campaignRef, (snap) => {
      const data = snap.val() || {};
      const arr = Object.values(data) as any[];

      if (arr.length < 2) return;

      const sorted = [...arr].sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
      );

      const last = sorted.at(-1)?.reach || 0;
      const prev = sorted.at(-2)?.reach || 0;

      const change = prev === 0 ? 0 : ((last - prev) / prev) * 100;

      setStats((p) => ({
        ...p,
        campaignChange: Math.round(change),
      }));
    });

    const unsubUser = onValue(userRef, (snap) => {
      const data = snap.val() || {};
      setStats((p) => ({
        ...p,
        reputationScore: data.reputationScore || 0,
      }));
    });

    const shown = sessionStorage.getItem("insightShown");

    if (!shown) {
      setTimeout(() => {
        setVisible(true);
        playSound();
        sessionStorage.setItem("insightShown", "true");
      }, 1200);
    }

    return () => {
      unsubChats();
      unsubCampaigns();
      unsubUser();
    };
  }, []);

  // ---------------- AI CALL ----------------
  const requestAIAdvice = async () => {
    setLoadingAI(true);
    setAiAdvice("");

    try {
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch(
        "https://malvinai.com/api/malvin-ai-analysis",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            stats,
            brandName,
            mode: "insight",
          }),
        }
      );

      const data = await res.json();
      setAiAdvice(data.text || "No response received.");
    } catch (err) {
      setAiAdvice("AI temporarily unavailable.");
    } finally {
      setLoadingAI(false);
    }
  };

  if (!visible) return null;

  const reputationMessage =
    stats.reputationScore > 70
      ? "Strong reputation — high trust score."
      : stats.reputationScore > 40
      ? "Moderate reputation — improvement recommended."
      : "Critical reputation — action required immediately.";

    return (
        <>
            {/* BACKDROP */}
            <div style={styles.overlay} onClick={() => setVisible(false)} />

            {/* CARD */}
            <div style={styles.card}>
                <div style={styles.header}>
                    <div>
                        <div style={styles.title}>
                         Good {getGreeting()}, {brandName}
                        </div>
                        <div style={styles.subtitle}>Business Intelligence Report</div>
                    </div>

                    <div style={styles.badge}>LIVE INSIGHT</div>
                </div>

                {/* STATS */}
                <div style={styles.grid}>
                    <div style={styles.stat}>
                        <div>Pending Chats</div>
                        <strong>{stats.pendingChats}</strong>
                    </div>

                    <div style={styles.stat}>
                        <div>Campaign Trend</div>
                        <strong>
                         {stats.campaignChange > 0 ? "+" : ""}
                         {stats.campaignChange}%
                        </strong>
                    </div>

                    <div style={styles.stat}>
                        <div>Reputation</div>
                        <strong>{stats.reputationScore}</strong>
                    </div>
                </div>

                {/* INSIGHT BLOCK */}
                <div style={styles.insightBox}>
                    <p style={styles.insightText}>{reputationMessage}</p>

                    <p style={styles.suggestion}>
                        Suggested Action: Optimize ad targeting + increase budget by €5–€10
                    </p>
                </div>

                {/* AI BUTTON */}
                <button style={styles.btn} onClick={requestAIAdvice}>
                 {loadingAI ? "Generating Insight..." : "Generate AI Strategy"}
                </button>

                {/* AI OUTPUT */}
                {aiAdvice && <div style={styles.aiBox}>{aiAdvice}</div>}
            </div>
        </>
    );
};

export default BusinessInsightsPopup;
const styles: any = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(12px)",
    zIndex: 999,
  },

  card: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "460px",
    padding: "22px",
    borderRadius: "22px",
    color: "white",
    background: "rgba(20,20,20,0.75)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    backdropFilter: "blur(25px)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "16px",
  },

  title: {
    fontSize: "18px",
    fontWeight: 700,
  },

  subtitle: {
    fontSize: "12px",
    opacity: 0.6,
  },

  badge: {
    fontSize: "10px",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#C5FF41",
    color: "#000",
    fontWeight: 700,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "10px",
    marginTop: "12px",
  },

  stat: {
    padding: "12px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.05)",
    fontSize: "12px",
  },

  insightBox: {
    marginTop: "14px",
    padding: "12px",
    borderRadius: "14px",
    background: "rgba(197,255,65,0.08)",
    border: "1px solid rgba(197,255,65,0.2)",
  },

  insightText: {
    fontSize: "13px",
    marginBottom: "8px",
  },

  suggestion: {
    fontSize: "12px",
    opacity: 0.8,
  },

  btn: {
    marginTop: "14px",
    width: "100%",
    padding: "10px",
    borderRadius: "12px",
    background: "#C5FF41",
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
  },

  aiBox: {
    marginTop: "12px",
    fontSize: "13px",
    padding: "12px",
    borderRadius: "12px",
    background: "rgba(0,0,0,0.35)",
  },
};