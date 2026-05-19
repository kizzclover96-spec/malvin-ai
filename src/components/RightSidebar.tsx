import React from "react";
import ImageCycler from "./ImageCycler";
import { glassPanel } from "../styles/glass";

interface Activity {
  id: number;
  text: string;
  icon: string;
  time: string;
}

interface Props {
  activities: Activity[];
}

const ActivityPanel: React.FC<Props> = ({ activities }) => {
  return (
    <div
      className="Right-section"
      style={{
        flex: 1,
        borderRight: "1px solid #222",
        padding: "20px",
        gap: "10px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ color: "white" }}>Participants</div>

      <div
        className="Right-top-panel"
        style={{
          width: "200px",
          height: "100px",
          borderRight: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",

          /* --- THE GLASS LOOK --- */
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      ></div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div
          className="activities-panel"
          style={{
            padding: "20px",
            minHeight: "120px",
            maxHeight: "400px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            scrollbarWidth: "none",
          }}
        >
          <p
            style={{
              color: "white",
              margin: "0 0 15px 0",
              fontWeight: "400",
              opacity: 0.6,
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Activity Log
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {activities.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  animation: "fadeIn 0.3s ease-out",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{item.icon}</span>

                  <span
                    style={{
                      color: "white",
                      fontSize: "13px",
                      fontWeight: "500",
                    }}
                  >
                    {item.text}
                  </span>
                </div>

                <span
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontSize: "10px",
                  }}
                >
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="Right-panel"
        style={{
          flex: 2,
          padding: "15px",
          height: "100px",
          minHeight: "300px",
          flexDirection: "column",
          display: "flex",
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <p
          style={{
            fontSize: "12px",
            opacity: 0.6,
            marginBottom: "8px",
            paddingLeft: "5px",
            color: "white",
          }}
        >
          GALLERIA
        </p>

        {/* THE CYCLER GOES HERE */}
        <div
          style={{
            flex: 1,
            height: "300px",
            width: "100%",
            borderRadius: "14px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <ImageCycler interval={4000} />
        </div>
      </div>
    </div>
  );
};

export default ActivityPanel;