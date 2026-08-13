import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot, setDoc, increment } from "firebase/firestore";
import { firestore as db } from "../../firebase";
import { Bell } from "lucide-react";

/* Plain page (not inside StoreFront's iframe — this is a quick "what does
   this business want me to know" screen, not a place with any writes to
   protect) scanned from the Customer Notice bento card's QR in B-Vin. */

const NoticeView: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const [state, setState] = useState<{ name: string; text: string; accent: string; font: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    const ref = doc(db, "business", businessId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        return;
      }
      const data = snap.data() as any;
      const p = data.profile || {};
      setState({
        name: p.name || "Business",
        text: p.customerNoticeText || "No notice has been set.",
        accent: p.colors?.accent || "#22c55e",
        font: p.colors?.font || "Inter",
      });
    });
    return () => unsub();
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    setDoc(doc(db, "business", businessId), { profile: { noticeScans: increment(1) } }, { merge: true }).catch(() => {});
  }, [businessId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "linear-gradient(180deg,#fbf9f4 0%,#f4f1e9 100%)",
        fontFamily: `${state?.font || "Inter"}, sans-serif`,
      }}
    >
      {notFound ? (
        <p style={{ color: "#888", fontSize: 14 }}>This business couldn't be found.</p>
      ) : !state ? (
        <p style={{ color: "#999", fontSize: 13 }}>Loading…</p>
      ) : (
        <div
          style={{
            maxWidth: 360,
            width: "100%",
            background: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 24,
            padding: 28,
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: `${state.accent}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Bell size={20} color={state.accent} />
          </div>
          <h1 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 10px" }}>{state.name}</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "#333", margin: 0, whiteSpace: "pre-wrap" }}>{state.text}</p>
        </div>
      )}
    </div>
  );
};

export default NoticeView;