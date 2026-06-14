import React, { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";

import { firestore, storage } from "../firebase";

interface SendPhotoProps {
  chatId: string;
  sender: "customer" | "brand";
  brandName?: string;
}

const SendPhoto = ({ chatId, sender, brandName = "Malvin" }: SendPhotoProps) => {

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
        setUploading(true);

        const photoId = uuidv4();

        const previewPath = `chatPhotos/${chatId}/${photoId}/preview.jpg`;
        const originalPath = `chatPhotos/${chatId}/${photoId}/original.jpg`;

        // upload original
        await uploadBytes(ref(storage, originalPath), file);

        const imageUrl = await getDownloadURL(ref(storage, originalPath));

        // SAVE MESSAGE (FIXED)
        await addDoc(
            collection(firestore, "conversations", chatId, "messages"),
            {
            id: photoId,
            type: "photo",
            sender,
            imageUrl,
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