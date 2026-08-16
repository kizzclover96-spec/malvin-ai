import React from "react";

/* ============================================================================
   OfferSticker — the visual for the "Special Offers" tool. One shared
   component so the dashboard's design picker, the dashboard's bento
   preview, and the customer store's entry splash all render the exact
   same sticker from the exact same data, instead of three copies that
   could drift apart.
============================================================================ */

export type OfferStickerDesign = "burst" | "flyer" | "circle" | "ribbon" | "tag";

export interface SpecialOfferData {
  design: OfferStickerDesign;
  headline: string;
  originalPrice: string;
  offerPrice: string;
  active: boolean;
  updatedAt?: number;
}

export const DEFAULT_SPECIAL_OFFER: SpecialOfferData = {
  design: "burst",
  headline: "",
  originalPrice: "",
  offerPrice: "",
  active: true,
};

export const OFFER_STICKER_DESIGNS: { key: OfferStickerDesign; label: string }[] = [
  { key: "burst", label: "Starburst" },
  { key: "flyer", label: "Bold Flyer" },
  { key: "circle", label: "Badge" },
  { key: "ribbon", label: "Ribbon" },
  { key: "tag", label: "Price Tag" },
];

/** N-spike star/burst clip-path, computed so it stays crisp at any size. */
function burstPoints(spikes: number, outerR: number, innerR: number): string {
  const pts: string[] = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2;
    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);
    pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  return pts.join(", ");
}

const RIBBON_CLIP = "polygon(6% 0%, 94% 0%, 100% 50%, 94% 100%, 6% 100%, 0% 50%)";
const TAG_CLIP = "polygon(24% 0%, 100% 0%, 100% 100%, 24% 100%, 0% 50%)";
const FLYER_CLIP = "polygon(0% 4%, 4% 0%, 96% 0%, 100% 4%, 100% 96%, 96% 100%, 4% 100%, 0% 96%)";

function shade(hex: string, percent: number): string {
  const clean = (hex || "#4F9CF9").replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  if (Number.isNaN(num)) return hex;
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const amt = Math.round(2.55 * percent);
  r = Math.min(255, Math.max(0, r + amt));
  g = Math.min(255, Math.max(0, g + amt));
  b = Math.min(255, Math.max(0, b + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export interface OfferStickerProps {
  design: OfferStickerDesign;
  headline: string;
  originalPrice: string;
  offerPrice: string;
  accent: string;
  size?: number;
}

export const OfferSticker: React.FC<OfferStickerProps> = ({ design, headline, originalPrice, offerPrice, accent, size = 180 }) => {
  const base: React.CSSProperties = {
    width: size,
    height: size,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: size * 0.14,
    color: "#fff",
    fontFamily: "'Fraunces', Inter, sans-serif",
    position: "relative",
    boxShadow: "0 14px 34px rgba(0,0,0,0.25)",
    boxSizing: "border-box",
  };

  const headlineStyle: React.CSSProperties = {
    fontSize: Math.max(9, size * 0.075),
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    opacity: 0.92,
    lineHeight: 1.15,
    marginBottom: size * 0.03,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  };
  const originalStyle: React.CSSProperties = {
    fontSize: Math.max(8, size * 0.085),
    fontWeight: 600,
    opacity: 0.75,
    textDecoration: "line-through",
    textDecorationThickness: "2px",
    marginBottom: size * 0.01,
  };
  const offerStyle: React.CSSProperties = { fontSize: Math.max(12, size * 0.19), fontWeight: 900, lineHeight: 1 };

  let shapeStyle: React.CSSProperties = base;
  let rotate = 0;
  let width = size;

  switch (design) {
    case "burst":
      shapeStyle = { ...base, background: `radial-gradient(circle at 35% 30%, ${shade(accent, 8)}, ${shade(accent, -18)})`, clipPath: `polygon(${burstPoints(14, 50, 39)})` };
      break;
    case "flyer":
      shapeStyle = { ...base, background: accent, clipPath: FLYER_CLIP, border: "3px solid rgba(255,255,255,0.85)" };
      rotate = -4;
      break;
    case "circle":
      shapeStyle = { ...base, background: `linear-gradient(155deg, ${shade(accent, 12)}, ${shade(accent, -22)})`, borderRadius: "50%", border: "4px solid rgba(255,255,255,0.9)" };
      break;
    case "ribbon":
      width = size * 1.18;
      shapeStyle = { ...base, width, background: accent, clipPath: RIBBON_CLIP };
      rotate = -3;
      break;
    case "tag":
      shapeStyle = { ...base, background: `linear-gradient(160deg, ${shade(accent, 10)}, ${shade(accent, -20)})`, clipPath: TAG_CLIP, paddingLeft: size * 0.24 };
      break;
  }

  return (
    <div style={{ display: "inline-block", transform: `rotate(${rotate}deg)` }}>
      <div style={shapeStyle}>
        {design === "tag" && (
          <span
            style={{
              position: "absolute", top: "18%", left: "32%",
              width: size * 0.07, height: size * 0.07, borderRadius: "50%",
              background: "rgba(255,255,255,0.85)", boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.15)",
            }}
          />
        )}
        {headline && <div style={headlineStyle}>{headline}</div>}
        {originalPrice && <div style={originalStyle}>{originalPrice}</div>}
        <div style={offerStyle}>{offerPrice || "—"}</div>
      </div>
    </div>
  );
};
