import React from "react";

import Settings from "./Settings";
import Memories from "./memories";
import MarginCalculator from "./MarginCalculator";
import Premium from "./Premium";
import MainDashboard from "./dashboard";
import MarketTrends from "./MarketTrends";
import Runway from "./Runway";
import Simulator from "./Simulator";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setShowTools: React.Dispatch<React.SetStateAction<boolean>>;
  addActivity: (text: string, icon?: string) => void;

  auth: any;
  userBrand: any;
  setUserBrand: (data: any) => void;
  setBrandData: (data: any) => void;
  history: any[];
  handleSaveSimulation: (data: any) => void;
  handleUpdateBrand: (data: any) => void;
  handleLogout: () => void;
  userEmail?: string;
}

const LeftPanel: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  setShowTools,
  addActivity,
  auth,
  userBrand,
  setUserBrand,
  setBrandData,
  history,
  handleSaveSimulation,
  handleUpdateBrand,
  handleLogout,
  userEmail,
}) => {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #222",
        padding: "20px",
        gap: "10px",
      }}
    >
      {/* HEADER */}
      <div style={{ color: "white", fontWeight: "bold" }}>
        {userEmail?.split("@")[0] || "Guest"}
      </div>

      {/* SIDEBAR BUTTONS */}
      <button onClick={() => setActiveTab("Session")}>⚡ Session</button>
      <button onClick={() => setActiveTab("Memories")}>🧠 Memories</button>
      <button onClick={() => setActiveTab("MainDashboard")}>📊 Dashboard</button>

      <button
        onClick={() => {
          setShowTools((p) => !p);
          addActivity("Opened Tools", "🛠️");
        }}
      >
        🛠 Tools
      </button>

      <button onClick={() => setActiveTab("Settings")}>⚙️ Settings</button>
      <button onClick={() => setActiveTab("Notes")}>📝 Notes</button>

      {/* MAIN ROUTER AREA */}
      <div style={{ marginTop: "20px", flex: 1 }}>
        {activeTab === "Settings" ? (
          <Settings
            auth={auth}
            userBrand={userBrand}
            setUserBrand={setUserBrand}
            onBack={() => setActiveTab("Session")}
            onUpdate={handleUpdateBrand}
            onSave={(updated: any) => {
              setUserBrand(updated);
              setBrandData(updated);
              setActiveTab("Session");
            }}
          />
        ) : activeTab === "Memories" ? (
          <Memories onBack={() => setActiveTab("Session")} data={history} />
        ) : activeTab === "Calculator" ? (
          <MarginCalculator onBack={() => setActiveTab("Session")} />
        ) : activeTab === "Premium" ? (
          <Premium onBack={() => setActiveTab("Session")} />
        ) : activeTab === "MainDashboard" ? (
          <MainDashboard
            onBack={() => setActiveTab("Session")}
            userBrand={userBrand}
            brandName={userBrand.name}
          />
        ) : activeTab === "Trends" ? (
          <MarketTrends
            userBrand={userBrand}
            brandName={userBrand.name}
            onBack={() => setActiveTab("Session")}
          />
        ) : activeTab === "Runway" ? (
          <Runway userBrand={userBrand} onBack={() => setActiveTab("Session")} />
        ) : activeTab === "Simulator" ? (
          <Simulator
            onBack={() => setActiveTab("Session")}
            onSave={handleSaveSimulation}
            brandName={userBrand.name}
          />
        ) : (
          <div style={{ color: "white" }}>Session Active</div>
        )}
      </div>

      {/* LOGOUT */}
      <button
        onClick={handleLogout}
        style={{
          marginTop: "auto",
          padding: "10px",
          background: "rgba(255,0,0,0.2)",
          color: "white",
          border: "1px solid red",
          borderRadius: "8px",
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default LeftPanel;