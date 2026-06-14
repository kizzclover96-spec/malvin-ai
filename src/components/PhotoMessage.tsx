import React, { useEffect, useState } from "react";
import {
  ref,
  getDownloadURL
} from "firebase/storage";

import { storage } from "../firebase";

interface Props {
  msg: any;
}

const PhotoMessage = ({ msg }: Props) => {

  const [imageUrl, setImageUrl] =
    useState("");

  useEffect(() => {

    const loadImage = async () => {

      try {

        const path = msg.locked
          ? msg.previewPath
          : msg.originalPath;

        const url =
          await getDownloadURL(
            ref(storage, path)
          );

        setImageUrl(url);

      } catch (err) {

        console.error(
          "Image load failed",
          err
        );
      }
    };

    loadImage();

  }, [
    msg.previewPath,
    msg.originalPath,
    msg.locked
  ]);

  return (
    <div
      style={{
        maxWidth: 280
      }}
    >
      <img
        src={imageUrl}
        draggable={false}
        onContextMenu={(e) =>
          e.preventDefault()
        }
        className="protected-photo"
        style={{
          width: "100%",
          borderRadius: 16,
          userSelect: "none",
          pointerEvents: "auto",
          border:
            "1px solid rgba(255,255,255,.08)"
        }}
      />

      {msg.locked && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#C5FF41"
          }}
        >
          🔒 Preview Protected
        </div>
      )}

      {!msg.locked && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#38d777"
          }}
        >
          ✓ Original Unlocked
        </div>
      )}
    </div>
  );
};

export default PhotoMessage;