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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ACTIVITY LOG */}
      <div style={{ ...glassPanel, padding: "20px", maxHeight: "350px", overflowY: "auto" }}>
        <p style={{ color: "white", opacity: 0.6, fontSize: "12px" }}>
          Activity Log
        </p>

        {activities.map((item) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <span>{item.icon}</span>
              <span style={{ color: "white", fontSize: "13px" }}>{item.text}</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px" }}>
              {item.time}
            </span>
          </div>
        ))}
      </div>

      {/* IMAGE CYCLER */}
      <div style={{ ...glassPanel, padding: "15px" }}>
        <p style={{ color: "white", fontSize: "12px", opacity: 0.6 }}>
          GALLERIA
        </p>

        <div style={{ height: "250px", borderRadius: "12px", overflow: "hidden" }}>
          <ImageCycler interval={4000} />
        </div>
      </div>
    </div>
  );
};

export default ActivityPanel;