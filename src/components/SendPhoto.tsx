import React, { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import {
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  ref,
  uploadBytes
} from "firebase/storage";

import {
  firestore,
  storage
} from "../firebase";

interface SendPhotoProps {
  chatId: string;
  sender: "customer" | "brand";
  brandName?: string;
}

const SendPhoto = ({
  chatId,
  sender,
  brandName = "Malvin"
}: SendPhotoProps) => {

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [uploading, setUploading] =
    useState(false);

  const createPreview = (
    file: File
  ): Promise<Blob> => {

    return new Promise((resolve) => {

      const img = new Image();

      img.onload = () => {

        const canvas =
          document.createElement("canvas");

        canvas.width = img.width;
        canvas.height = img.height;

        const ctx =
          canvas.getContext("2d");

        if (!ctx) return;

        ctx.drawImage(
          img,
          0,
          0,
          canvas.width,
          canvas.height
        );

        ctx.save();

        ctx.translate(
          canvas.width / 2,
          canvas.height / 2
        );

        ctx.rotate(-0.5);

        ctx.font =
          "bold 48px Arial";

        ctx.fillStyle =
          "rgba(255,255,255,0.15)";

        ctx.textAlign = "center";

        ctx.fillText(
          `${brandName} PREVIEW`,
          0,
          0
        );

        ctx.restore();

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
          },
          "image/jpeg",
          0.7
        );
      };

      img.src =
        URL.createObjectURL(file);
    });
  };

  const uploadPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file =
      e.target.files?.[0];

    if (!file) return;

    try {

      setUploading(true);

      const photoId =
        uuidv4();

      const previewBlob =
        await createPreview(file);

      const previewPath =
        `chatPhotos/${chatId}/${photoId}/preview.jpg`;

      const originalPath =
        `chatPhotos/${chatId}/${photoId}/original.jpg`;

      await uploadBytes(
        ref(storage, previewPath),
        previewBlob
      );

      await uploadBytes(
        ref(storage, originalPath),
        file
      );

      await setDoc(
        doc(
          firestore,
          "conversations",
          chatId,
          "messages",
          photoId
        ),
        {
          id: photoId,

          type: "photo",

          sender,

          locked: true,

          previewPath,
          originalPath,

          brandName,

          createdAt:
            serverTimestamp()
        }
      );

    } catch (err) {

      console.error(
        "Photo Upload Error",
        err
      );

    } finally {

      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
        onClick={() =>
          fileInputRef.current?.click()
        }
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