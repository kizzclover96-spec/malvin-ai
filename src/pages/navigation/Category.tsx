import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../../firebase";
import { ref, push, serverTimestamp, onValue } from "firebase/database";
import PremiumMemberPanel from "../../components/addons/PremiumMemberPanel";
import { resolvePremiumFlag } from "../../hooks/useAccountStanding";

type Props = {
  onSelect: (
    type: "food" | "fashion" | "explore" | "hotel" | "records" | "mechanic" | "service" | "premium"
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
  const [isPremiumState, setIsPremiumState] = useState(false);
  const [userBrandState, setUserBrandState] = useState<any>(userBrandProp || null);
  const [verificationPopup, setVerificationPopup] = useState(false);
  const [memberPanelOpen, setMemberPanelOpen] = useState(false);
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
    // A subscriber must never be shown the sales page again. The gold pill
    // routes to the upsell; the blue "Premiumed" pill opens the member panel
    // instead, which is where managing or cancelling actually lives.
    if (isPremium) {
      setMemberPanelOpen(true);
    } else {
      onSelect("premium");
    }

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
    // Listens at the user ROOT, not users/{uid}/profile. Premium lives at
    // users/{uid}/tier — that's what the backend mints the `premium` custom
    // claim from — while the old code read profile.isPremium, a field nothing
    // ever writes. That's why the pill never switched to its premium state
    // no matter what the account had paid for.
    const userRef = ref(db, `users/${brandId}`);

    setUserBrandState({ id: brandId, name: user.displayName || "UNKNOWN" });

    // Store previous premium state to catch the change moment
    let prevIsPremium: boolean | null = null;

    const unsub = onValue(userRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIsVerified(!!(data.profile?.isVerified || data.isVerified));
        const currentIsPremium = resolvePremiumFlag(data);
        setIsPremiumState(currentIsPremium);

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

  const isPremium = isPremiumProp ?? isPremiumState;

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
              // Falls from the pill, so it tracks the pill's colour.
              color: isPremium ? "#4F7CFF" : "#FFD700",
              pointerEvents: "none",
              transform: `translate(-50%, -50%) rotate(${star.rotation || 0}deg)`,
              textShadow: isPremium
                ? "0 0 8px rgba(79, 124, 255, 0.65)"
                : "0 0 8px rgba(255, 215, 0, 0.6)",
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
        <button
          ref={pillRef}
          style={isPremium ? premiumedPillStyle : premiumPillStyle}
          onClick={handlePremiumClick}
        >
          {isPremium ? "◆ Premiumed" : "✨ Premium"}
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

      {memberPanelOpen && (
        <PremiumMemberPanel
          isVerified={isVerified}
          onClose={() => setMemberPanelOpen(false)}
          onRequestVerification={() => {
            requestVerification();
            setMemberPanelOpen(false);
          }}
        />
      )}

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

        {/* HOTEL */}
        <div style={circleStyle} onClick={() => onSelect("hotel")}>
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
            <rect x="20" y="38" width="60" height="42" rx="3" stroke="white" strokeWidth="4" />
            <path d="M20 38 L50 18 L80 38" stroke="white" strokeWidth="4" strokeLinejoin="round" />
            <rect x="32" y="52" width="14" height="14" stroke="rgba(255,255,255,0.7)" strokeWidth="3" />
            <rect x="54" y="52" width="14" height="14" stroke="rgba(255,255,255,0.7)" strokeWidth="3" />
            <rect x="44" y="70" width="12" height="10" stroke="rgba(255,255,255,0.7)" strokeWidth="3" />
          </svg>
          <span style={labelStyle}>Hotel</span>
        </div>

        {/* MECHANIC */}
        <div style={circleStyle} onClick={() => onSelect("mechanic")}>
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
            {/* Wrench icon */}
            <path
              d="M30 70 L60 40 M55 35 C50 30 50 20 60 15 C65 20 75 20 80 25 C85 30 85 40 80 45 C75 50 65 50 60 45 Z"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="30" cy="70" r="6" stroke="white" strokeWidth="4" />
          </svg>
          <span style={labelStyle}>Mechanic</span>
        </div>

        {/* SERVICES — the generic workspace for trades (plumbing,
            electrical, cleaning, etc). One dashboard, branded per-business
            by whichever categories get picked in Settings.
            Icon is a clipboard + checkmark ("job list / work order"),
            deliberately nothing like the Mechanic wrench so the two tiles
            never get confused at a glance. */}
        <div style={circleStyle} onClick={() => onSelect("service")}>
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
            {/* Clipboard body */}
            <rect x="26" y="22" width="48" height="60" rx="6" stroke="white" strokeWidth="4" />
            {/* Clip at the top */}
            <rect x="40" y="16" width="20" height="12" rx="3" fill="white" />
            {/* Checklist lines */}
            <line x1="36" y1="46" x2="52" y2="46" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round" />
            <line x1="36" y1="58" x2="52" y2="58" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round" />
            <line x1="36" y1="70" x2="48" y2="70" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round" />
            {/* Checkmark badge, bottom-right */}
            <circle cx="66" cy="70" r="14" fill="#22C55E" />
            <path d="M60 70 L64.5 74.5 L73 65" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span style={labelStyle}>Services</span>
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

// `fixed`, not `absolute`. Absolute pinned these to the top of the category
// container, so on a short screen — or once the grid wraps to several rows —
// they scrolled away with the content. Fixed keeps them against the viewport.
// The safe-area inset stops them landing under a notch on iOS.
const topRightControlsContainer: React.CSSProperties = {
  position: "fixed",
  top: "max(24px, env(safe-area-inset-top))",
  right: "24px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
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
};

// The subscriber's version of the pill: purple → blue instead of gold, so
// the state is readable at a glance without opening anything.
const premiumedPillStyle: React.CSSProperties = {
  ...premiumPillStyle,
  background: "linear-gradient(135deg, #8B5CF6 0%, #2563EB 55%, #00C2FF 100%)",
  border: "2px solid rgba(255,255,255,0.85)",
  color: "#FFFFFF",
  boxShadow:
    "0 4px 16px rgba(79, 124, 255, 0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
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