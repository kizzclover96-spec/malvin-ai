import React, { useState, useEffect } from "react";

const images = [
  "/AI Chip with Rainbow Glow~Bold, bright, and….png",
  "/Download.png",
  "/Zootopia 4K Wallpaper.png",
  "/Malvin self.png"
];

interface ImageCyclerProps {
  interval?: number;
}

const ImageCycler = ({ interval = 3000 }: ImageCyclerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0%); }
        }
      `}</style>

      <div
        key={currentIndex}
        style={{
          width: "100%",
          height: "100%",
          backgroundImage: `url("${encodeURI(images[currentIndex])}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          animation:
            "slideLeft 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
          position: "absolute",
          inset: 0,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, transparent, rgba(0,0,0,0.4))",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export default ImageCycler;