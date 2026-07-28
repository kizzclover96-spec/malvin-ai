
import React, { useState } from "react"; // ✅ correct
import { useNavigate } from "react-router-dom";

type Props = {
  onSelect: (mode: "mobile" | "desktop") => void;
};

export default function DeviceSwitch({ onSelect }: Props) {
  const navigate = useNavigate();

  const handleSelect = (mode: "mobile" | "desktop") => {
    onSelect(mode);
    localStorage.setItem("ui_mode", mode);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>Choose Your View</h1>

        <button
          style={{ ...styles.btn, background: "#00aaff" }}
          onClick={() => handleSelect("desktop")}
        >
          🖥 Desktop
        </button>

        <button
          style={{ ...styles.btn, background: "#00ff88" }}
          onClick={() => handleSelect("mobile")}
        >
          📱 Mobile
        </button>
      </div>
    </div>
  );
}

const styles: any = {
  wrapper: {
    height: "100vh",
    width: "100vw",
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "sans-serif",
  },
  card: {
    width: "85%",
    maxWidth: "400px",
    padding: "30px",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.2)",
    textAlign: "center",
    backdropFilter: "blur(20px)",
  },
  title: {
    color: "#fff",
    marginBottom: "25px",
    fontSize: "20px",
  },
  btn: {
    width: "100%",
    padding: "15px",
    marginBottom: "12px",
    borderRadius: "12px",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
    color: "#000",
    fontSize: "16px",
  },
};