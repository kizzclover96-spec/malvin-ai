import React, { useState, useEffect, useRef } from "react";

type Props = {
  // Updated type union signature to support passing premium state parameters
  onSelect: (
    type: "food" | "fashion" | "explore" | "records" | "premium"
  ) => void;
};

interface StarParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  rotation?: number;
  rotationSpeed?: number;
}

const Category: React.FC<Props> = ({ onSelect }) => {
  const [stars, setStars] = useState<StarParticle[]>([]);
  const lastSpawnTime = useRef<number>(Date.now());
  const pillRef = useRef<HTMLButtonElement>(null);

  // 1. Animation frame effect cycle to calculate cascading falling physics configurations
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setStars((prevStars) =>
        prevStars
          .map((star) => ({
            ...star,
            x: star.x + star.speedX,
            y: star.y + star.speedY,
            speedY: star.speedY + 0.08, // Simulate natural gravity pulls (lighter)
            opacity: star.opacity - 0.012, // Faster fade
            rotation: (star.rotation || 0) + (star.rotationSpeed || 0),
          }))
          // Filter down elements to automatically clean out expired components
          .filter((star) => star.opacity > 0 && star.y < window.innerHeight)
      );

      // 2. Continuous Passive "Waterfall" spawn logic (even without click)
      const now = Date.now();
      if (pillRef.current && now - lastSpawnTime.current > 400) {
        // Spawn interval (e.g., every 400ms)
        const rect = pillRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          // ensure rect is valid
          // Spawn position range within the width of the pill
          const spawnX = rect.left + 20 + Math.random() * (rect.width - 40);
          const spawnY = rect.bottom;

          const passiveStar: StarParticle = {
            id: Date.now() + Math.random(),
            x: spawnX,
            y: spawnY,
            size: Math.random() * 8 + 8,
            speedX: (Math.random() - 0.5) * 0.8, // minimal sideways drift
            speedY: Math.random() * 1.5 + 0.5, // Slow downwards drift
            opacity: Math.random() * 0.5 + 0.5, // starts at 0.5-1.0
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 2,
          };

          setStars((prev) => [...prev, passiveStar]);
          lastSpawnTime.current = now;
        }
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [stars]);

  // 3. handle tap bursts explicitly for user-triggered "active" effects
  const handlePremiumClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Trigger parent state routine
    onSelect("premium");

    // Obtain strict coordinates to position origin particles
    const rect = e.currentTarget.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.bottom;

    // Generate burst particle sequence (more energetic than passive)
    const newParticles: StarParticle[] = Array.from({ length: 16 }).map(
      (_, i) => ({
        id: Date.now() + i + Math.random(),
        x: originX,
        y: originY,
        size: Math.random() * 14 + 10,
        speedX: (Math.random() - 0.5) * 8, // Left-right variance vectors
        speedY: Math.random() * -6 - 3, // Initial upwards force burst vector
        opacity: 1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      })
    );

    setStars((prev) => [...prev, ...newParticles]);
  };

  return (
    <div style={container}>
      {/* 🌟 STARS PARTICLES CANVAS GENERATION MUXER */}
      <div style={particlesContainer}>
        {stars.map((star) => (
          <span
            key={star.id}
            style={{
              position: "absolute",
              left: star.x,
              top: star.y,
              fontSize: `${star.size}px`,
              opacity: star.opacity,
              color: "#FFD700",
              pointerEvents: "none",
              transform: `translate(-50%, -50%) rotate(${star.rotation || 0}deg)`,
              textShadow: "0 0 8px rgba(255, 215, 0, 0.6)",
              transition: "opacity 0.2s linear",
              zIndex: 9999,
            }}
          >
            ★
          </span>
        ))}
      </div>

      {/* 👑 FLOATING PREMIUM BADGE ACCENT */}
      <button ref={pillRef} style={premiumPillStyle} onClick={handlePremiumClick}>
        ✨ Premium
      </button>

      <div style={wrapper}>
        {/* FOOD */}
        <div style={circleStyle} onClick={() => onSelect("food")}>
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="24" stroke="white" strokeWidth="4" />
            <circle
              cx="50"
              cy="50"
              r="14"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="3"
            />
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
            <circle cx="50" cy="50" r="32" stroke="#E10600" strokeWidth="4" />
            <circle
              cx="50"
              cy="50"
              r="22"
              stroke="white"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <circle
              cx="50"
              cy="50"
              r="14"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
            />
            <circle cx="50" cy="50" r="4" fill="white" />
          </svg>
          <span style={labelStyle}>Malvin Records</span>
        </div>
      </div>
    </div>
  );
};

export default Category;

/* Styles */
const container: React.CSSProperties = {
  position: "relative",
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, #1f2937 0%, #0f172a 45%, #020617 100%)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
};

// 🟢 Golden Premium Button Style Overlay Map
const premiumPillStyle: React.CSSProperties = {
  position: "absolute",
  top: "24px",
  right: "24px",
  background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
  border: "2px solid #FFF",
  color: "#020617",
  padding: "8px 20px",
  borderRadius: "9999px",
  fontWeight: "800",
  fontSize: "13px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  cursor: "pointer",
  boxShadow:
    "0 4px 15px rgba(255, 215, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  transition: "transform 0.1s ease, box-shadow 0.2s ease",
  zIndex: 100,
};

const particlesContainer: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  zIndex: 999,
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