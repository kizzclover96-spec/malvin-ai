import React from "react";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setShowTools: React.Dispatch<React.SetStateAction<boolean>>;
  addActivity: (text: string, icon?: string) => void;
}

const Sidebar = ({ activeTab, setActiveTab, setShowTools, addActivity }: Props) => {
  const Btn = ({ label, icon, tab }: any) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        addActivity(`Opened ${label}`, icon);
      }}
      style={{
        padding: "10px",
        color: "white",
        width: "100%",
        borderRadius: "10px",
        background: activeTab === tab ? "rgba(191,0,255,0.2)" : "transparent",
        border: "1px solid rgba(255,255,255,0.1)",
        marginBottom: "8px",
      }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
      <Btn label="Session" icon="⚡" tab="Session" />
      <Btn label="Memories" icon="🧠" tab="Memories" />
      <Btn label="Dashboard" icon="📊" tab="MainDashboard" />

      <button
        onClick={() => setShowTools((p) => !p)}
        style={{ marginTop: "10px", color: "#FFD700" }}
      >
        🛠 Tools
      </button>

      <Btn label="Settings" icon="⚙️" tab="Settings" />
      <Btn label="Notes" icon="📝" tab="Notes" />
    </div>
  );
};

export default Sidebar;
