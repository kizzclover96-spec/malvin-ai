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
    const [imageUrl, setImageUrl] = useState("");

    useEffect(() => {
        const loadImage = async () => {
            // Determine the target path based on status
            const path = msg.locked ? msg.previewPath : msg.originalPath;

            // 🌟 FIX: Safety Check! Prevent calling Firebase if path is empty/undefined
            if (!path) {
                console.warn("Skipping image fetch: Storage path is empty or undefined.");
                return;
            }

            try {
                const url = await getDownloadURL(ref(storage, path));
                setImageUrl(url);
            } catch (err) {
                console.error("Image load failed", err);
            }
        };

        loadImage();
    }, [msg.previewPath, msg.originalPath, msg.locked]);

    return (
        <div>
            {/* 1. Image and Overlay Container */}
            <div
                style={{
                    position: "relative",
                    maxWidth: 280
                }}
            >
                {/* Only render the img element if we actually have a valid resolved URL */}
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt="Chat attachment"
                        style={{
                            width: "100%",
                            borderRadius: 16,
                            display: "block"
                        }}
                    />
                )}

                {/* This disappears automatically when unlocked */}
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
                            fontWeight: 600
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
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: "inline-block",
                        marginTop: 8,
                        color: "#38d777",
                        fontSize: 14,
                        fontWeight: "600",
                        textDecoration: "none"
                    }}
                >
                    ⬇️ Download Original
                </a>
            )}
        </div>
    );
};

export default PhotoMessage;