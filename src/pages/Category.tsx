import React from "react";

type Props = {
    // Expanded the type union here to handle the new selection action
    onSelect: (type: "food" | "fashion" | "explore" | "records") => void;
};

const Category: React.FC<Props> = ({ onSelect }) => {
    return (
        <div style={container}>
            <div style={wrapper}>

                {/* FOOD */}
                <div style={circleStyle} onClick={() => onSelect("food")}>
                    <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                        <circle cx="50" cy="50" r="24" stroke="white" strokeWidth="4" />
                        <circle cx="50" cy="50" r="14" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
                    </svg>
                    <span style={labelStyle}>Restaurant</span>
                </div>

                {/* FASHION */}
                <div style={circleStyle} onClick={() => onSelect("fashion")}>
                    <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                        <path
                            d="M35 20 L50 10 L65 20 L78 30 L70 45 L60 40 V85 H40 V40 L30 45 L22 30 Z"
                            stroke="white"
                            strokeWidth="4"
                            fill="none"
                        />
                    </svg>
                    <span style={labelStyle}>Fashion</span>
                </div>

                {/* EXPLORE */}
                <div style={circleStyle} onClick={() => onSelect("explore")}>
                    <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                        <path
                            d="M10 50 Q50 15 90 50 Q50 85 10 50"
                            stroke="white"
                            strokeWidth="4"
                        />
                        <circle cx="50" cy="50" r="10" fill="white" />
                        <circle cx="50" cy="50" r="4" fill="#0f172a" />
                    </svg>
                    <span style={labelStyle}>Explore</span>
                </div>

                {/* MALVIN RECORDS SYSTEM INTERFACE */}
                <div style={recordsCircleStyle} onClick={() => onSelect("records")}>
                    <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                        {/* Outer Vinyl Track Ring */}
                        <circle cx="50" cy="50" r="32" stroke="#E10600" strokeWidth="4" />
                        {/* Mid Grooves */}
                        <circle cx="50" cy="50" r="22" stroke="white" strokeWidth="2" strokeDasharray="6 4" />
                        <circle cx="50" cy="50" r="14" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                        {/* Center Center Spindle Hole */}
                        <circle cx="50" cy="50" r="4" fill="white" />
                    </svg>
                    <span style={labelStyle}>Malvin Records</span>
                </div>

            </div>
        </div>
    );
};

export default Category;

/* styles */
const container: React.CSSProperties = {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #1f2937 0%, #0f172a 45%, #020617 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
};

const wrapper: React.CSSProperties = {
    display: "flex",
    gap: "40px",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
};

const circleStyle: React.CSSProperties = {
    width: "220px",
    height: "220px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.15)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
};

// Specialized styling accent specifically for the premium Malvin Records node
const recordsCircleStyle: React.CSSProperties = {
    ...circleStyle,
    background: "rgba(225, 6, 0, 0.04)",
    border: "1px solid rgba(225, 6, 0, 0.25)",
};

const labelStyle: React.CSSProperties = {
    color: "white",
    marginTop: "16px",
    fontSize: "18px",
    fontWeight: 600,
};