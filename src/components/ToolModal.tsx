
import React from "react";

interface ToolModalProps {
  showTools: boolean;
  setShowTools: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveTab: (tab: string) => void;
  addActivity: (text: string, icon?: string) => void;
}

const ToolModal = ({
  showTools,
  setShowTools,
  setActiveTab,
  addActivity,
}: ToolModalProps) => {
  if (!showTools) return null;

  return (
    <div
      onClick={() => setShowTools(false)}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.2)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "280px",
          padding: "24px",
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(30px)",
          borderRadius: "38px",
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "20px",
        }}
      >
        <button
          onClick={() => {
            setActiveTab("Simulator");
            setShowTools(false);
            addActivity("Launched Simulator", "🎮");
          }}
        >
          Simulator
        </button>

        <button
          onClick={() => {
            setActiveTab("Calculator");
            setShowTools(false);
            addActivity("Opened Margin Calc", "🧮");
          }}
        >
          Margins
        </button>

        <button
          onClick={() => {
            setActiveTab("Trends");
            setShowTools(false);
            addActivity("Checked Trends", "📈");
          }}
        >
          Trends
        </button>

        <button
          onClick={() => {
            setActiveTab("Runway");
            setShowTools(false);
            addActivity("Audited Cashflow", "🔥");
          }}
        >
          Runway
        </button>
      </div>
    </div>
  );
};

export default ToolModal;
