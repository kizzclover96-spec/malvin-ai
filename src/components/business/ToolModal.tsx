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

  // Reusable component for internal button presentation
  const AppIconButton = ({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) => {
    return (
      <button
        onClick={onClick}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "none",
          border: "none",
          cursor: "pointer",
          gap: "8px",
          outline: "none",
          padding: "4px 0",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseEnter={(e) => {
          const iconCircle = e.currentTarget.firstChild as HTMLElement;
          if (iconCircle) iconCircle.style.transform = "scale(1.04)";
        }}
        onMouseLeave={(e) => {
          const iconCircle = e.currentTarget.firstChild as HTMLElement;
          if (iconCircle) iconCircle.style.transform = "scale(1)";
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "14px", // Premium Apple squircle approximation
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "26px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05), inset 0 0 0 0.5px rgba(255, 255, 255, 0.4)",
            transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
            fontSize: "12px",
            fontWeight: 500,
            color: "#1d1d1f",
            letterSpacing: "-0.1px",
          }}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <div
      onClick={() => setShowTools(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.15)",
        backdropFilter: "blur(4px)",
        // Soft backdrop fade-in sequence natively embedded
        animation: "appleFadeIn 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards",
      }}
    >
      <style>{`
        @keyframes appleFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes appleScaleUp {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "320px",
          padding: "24px 20px",
          background: "rgba(245, 245, 247, 0.82)", // Pure native Apple platter tint
          backdropFilter: "blur(30px) saturate(210%)",
          WebkitBackdropFilter: "blur(30px) saturate(210%)",
          borderRadius: "28px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          rowGap: "24px",
          columnGap: "12px",
          border: "1px solid rgba(255, 255, 255, 0.6)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.02)",
          animation: "appleScaleUp 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards",
          boxSizing: "border-box"
        }}
      >
        <AppIconButton
          label="Simulator"
          icon="🎮"
          onClick={() => {
            setActiveTab("Simulator");
            setShowTools(false);
            addActivity("Launched Simulator", "🎮");
          }}
        />

        <AppIconButton
          label="Margins"
          icon="🧮"
          onClick={() => {
            setActiveTab("MarginCalculator");
            setShowTools(false);
            addActivity("Opened Margin Calc", "🧮");
          }}
        />

        <AppIconButton
          label="Trends"
          icon="📈"
          onClick={() => {
            setActiveTab("MarketTrends");
            setShowTools(false);
            addActivity("Checked Trends", "📈");
          }}
        />

        <AppIconButton
          label="Runway"
          icon="🔥"
          onClick={() => {
            setActiveTab("Runway");
            setShowTools(false);
            addActivity("Audited Cashflow", "🔥");
          }}
        />

        <AppIconButton
          label="Memories"
          icon="🧾"
          onClick={() => {
            setActiveTab("Memories");
            setShowTools(false);
            addActivity("Checked Memories", "📈");
          }}
        />
      </div>
    </div>
  );
};

export default ToolModal;
