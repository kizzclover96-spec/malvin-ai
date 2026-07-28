import React, { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  };

  const rejectCookies = () => {
    localStorage.setItem("cookie_consent", "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      width: "100%",
      background: "#111",
      color: "#fff",
      padding: "20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 9999,
      borderTop: "1px solid #333"
    }}>
      <span style={{ fontSize: "0.85rem", maxWidth: "70%" }}>
        Malvin AI uses cookies to enhance performance and personalize your experience. By using Malvin AI, you agree to our{" "}
        <span
          onClick={() => window.open("/privacy", "_blank")}
          style={{ color: "#00d4ff", cursor: "pointer", textDecoration: "underline" }}
        >
          Privacy Policy
        </span>.
      </span>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={rejectCookies}
          style={{
            background: "#333",
            color: "#fff",
            border: "none",
            padding: "8px 12px",
            cursor: "pointer",
            borderRadius: "6px"
          }}
        >
          Reject
        </button>

        <button
          onClick={acceptCookies}
          style={{
            background: "#0066ff",
            color: "#fff",
            border: "none",
            padding: "8px 12px",
            cursor: "pointer",
            borderRadius: "6px"
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}