import React, { useState } from "react";

import Settings from "./Settings";
import Memories from "./memories";
import MarginCalculator from "./MarginCalculator";
import Premium from "./Premium";
import MarketTrends from "./MarketTrends";
import Runway from "./Runway";
import Simulator from "./Simulator";
import ToolModal from "./ToolModal";

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

const premiumGold = "#FFD700";

const btnReset: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  outline: "none",
};
const cyberButton: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "14px",
  border: "1px solid rgba(180, 120, 255, 0.15)",
  background: "rgba(255,255,255,0.03)",
  color: "white",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "1px",
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.25s ease",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  position: "relative",
  overflow: "hidden",
};
const GlobalStyles = () => (
  <style>{`
    @keyframes goldGlow { 
      0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.4); } 
      50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.5); border-color: #FFD700; }
    }

    @keyframes twinkle { 
      0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); } 
      50% { opacity: 1; transform: scale(1.2) rotate(15deg); }
    }
  `}</style>
);

const StarIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={premiumGold}
    stroke={premiumGold}
    strokeWidth="1"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

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
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div>
      <GlobalStyles />

      

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            overflow: "hidden",
            border: "1.5px solid #bf00ff",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="/Malvin self.png"
            alt="Malvin AI"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <span
          style={{
            color: "white",
            fontWeight: "800",
            letterSpacing: "2px",
            fontSize: "18px",
            fontFamily: "sans-serif",
          }}
        >
          MALVIN
        </span>
      </div>

      
      {/* SIDEBAR BUTTONS */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginTop: "10px",
          width: "92%",
          minHeight: "420px",
        }}
      >
        {[
          { label: "🛠 Tools", tab: "ToolModal" },
          { label: "⚙️ Settings", tab: "Settings" },
          { label: "📝 Notes", tab: "Notes" },
          
        ].map((item) => (
          <button
            key={item.tab}
            onClick={() => {
              setActiveTab(item.tab);

              if (item.tab === "ToolModal") {
                setShowTools((p) => !p);
                addActivity("Opened Tools", "🛠️");
              }
            }}
            style={{
              ...cyberButton,

              border:
                activeTab === item.tab
                  ? "1px solid rgba(180,120,255,0.7)"
                  : "1px solid rgba(255,255,255,0.08)",

              boxShadow:
                activeTab === item.tab
                  ? `
                    0 0 10px rgba(191,0,255,0.45),
                    0 0 20px rgba(0,140,255,0.18),
                    inset 0 0 20px rgba(255,0,180,0.08)
                  `
                  : "none",

              background:
                activeTab === item.tab
                  ? "linear-gradient(135deg, rgba(80,0,120,0.25), rgba(0,80,255,0.12))"
                  : "rgba(255,255,255,0.03)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateX(4px)";
              e.currentTarget.style.border =
                "1px solid rgba(180,120,255,0.9)";

              e.currentTarget.style.boxShadow = `
                0 0 12px rgba(191,0,255,0.55),
                0 0 22px rgba(0,140,255,0.22),
                inset 0 0 25px rgba(255,0,180,0.08)
              `;

              e.currentTarget.style.background =
                "linear-gradient(135deg, rgba(90,0,120,0.22), rgba(0,90,255,0.12))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateX(0px)";

              e.currentTarget.style.boxShadow =
                activeTab === item.tab
                  ? `
                    0 0 10px rgba(191,0,255,0.45),
                    0 0 20px rgba(0,140,255,0.18),
                    inset 0 0 20px rgba(255,0,180,0.08)
                  `
                  : "none";

              e.currentTarget.style.background =
                activeTab === item.tab
                  ? "linear-gradient(135deg, rgba(80,0,120,0.25), rgba(0,80,255,0.12))"
                  : "rgba(255,255,255,0.03)";

              e.currentTarget.style.border =
                activeTab === item.tab
                  ? "1px solid rgba(180,120,255,0.7)"
                  : "1px solid rgba(255,255,255,0.08)";
            }}
          >
            {item.label}
          </button>
        ))}
        {/* PREMIUM BUTTON */}
      <div
        style={{
          position: "relative",
          marginTop: "4px",
          width: "100%",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-6px",
            left: "-6px",
            zIndex: 10,
            animation: "twinkle 2s infinite",
          }}
        >
          <StarIcon size={12} />
        </div>

        <button
          onClick={() => setActiveTab("Premium")}
          style={{
            ...btnReset,
            display: "flex",
            alignItems: "center",
            width: "100%",
            padding: "10px 14px",
            borderRadius: "12px",
            cursor: "pointer",
            background: "rgba(255, 215, 0, 0.08)",
            border: "1px solid #FFD700",
            color: "#FFD700",
            fontSize: "10px",
            fontWeight: "900",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            animation: "goldGlow 3s infinite",
            gap: "12px",
          }}
        >
          <StarIcon size={14} />
          <span>Go Premium</span>
        </button>
      </div>
      </div>
      
      
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          height: "100%",
        }}
      >
        <div
          className="left buttom-panel"
          style={{
            borderRight: "1px solid rgba(255, 255, 255, 0.1)",
            padding: "20px",
            flexDirection: "column",
            display: "flex",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div
            style={{
              width: "45px",
              height: "45px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "1.5px solid #bf00ff",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            }}
          >
            <img
              src="/Malvin self.png"
              alt="Malvin AI"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>

          <p
            style={{
              color: "white",
              margin: 0,
              fontWeight: "600",
            }}
          >
            Malvin AI
          </p>

          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "12px",
              margin: "5px 0 0 0",
            }}
          >
            Your intelligent collaborator partner
          </p>
        </div>

        {/* USER PANEL */}
        <div
          style={{
            position: "relative",
            width: "100%",
            marginTop: "auto",
          }}
        >
          {showUserMenu && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: "0",
                right: "0",
                marginBottom: "10px",
                backgroundColor: "rgba(15, 15, 15, 0.95)",
                backdropFilter: "blur(20px)",
                borderRadius: "12px",
                padding: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                zIndex: 100,
              }}
            >
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "rgba(255, 59, 48, 0.15)",
                  border: "1px solid rgba(255, 59, 48, 0.3)",
                  borderRadius: "8px",
                  color: "#ff3b30",
                  fontSize: "11px",
                  fontWeight: "800",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                LOG OUT
              </button>
            </div>
          )}

          <div
            className="left-user-panel"
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              padding: "15px 20px",
              flexDirection: "column",
              display: "flex",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              backdropFilter: "blur(12px)",
              borderRadius: "16px",
              border: showUserMenu
                ? "1px solid #bf00ff"
                : "1px solid rgba(255, 255, 255, 0.1)",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              {userEmail?.split("@")[0] || "Guest User"}
            </div>

            <div
              style={{
                color: "white",
                fontSize: "11px",
                opacity: 0.4,
                marginTop: "4px",
              }}
            >
              {userEmail}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default LeftPanel;