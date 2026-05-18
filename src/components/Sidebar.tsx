
import React from "react";

interface SidebarBtnProps {
  children: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}



interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setShowTools: React.Dispatch<React.SetStateAction<boolean>>;
  addActivity: (text: string, icon?: string) => void;
  userBrand: any;
  isPremium: boolean;
}
const StarIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFD700">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const SidebarBtn = ({
  children,
  label,
  isActive,
  onClick,
}: SidebarBtnProps) => (
  <button
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      padding: "10px 14px",
      borderRadius: "12px",
      color: "white",
      fontSize: "14px",
      gap: "12px",
      cursor: "pointer",
      width: "100%",
      border: isActive
        ? "1px solid #bf00ff"
        : "1px solid transparent",
      backgroundColor: isActive
        ? "rgba(191, 0, 255, 0.1)"
        : "transparent",
      boxShadow: isActive
        ? "0 0 15px rgba(191, 0, 255, 0.4)"
        : "none",
      transition: "all 0.2s ease",
    }}
  >
    {children}
    <span>{label}</span>
  </button>
);

const Sidebar = ({
  activeTab,
  setActiveTab,
  setShowTools,
  addActivity,
  userBrand,
  isPremium
}: SidebarProps)=> {
  return (
    <div
      className="left-section"
      style={{
        flex: 1,
        display: "flex",
        borderRight: "1px solid #222",
        padding: "20px",
        gap: "10px",
        flexDirection: "column",
      }}
    >
      <SidebarBtn
        label="Session"
        isActive={activeTab === "Session"}
        onClick={() => setActiveTab("Session")}
      >
        ⚡
      </SidebarBtn>

      <SidebarBtn
        label="Memories"
        isActive={activeTab === "Memories"}
        onClick={() => {
          setActiveTab("Memories");
          addActivity("Opened memories", "🧠");
        }}
      >
        🧠
      </SidebarBtn>

      <SidebarBtn
        label="Dashboard"
        isActive={activeTab === "Dashboard"}
        onClick={() => setActiveTab("MainDashboard")}
      >
        📊
      </SidebarBtn>

      <SidebarBtn
        label="Tools"
        isActive={activeTab === "Tools"}
        onClick={() => {
          setActiveTab("Tools");
          setShowTools((prev) => !prev);
          addActivity("Accessed Toolset", "🛠️");
        }}
      >
        🛠️
      </SidebarBtn>

      <div style={{ position: "relative", marginTop: "4px" }}>
        <button
          onClick={() => setActiveTab("Premium")}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "12px",
            border: "1px solid #FFD700",
            background: "rgba(255, 215, 0, 0.08)",
            color: "#FFD700",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          <StarIcon size={14} />
          Go Premium
        </button>
      </div>

      <SidebarBtn
        label="Settings"
        isActive={activeTab === "Settings"}
        onClick={() => {
          setActiveTab("Settings");
          addActivity("Settings", "⚙️");
        }}
      >
        ⚙️
      </SidebarBtn>

      <SidebarBtn
        label="Notes"
        isActive={activeTab === "Notes"}
        onClick={() => {
          setActiveTab("Notes");
          addActivity("Opened Notes", "📝");
        }}
      >
        📝
      </SidebarBtn>
    </div>
  );
};

export default Sidebar;
