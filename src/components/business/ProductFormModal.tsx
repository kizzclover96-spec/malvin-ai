import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera } from "lucide-react";
import { doc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "../../firebase";

/* ============================================================================
   ProductFormModal
   The real "add item" form for the Online Catalogue — built from whichever
   fields the business picked in CatalogueSetupWizard (picture, price, name,
   duration, description, discount, category, stock, variants). Only the
   fields they actually chose are shown; everything writes straight to
   business/{businessId}/products — matching both the storage.rules path
   (business/{businessId}/**, publicly readable) and the Firestore path
   BVinStore.tsx reads the storefront catalogue from. (Previously this
   wrote to a "b-vin/..." path that neither of those matched, which is
   why uploads got a 403 and saved products never appeared in-store.)
============================================================================ */

interface Props {
  open: boolean;
  onClose: () => void;
  businessId: string;
  fields: string[];
  accent: string;
}

const ProductFormModal: React.FC<Props> = ({ open, onClose, businessId, fields, accent }) => {
  const has = (k: string) => fields.includes(k);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [discount, setDiscount] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [variants, setVariants] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName(""); setPrice(""); setDuration(""); setDescription(""); setDiscount("");
    setCategory(""); setStock(""); setVariants(""); setFile(null); setPreview(""); setError(null);
  };

  const pickFile = (f: File | null) => { setFile(f); setPreview(f ? URL.createObjectURL(f) : ""); };

  const save = async () => {
    if (!name.trim() && has("name")) { setError("Give it a name first."); return; }
    setSaving(true);
    setError(null);
    try {
      let imageUrl = "";
      if (has("picture") && file) {
        const productId = `product_${Date.now()}`;
        const fileRef = storageRef(storage, `business/${businessId}/products/${productId}.jpg`);
        const snap = await uploadBytes(fileRef, file);
        imageUrl = await getDownloadURL(snap.ref);
      }
      const payload: Record<string, any> = { createdAt: serverTimestamp() };
      if (has("name")) payload.name = name.trim();
      if (has("price")) payload.price = Number(price) || 0;
      if (has("duration")) payload.duration = duration.trim();
      if (has("description")) payload.description = description.trim();
      if (has("discount")) payload.discount = Number(discount) || 0;
      if (has("category")) payload.category = category.trim();
      if (has("stock")) payload.stock = Number(stock) || 0;
      if (has("variants")) payload.variants = variants.split(",").map((v) => v.trim()).filter(Boolean);
      if (has("picture") && imageUrl) payload.imageUrl = imageUrl;

      await addDoc(collection(firestore, "business", businessId, "products"), payload);
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Couldn't save this item — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(20,20,22,0.32)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 420, maxHeight: "86vh", overflowY: "auto",
              background: "rgba(255,255,255,0.95)", backdropFilter: "blur(34px) saturate(180%)", WebkitBackdropFilter: "blur(34px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.8)", borderRadius: 28, padding: 26,
              boxShadow: "0 30px 80px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9)", color: "#1d1d1f", position: "relative",
            }}
          >
            <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "linear-gradient(150deg, #ffffff, #eef0f3)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
              <X size={14} />
            </button>

            <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 800 }}>Add to catalogue</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {has("picture") && (
                <button onClick={() => document.getElementById("bvin-product-file")?.click()} style={{ width: "100%", height: 110, borderRadius: 16, border: "1px dashed rgba(0,0,0,0.15)", background: preview ? `url(${preview}) center/cover` : "rgba(0,0,0,0.025)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {!preview && <Camera size={22} color="#999" />}
                </button>
              )}
              <input id="bvin-product-file" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => pickFile(e.target.files?.[0] || null)} />

              {has("name") && (
                <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="e.g. Cappuccino" /></Field>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                {has("price") && (
                  <Field label="Price (€)"><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} placeholder="0.00" /></Field>
                )}
                {has("discount") && (
                  <Field label="Discount (%)"><input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} style={inputStyle} placeholder="0" /></Field>
                )}
              </div>
              {has("duration") && (
                <Field label="Duration"><input value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle} placeholder="e.g. 30 min" /></Field>
              )}
              {has("description") && (
                <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: "none" }} placeholder="What makes this good?" /></Field>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                {has("category") && (
                  <Field label="Category"><input value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} placeholder="e.g. Drinks" /></Field>
                )}
                {has("stock") && (
                  <Field label="Stock"><input type="number" value={stock} onChange={(e) => setStock(e.target.value)} style={inputStyle} placeholder="0" /></Field>
                )}
              </div>
              {has("variants") && (
                <Field label="Variants / Sizes"><input value={variants} onChange={(e) => setVariants(e.target.value)} style={inputStyle} placeholder="Small, Medium, Large" /></Field>
              )}

              {error && <p style={{ fontSize: 12, color: "#c23a3a", margin: 0 }}>{error}</p>}

              <button onClick={save} disabled={saving} style={{ marginTop: 6, width: "100%", border: "none", borderRadius: 15, padding: "13px 20px", fontSize: 14, fontWeight: 800, color: "#fff", cursor: saving ? "default" : "pointer", background: accent, opacity: saving ? 0.6 : 1, boxShadow: saving ? "none" : `0 8px 20px ${accent}44` }}>
                {saving ? "Saving…" : "Save item"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ flex: 1 }}>
    <label style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, opacity: 0.5, display: "block", marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = { width: "100%", fontSize: 13.5, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.025)", color: "#1d1d1f", fontFamily: "inherit" };

export default ProductFormModal;