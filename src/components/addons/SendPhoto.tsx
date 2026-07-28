import React, { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

import { firestore, storage } from "../../firebase";

interface SendPhotoProps {
  chatId: string;
  sender: "customer" | "brand";
  brandName?: string;
}

const SendPhoto = ({ chatId, sender, brandName = "Malvin" }: SendPhotoProps) => {

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const generatePreview = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                if (!ctx) {
                    reject("Canvas error");
                    return;
                }

                canvas.width = img.width;
                canvas.height = img.height;

                // Draw blurred image
                ctx.filter = "blur(8px)";
                ctx.drawImage(img, 0, 0);

                // Remove blur for text
                ctx.filter = "none";

                // Dark overlay
                ctx.fillStyle = "rgba(0,0,0,0.35)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Watermark
                ctx.fillStyle = "rgba(255,255,255,0.25)";
                ctx.font = "bold 48px Arial";
                ctx.textAlign = "center";

                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(-0.3);
                ctx.fillText("MALVIN PREVIEW", 0, 0);
                ctx.restore();

                canvas.toBlob(
                    (blob) => {
                    if (!blob) {
                        reject("Preview generation failed");
                        return;
                    }

                    resolve(blob);
                    },
                    "image/jpeg",
                    0.7
                );
            };

            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };


    const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
        setUploading(true);

        const photoId = uuidv4();

        const previewPath = `chatPhotos/${chatId}/${photoId}/preview.jpg`;
        const originalPath = `chatPhotos/${chatId}/${photoId}/original.jpg`;

        
        // upload original
        const previewBlob = await generatePreview(file);

        await uploadBytes(
            ref(storage, originalPath),
            file
        );

        await uploadBytes(
            ref(storage, previewPath),
            previewBlob
        );


        // SAVE MESSAGE (FIXED)
        await addDoc(
            collection(firestore, "conversations", chatId, "messages"),
            {
                
                type: "photo",
                sender,

                previewPath,
                originalPath,

                locked: true,

                brandName,
                timestamp: serverTimestamp()
            }
        );

        } catch (err) {
        console.error("Photo Upload Error:", err);
        } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <>
            <input
                hidden
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={uploadPhoto}
            />

            <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                style={{
                width: 45,
                height: 45,
                borderRadius: "50%",
                border: "none",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                fontSize: 18
                }}
            >
                {uploading ? "..." : "📷"}
            </button>
        </>
    );
};

export default SendPhoto;