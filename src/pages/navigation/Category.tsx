import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../../firebase";
import { ref, push, serverTimestamp, onValue } from "firebase/database";

type Props = {
  onSelect: (
    type: "food" | "fashion" | "explore" | "records" | "premium"
  ) => void;
  isPremium?: boolean;
  userBrand?: { id: string; name?: string; isPremium?: boolean };
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

const Category: React.FC<Props> = ({ onSelect, isPremium: isPremiumProp, userBrand: userBrandProp }) => {
  // Add these new state hooks:
  const [isVerified, setIsVerified] = useState(false);
  const [userBrandState, setUserBrandState] = useState<any>(userBrandProp || null);
  const [verificationPopup, setVerificationPopup] = useState(false);
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

  // Listen for user verification status
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const brandId = user.uid;
    const profileRef = ref(db, `users/${brandId}/profile`);

    setUserBrandState({ id: brandId, name: user.displayName || "UNKNOWN" });

    // Store previous premium state to catch the change moment
    let prevIsPremium: boolean | null = null;

    const unsub = onValue(profileRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIsVerified(!!data.isVerified);
        const currentIsPremium = !!data.isPremium;

        // 🚨 Webhook revoked premium (Transition from true -> false)
        if (prevIsPremium === true && currentIsPremium === false) {
          try {
            await push(ref(db, "verification_requests"), {
              uid: brandId,
              brandName: user.displayName || "UNKNOWN",
              email: user.email,
              status: "subscription_canceled",
              createdAt: serverTimestamp(),
              isPremium: false,
            });
            console.log("Cancellation request logged for admin.");
          } catch (err) {
            console.error("Failed to log cancellation:", err);
          }
        }

        prevIsPremium = currentIsPremium;
      }
    });

    return () => unsub();
  }, []);

  const isPremium = isPremiumProp ?? userBrandState?.isPremium ?? false;

  const getVerificationState = (): "verified" | "premium" | "locked" => {
    if (isVerified) return "verified";
    if (isPremium) return "premium";
    return "locked";
  };

  // Logic to send verification request to Firebase
  const requestVerification = async () => {
    const currentUserId = userBrandState?.id || auth.currentUser?.uid;
    if (!currentUserId) return;

    try {
      await push(ref(db, "verification_requests"), {
        uid: currentUserId,
        brandName: userBrandState?.name || "UNKNOWN",
        email: auth.currentUser?.email,
        status: "pending",
        createdAt: serverTimestamp(),
        isPremium: isPremium,
      });

      if (isPremium) {
        setVerificationPopup(true);
        setTimeout(() => setVerificationPopup(false), 6000);
      }
    } catch (err) {
      console.error("VERIFICATION WRITE FAILED:", err);
    }
  };

  const VerificationButton = ({
    state,
    onClick,
  }: {
    state: "premium" | "locked" | "verified";
    onClick?: () => void;
  }) => {
    const config = {
      premium: {
        text: "Request verification mark",
        bg: "rgba(255, 215, 0, 0.08)",
        color: "#FFD700",
        border: "1px solid rgba(255, 215, 0, 0.4)",
        glow: "0 0 15px rgba(255, 215, 0, 0.35)",
        cursor: "pointer",
        clickable: true,
      },
      locked: {
        text: "request verification mark",
        bg: "rgba(255,255,255,0.02)",
        color: "#444",
        border: "1px solid #222",
        glow: "none",
        cursor: "not-allowed",
        clickable: false,
      },
      verified: {
        text: "Verified",
        bg: "rgba(0, 140, 255, 0.08)",
        color: "#8ccfff",
        border: "1px solid rgba(0, 140, 255, 0.35)",
        glow: "0 0 12px rgba(0, 140, 255, 0.25)",
        cursor: "default",
        clickable: false,
      },
    };

    const c = config[state];

    return (
      <div
        onClick={c.clickable ? onClick : undefined}
        style={{
          padding: "6px 12px",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "1px",
          borderRadius: "12px",
          background: c.bg,
          color: c.color,
          border: c.border,
          cursor: c.cursor,
          boxShadow: c.glow,
          backdropFilter: "blur(10px)",
          transition: "0.3s ease",
          userSelect: "none",
          marginTop: "10px",
          display: "inline-block",
        }}
      >
        {c.text}
      </div>
    );
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

      

      {/* Toast confirmation */}
      {verificationPopup && (
        <div style={toastPopupStyle}>
          Verification request sent successfully!
        </div>
      )}

      {/* TOP RIGHT CONTROLS WRAPPER (PREMIUM + VERIFICATION BELOW IT) */}
      <div style={topRightControlsContainer}>
        <button ref={pillRef} style={premiumPillStyle} onClick={handlePremiumClick}>
          ✨ Premium
        </button>

        <VerificationButton
          state={getVerificationState()}
          onClick={() => {
            if (getVerificationState() === "premium") {
              requestVerification();
            }
          }}
        />
      </div>


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
// 1. Container that positions both buttons at top right stacked vertically
const topRightControlsContainer: React.CSSProperties = {
  position: "absolute",
  top: "24px",
  right: "24px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end", // or "center" if you want the verification pill centered under Premium
  gap: "6px",
  zIndex: 100,
};

const premiumPillStyle: React.CSSProperties = {
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
  // Note: remove position: "absolute", top, and right from here because topRightControlsContainer handles positioning now
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

const toastPopupStyle: React.CSSProperties = {
  position: "fixed",
  top: "20px",
  background: "#111",
  color: "#FFD700",
  border: "1px solid #FFD700",
  borderRadius: "12px",
  padding: "10px 16px",
  fontSize: "12px",
  fontWeight: 700,
  zIndex: 10000,
};