import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db, auth } from "../firebase";

interface Props {
  brandName: string;
}

const BusinessInsightsPopup: React.FC<Props> = ({ brandName }) => {
  const [visible, setVisible] = useState(false);
  const [aiAdvice, setAiAdvice] = useState("");

  const [stats, setStats] = useState<any>({
    pendingChats: 0,
    campaignChange: 0,
    reputationScore: 0,
  });

  const playSound = () => {
    const audio = new Audio("/popup.mp3");
    audio.volume = 0.4;
    audio.play();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 18) return "Afternoon";
    return "Evening";
  };

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const chatRef = ref(db, `users/${userId}/chats`);
    const campaignRef = ref(db, `users/${userId}/campaigns`);
    const userRef = ref(db, `users/${userId}`);

    // ---------------- CHATS ----------------
    const unsubChats = onValue(chatRef, (snap) => {
      const data = snap.val() || {};

      const pendingChats = Object.values(data).filter(
        (c: any) => c?.status === "pending"
      ).length;

      setStats((prev: any) => ({
        ...prev,
        pendingChats,
      }));
    });

    // ---------------- CAMPAIGNS ----------------
    const unsubCampaigns = onValue(campaignRef, (snap) => {
      const data = snap.val() || {};
      const campaigns = Object.values(data) as any[];

      if (campaigns.length < 2) return;

      const sorted = campaigns.sort(
        (a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0)
      );

      const last = sorted[sorted.length - 1]?.reach || 0;
      const prev = sorted[sorted.length - 2]?.reach || 0;

      const change =
        prev === 0 ? 0 : ((last - prev) / prev) * 100;

      setStats((prev: any) => ({
        ...prev,
        campaignChange: Math.round(change),
      }));
    });

    // ---------------- REPUTATION ----------------
    const unsubUser = onValue(userRef, (snap) => {
      const data = snap.val() || {};

      setStats((prev: any) => ({
        ...prev,
        reputationScore: data.reputationScore || 0,
      }));
    });

    // ---------------- POPUP ----------------
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

  const requestAIAdvice = async () => {
    const res = await fetch("/api/malvin-ai-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stats,
        brandName,
        mode: "insight",
      }),
    });

    const data = await res.json();
    setAiAdvice(data.text || data.advice);
  };

  if (!visible) return null;

  const reputationMessage =
    stats.reputationScore > 50
      ? "Score is good. You still have opportunities to increase revenue."
      : stats.reputationScore === 50
      ? "Your reputation score is not optimal."
      : "Critical reputation level. Action required.";

  return (
    <>
      <div style={styles.overlay} onClick={() => setVisible(false)} />

      <div style={styles.card}>
        <h2>
          Good {getGreeting()} {brandName}
        </h2>

        <p style={{ opacity: 0.6 }}>Today's Analysis</p>

        <div style={styles.list}>
          <p>• {stats.pendingChats} pending customer chats</p>

          <p>
            • Your ad campaign is{" "}
            {stats.campaignChange < 0 ? "down" : "up"}{" "}
            {Math.abs(stats.campaignChange)}%
          </p>

          <p>• Reputation Score: {stats.reputationScore}</p>

          <p>• {reputationMessage}</p>

          <p>• Suggested action: Increase ad budget by €5</p>
        </div>

        <button style={styles.btn} onClick={requestAIAdvice}>
          Get AI Business Strategy
        </button>

        {aiAdvice && (
          <div style={styles.aiBox}>{aiAdvice}</div>
        )}
      </div>
    </>
  );
};

export default BusinessInsightsPopup;

// 🎨 STYLES
const styles: any = {
    overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(10px)",
        zIndex: 999,
    },
    card: {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "420px",
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "20px",
        padding: "20px",
        color: "white",
        zIndex: 1000,
    },
    list: {
        fontSize: "14px",
        opacity: 0.9,
        marginTop: "10px",
    },
    btn: {
        marginTop: "15px",
        width: "100%",
        padding: "10px",
        borderRadius: "10px",
        border: "none",
        background: "#C5FF41",
        fontWeight: 700,
        cursor: "pointer",
    },
    aiBox: {
        marginTop: "15px",
        fontSize: "13px",
        background: "rgba(0,0,0,0.3)",
        padding: "10px",
        borderRadius: "10px",
    },
};