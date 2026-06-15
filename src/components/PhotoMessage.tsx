import React, { useEffect, useState } from "react";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

interface Props {
  msg: any;
}

const PhotoMessage = ({ msg }: Props) => {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (!msg || (!msg.previewPath && !msg.originalPath)) return;

    const loadImage = async () => {
      const path = msg.locked ? msg.previewPath : msg.originalPath;
      if (!path) return;

      try {
        const url = await getDownloadURL(ref(storage, path));
        setImageUrl(url);
      } catch (err) {
        console.error("Image load failed", err);
      }
    };

    loadImage();
  }, [msg, msg.locked]);

  // 🌟 FIX: Force file download using Blob fetch
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault(); // Stop the default anchor behavior (opening new tab)
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create a temporary local URL for the blob data
      const localUrl = window.URL.createObjectURL(blob);
      
      // Create a hidden link, click it programmatically, then clean up
      const link = document.createElement("a");
      link.href = localUrl;
      link.download = `photo-${msg.id || "download"}.png`; // Set default filename
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(localUrl);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: open in new tab if the blob fetch fails (e.g., due to CORS configuration)
      window.open(imageUrl, "_blank");
    }
  };

  return (
    <div>
      {/* 1. Image and Overlay Container */}
      <div style={{ position: "relative", maxWidth: 280 }}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Chat attachment"
            style={{ width: "100%", borderRadius: 16, display: "block" }}
          />
        )}

        {msg.locked && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,.45)",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            🔒 Protected Preview
          </div>
        )}
      </div>

      {/* 2. Download Button */}
      {!msg.locked && imageUrl && (
        <a
          href={imageUrl}
          onClick={handleDownload} // 🌟 Intercept click with our download handler
          style={{
            display: "inline-block",
            marginTop: 8,
            color: "#38d777",
            fontSize: 14,
            fontWeight: "600",
            textDecoration: "none",
            cursor: "pointer"
          }}
        >
          ⬇️ Download Original
        </a>
      )}
    </div>
  );
};

export default PhotoMessage;