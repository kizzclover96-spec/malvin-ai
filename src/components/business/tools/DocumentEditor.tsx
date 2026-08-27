import React, { useEffect, useRef, useState, useCallback } from "react";
import { jsPDF } from "jspdf";
import {
  saveLocal, getLocal, scheduleFirestoreSync, flushFirestoreSync, fetchFromFirestore,
  STORE_DOCUMENTS,
} from "../../../utils/localFirstStore";
import {
  ChevronLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link2, Image as ImageIcon, Paperclip, Download, Check, Palette,
} from "lucide-react";

interface DocRecord {
  id: string;
  title: string;
  folder: string;
  url: string;
  contentHtml: string;
  updatedAt?: number;
}

const FONT_SIZES = [
  { label: "Small", px: "13px" },
  { label: "Normal", px: "16px" },
  { label: "Medium", px: "20px" },
  { label: "Large", px: "28px" },
  { label: "Huge", px: "36px" },
];

const FONT_FAMILIES = ["-apple-system, sans-serif", "Georgia, serif", "'Courier New', monospace", "'Times New Roman', serif"];

const TOOLBAR_COLORS = ["#0F172A", "#EF4444", "#F59E0B", "#16A34A", "#2563EB", "#7C3AED"];

const ToolbarBtn: React.FC<{ onClick: () => void; active?: boolean; title: string; children: React.ReactNode }> = ({ onClick, active, title, children }) => (
  <button
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
    style={{
      width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
      background: active ? "#DBE6FF" : "transparent", color: active ? "#2563EB" : "#334155",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}
  >
    {children}
  </button>
);

const DocumentEditor: React.FC<{ businessId: string; docId: string; title: string; folder: string; url: string; onBack: () => void }> = ({ businessId, docId, title: initialTitle, folder, url, onBack }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const loadedRef = useRef(false);

  const persist = useCallback((html: string, newTitle: string) => {
    const record: DocRecord = { id: docId, title: newTitle, folder, url, contentHtml: html };
    saveLocal(STORE_DOCUMENTS, record).catch(() => {});
    setSaveState("saving");
    scheduleFirestoreSync(businessId, "bizDocuments", docId, record, 1500);
    setTimeout(() => setSaveState("saved"), 1600);
  }, [businessId, docId, folder, url]);

  useEffect(() => {
    (async () => {
      const local = await getLocal<DocRecord>(STORE_DOCUMENTS, docId).catch(() => null);
      if (local?.contentHtml !== undefined) {
        if (editorRef.current) editorRef.current.innerHTML = local.contentHtml;
        if (local.title) setTitle(local.title);
      } else {
        const remote = await fetchFromFirestore<DocRecord>(businessId, "bizDocuments", docId).catch(() => null);
        if (remote?.contentHtml && editorRef.current) editorRef.current.innerHTML = remote.contentHtml;
        if (remote?.title) setTitle(remote.title);
      }
      loadedRef.current = true;
    })();
  }, [businessId, docId]);

  const onEditorInput = () => {
    if (!loadedRef.current || !editorRef.current) return;
    setSaveState("unsaved");
    persist(editorRef.current.innerHTML, title);
  };

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (editorRef.current) persist(editorRef.current.innerHTML, v);
  };

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    onEditorInput();
  };

  const insertImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      exec("insertImage", ev.target?.result as string);
      const imgs = editorRef.current?.querySelectorAll("img");
      imgs?.forEach((img) => { if (!(img as HTMLElement).style.maxWidth) (img as HTMLElement).style.maxWidth = "100%"; });
    };
    reader.readAsDataURL(file);
  };

  const insertFileLink = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${dataUrl}" download="${file.name}" style="color:#2563EB;">\ud83d\udcce ${file.name}</a>&nbsp;`
      );
      onEditorInput();
    };
    reader.readAsDataURL(file);
  };

  const insertLink = () => {
    const linkUrl = window.prompt("Link URL");
    if (linkUrl) exec("createLink", linkUrl);
  };

  const downloadPdf = () => {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const content = editorRef.current;
    if (content) {
      pdf.html(content, {
        callback: (doc) => doc.save(`${title || "document"}.pdf`),
        x: 40, y: 40, width: 515, windowWidth: 800,
      });
    }
    setDownloadMenuOpen(false);
  };

  const downloadTxt = () => {
    const text = editorRef.current?.innerText || "";
    const blob = new Blob([text], { type: "text/plain" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl; a.download = `${title || "document"}.txt`; a.click();
    URL.revokeObjectURL(blobUrl);
    setDownloadMenuOpen(false);
  };

  const forceSaveNow = () => {
    if (editorRef.current) flushFirestoreSync(businessId, "bizDocuments", docId, { id: docId, title, folder, url, contentHtml: editorRef.current.innerHTML });
    setSaveState("saved");
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#EEF2F8", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E7ECF3", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700 }}>
          <ChevronLeft size={16} /> Documents
        </button>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          style={{ flex: 1, minWidth: 120, border: "none", outline: "none", fontSize: 15, fontWeight: 800, color: "#0F172A", background: "transparent" }}
        />
        <span style={{ fontSize: 11, color: saveState === "unsaved" ? "#F59E0B" : "#94A3B8", display: "flex", alignItems: "center", gap: 4 }}>
          {saveState === "saved" ? <><Check size={12} /> Saved</> : saveState === "saving" ? "Saving\u2026" : "Unsaved"}
        </span>
        <div style={{ position: "relative" }}>
          <button onClick={() => setDownloadMenuOpen((o) => !o)} style={{ background: "#EFF4FF", border: "1px solid #DBE6FF", color: "#2563EB", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={13} /> Export
          </button>
          {downloadMenuOpen && (
            <div style={{ position: "absolute", top: "110%", right: 0, background: "#fff", border: "1px solid #E7ECF3", borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,0.12)", zIndex: 10, minWidth: 140 }}>
              <button onClick={downloadPdf} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "none", border: "none", fontSize: 12.5, cursor: "pointer" }}>Download PDF</button>
              <button onClick={downloadTxt} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "none", border: "none", fontSize: 12.5, cursor: "pointer" }}>Download TXT</button>
            </div>
          )}
        </div>
        <button onClick={forceSaveNow} style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          Save
        </button>
      </div>

      <div style={{ background: "#fff", borderBottom: "1px solid #E7ECF3", padding: "6px 12px", display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <select onChange={(e) => exec("formatBlock", e.target.value)} defaultValue="" style={{ fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 6px", marginRight: 4, background: "#fff" }}>
          <option value="" disabled>Style</option>
          <option value="<p>">Paragraph</option>
          <option value="<h1>">Heading 1</option>
          <option value="<h2>">Heading 2</option>
          <option value="<h3>">Heading 3</option>
        </select>
        <select onChange={(e) => { document.execCommand("fontName", false, e.target.value); onEditorInput(); }} defaultValue="" style={{ fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 6px", marginRight: 4, background: "#fff" }}>
          <option value="" disabled>Font</option>
          {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f.split(",")[0].replace(/'/g, "")}</option>)}
        </select>
        <select
          onChange={(e) => { document.execCommand("fontSize", false, "7"); editorRef.current?.querySelectorAll('font[size="7"]').forEach((el) => { (el as HTMLElement).removeAttribute("size"); (el as HTMLElement).style.fontSize = e.target.value; }); onEditorInput(); }}
          defaultValue="" style={{ fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 6px", marginRight: 8, background: "#fff" }}
        >
          <option value="" disabled>Size</option>
          {FONT_SIZES.map((s) => <option key={s.px} value={s.px}>{s.label}</option>)}
        </select>

        <ToolbarBtn onClick={() => exec("bold")} title="Bold"><Bold size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("italic")} title="Italic"><Italic size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("underline")} title="Underline"><Underline size={15} /></ToolbarBtn>

        <div style={{ position: "relative" }}>
          <ToolbarBtn onClick={() => setColorPickerOpen((o) => !o)} title="Text color"><Palette size={15} /></ToolbarBtn>
          {colorPickerOpen && (
            <div style={{ position: "absolute", top: "110%", left: 0, background: "#fff", border: "1px solid #E7ECF3", borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,0.12)", padding: 8, display: "flex", gap: 6, zIndex: 10 }}>
              {TOOLBAR_COLORS.map((c) => (
                <button key={c} onMouseDown={(e) => e.preventDefault()} onClick={() => { exec("foreColor", c); setColorPickerOpen(false); }} style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer" }} />
              ))}
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 20, background: "#E2E8F0", margin: "0 6px" }} />

        <ToolbarBtn onClick={() => exec("justifyLeft")} title="Align left"><AlignLeft size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("justifyCenter")} title="Align center"><AlignCenter size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("justifyRight")} title="Align right"><AlignRight size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("justifyFull")} title="Justify"><AlignJustify size={15} /></ToolbarBtn>

        <div style={{ width: 1, height: 20, background: "#E2E8F0", margin: "0 6px" }} />

        <ToolbarBtn onClick={() => exec("insertUnorderedList")} title="Bullet list"><List size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("insertOrderedList")} title="Numbered list"><ListOrdered size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={insertLink} title="Insert link"><Link2 size={15} /></ToolbarBtn>

        <div style={{ width: 1, height: 20, background: "#E2E8F0", margin: "0 6px" }} />

        <ToolbarBtn onClick={() => imageInputRef.current?.click()} title="Insert image"><ImageIcon size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={() => fileInputRef.current?.click()} title="Import file"><Paperclip size={15} /></ToolbarBtn>
        <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = ""; }} />
        <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) insertFileLink(f); e.target.value = ""; }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "32px 16px" }}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={onEditorInput}
          style={{
            maxWidth: 780, minHeight: 1000, margin: "0 auto", background: "#fff",
            borderRadius: 4, boxShadow: "0 4px 24px rgba(15,23,42,0.08)", border: "1px solid #E7ECF3",
            padding: "64px 72px", fontSize: 16, lineHeight: 1.7, color: "#0F172A", outline: "none",
            fontFamily: "-apple-system, sans-serif",
          }}
        />
      </div>
    </div>
  );
};

export default DocumentEditor;
