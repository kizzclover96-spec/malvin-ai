import React, { useEffect, useRef, useState, useCallback } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  saveLocal, getLocal, scheduleFirestoreSync, flushFirestoreSync, fetchFromFirestore,
  STORE_PRESENTATIONS,
} from "../../../utils/localFirstStore";
import {
  ChevronLeft, Plus, Trash2, Copy, Type, Square, Circle as CircleIcon, Triangle, Image as ImageIcon,
  Maximize2, Download, Check, X, RotateCw,
} from "lucide-react";

/* ============================================================================
   Canvas-based slide editor. Each slide is a fixed 960x540 canvas; elements
   are stored as percentages of that canvas so the same slide renders
   correctly at any zoom/screen size (editor, present mode, PDF export all
   share one coordinate system).
============================================================================ */

const CANVAS_W = 960;
const CANVAS_H = 540;

interface SlideElement {
  id: string;
  type: "text" | "shape" | "image";
  x: number; y: number; width: number; height: number; rotation: number; z: number;
  text?: string; fontSize?: number; color?: string; align?: "left" | "center" | "right"; bold?: boolean; italic?: boolean;
  shapeType?: "rect" | "circle" | "triangle"; fill?: string; borderColor?: string; borderWidth?: number; opacity?: number;
  src?: string;
}
interface Slide {
  id: string;
  background: { type: "color" | "image"; value: string };
  overlay?: { color: string; opacity: number } | null;
  elements: SlideElement[];
}
export interface Deck { id: string; title: string; slides: Slide[]; }

const newId = () => "el" + Date.now() + Math.floor(Math.random() * 1000);

const emptySlide = (): Slide => ({ id: newId(), background: { type: "color", value: "#FFFFFF" }, overlay: null, elements: [] });

/* ------------------------------- rendering ------------------------------- */

const ElementView: React.FC<{ el: SlideElement; scale: number; selected: boolean; onSelect: () => void; onChange: (patch: Partial<SlideElement>) => void; readOnly?: boolean }> = ({ el, scale, selected, onSelect, onChange, readOnly }) => {
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const rotateState = useRef<{ cx: number; cy: number; startAngle: number; origRotation: number } | null>(null);

  const onDragStart = (e: React.PointerEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    onSelect();
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = ((e.clientX - dragState.current.startX) / scale / CANVAS_W) * 100;
    const dy = ((e.clientY - dragState.current.startY) / scale / CANVAS_H) * 100;
    onChange({ x: Math.max(0, Math.min(100 - el.width, dragState.current.origX + dx)), y: Math.max(0, Math.min(100 - el.height, dragState.current.origY + dy)) });
  };
  const onDragEnd = () => { dragState.current = null; };

  const onResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    resizeState.current = { startX: e.clientX, startY: e.clientY, origW: el.width, origH: el.height };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizeState.current) return;
    const dw = ((e.clientX - resizeState.current.startX) / scale / CANVAS_W) * 100;
    const dh = ((e.clientY - resizeState.current.startY) / scale / CANVAS_H) * 100;
    onChange({ width: Math.max(4, resizeState.current.origW + dw), height: Math.max(4, resizeState.current.origH + dh) });
  };
  const onResizeEnd = () => { resizeState.current = null; };

  const onRotateStart = (e: React.PointerEvent, containerEl: HTMLElement) => {
    e.stopPropagation();
    const rect = containerEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    rotateState.current = { cx, cy, startAngle, origRotation: el.rotation };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onRotateMove = (e: React.PointerEvent) => {
    if (!rotateState.current) return;
    const angle = Math.atan2(e.clientY - rotateState.current.cy, e.clientX - rotateState.current.cx) * (180 / Math.PI);
    onChange({ rotation: Math.round(rotateState.current.origRotation + (angle - rotateState.current.startAngle)) });
  };
  const onRotateEnd = () => { rotateState.current = null; };

  const containerRef = useRef<HTMLDivElement>(null);

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`,
    transform: `rotate(${el.rotation}deg)`, zIndex: el.z,
    outline: selected && !readOnly ? "2px solid #2563EB" : "none",
    outlineOffset: 2,
    cursor: readOnly ? "default" : "move",
  };

  let inner: React.ReactNode = null;
  if (el.type === "text") {
    inner = (
      <div
        contentEditable={selected && !readOnly}
        suppressContentEditableWarning
        onBlur={(e) => onChange({ text: e.currentTarget.textContent || "" })}
        style={{
          width: "100%", height: "100%", fontSize: el.fontSize, color: el.color,
          textAlign: el.align, fontWeight: el.bold ? 800 : 400, fontStyle: el.italic ? "italic" : "normal",
          display: "flex", alignItems: "center", justifyContent: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
          outline: "none", overflow: "hidden", wordBreak: "break-word", fontFamily: "-apple-system, sans-serif",
        }}
      >
        {el.text}
      </div>
    );
  } else if (el.type === "shape") {
    const shapeStyle: React.CSSProperties = {
      width: "100%", height: "100%", background: el.fill, opacity: el.opacity ?? 1,
      border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor}` : "none",
      borderRadius: el.shapeType === "circle" ? "50%" : el.shapeType === "rect" ? 6 : 0,
      clipPath: el.shapeType === "triangle" ? "polygon(50% 0%, 0% 100%, 100% 100%)" : undefined,
    };
    inner = <div style={shapeStyle} />;
  } else if (el.type === "image") {
    inner = <img src={el.src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4, pointerEvents: "none" }} />;
  }

  return (
    <div
      ref={containerRef}
      style={baseStyle}
      onPointerDown={onDragStart}
      onPointerMove={(e) => { onDragMove(e); onResizeMove(e); onRotateMove(e); }}
      onPointerUp={() => { onDragEnd(); onResizeEnd(); onRotateEnd(); }}
    >
      {inner}
      {selected && !readOnly && (
        <>
          <div
            onPointerDown={onResizeStart}
            style={{ position: "absolute", right: -6, bottom: -6, width: 12, height: 12, borderRadius: "50%", background: "#2563EB", border: "2px solid #fff", cursor: "nwse-resize" }}
          />
          <div
            onPointerDown={(e) => containerRef.current && onRotateStart(e, containerRef.current)}
            style={{ position: "absolute", left: "50%", top: -22, transform: "translateX(-50%)", width: 18, height: 18, borderRadius: "50%", background: "#fff", border: "2px solid #2563EB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab" }}
          >
            <RotateCw size={10} color="#2563EB" />
          </div>
        </>
      )}
    </div>
  );
};

const SlideCanvas: React.FC<{ slide: Slide; scale: number; selectedId: string | null; onSelect: (id: string | null) => void; onChangeElement: (id: string, patch: Partial<SlideElement>) => void; readOnly?: boolean; canvasRef?: React.RefObject<HTMLDivElement> }> = ({ slide, scale, selectedId, onSelect, onChangeElement, readOnly, canvasRef }) => (
  <div
    ref={canvasRef}
    onPointerDown={() => onSelect(null)}
    style={{
      width: CANVAS_W, height: CANVAS_H, position: "relative", overflow: "hidden",
      background: slide.background.type === "color" ? slide.background.value : `#fff`,
      backgroundImage: slide.background.type === "image" ? `url(${slide.background.value})` : undefined,
      backgroundSize: "cover", backgroundPosition: "center",
      transform: `scale(${scale})`, transformOrigin: "top left",
      borderRadius: 8, boxShadow: "0 4px 20px rgba(15,23,42,0.15)", flexShrink: 0,
    }}
  >
    {slide.overlay && <div style={{ position: "absolute", inset: 0, background: slide.overlay.color, opacity: slide.overlay.opacity, pointerEvents: "none" }} />}
    {[...slide.elements].sort((a, b) => a.z - b.z).map((el) => (
      <ElementView key={el.id} el={el} scale={scale} selected={selectedId === el.id} onSelect={() => onSelect(el.id)} onChange={(patch) => onChangeElement(el.id, patch)} readOnly={readOnly} />
    ))}
  </div>
);

/* ------------------------------- present mode ------------------------------- */

const PresentMode: React.FC<{ deck: Deck; onExit: () => void }> = ({ deck, onExit }) => {
  const [idx, setIdx] = useState(0);
  const slides = deck.slides || [];
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calc = () => setScale(Math.min((window.innerWidth - 80) / CANVAS_W, (window.innerHeight - 140) / CANVAS_H));
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length, onExit]);

  const s = slides[idx];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#0F172A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <button onClick={onExit} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", cursor: "pointer" }}><X size={16} /></button>
      {s ? (
        <SlideCanvas slide={s} scale={scale} selectedId={null} onSelect={() => {}} onChangeElement={() => {}} readOnly />
      ) : <p style={{ color: "#fff", opacity: 0.5 }}>No slides in this deck yet.</p>}
      <div style={{ position: "absolute", bottom: 24, display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ fontSize: 13, color: "#fff", opacity: 0.6 }}>{slides.length ? idx + 1 : 0} / {slides.length}</span>
      </div>
    </div>
  );
};

/* ------------------------------- root editor ------------------------------- */

const PresentationCanvasEditor: React.FC<{ businessId: string; deckId: string; title: string; onBack: () => void }> = ({ businessId, deckId, title: initialTitle, onBack }) => {
  const [title, setTitle] = useState(initialTitle);
  const [slides, setSlides] = useState<Slide[]>([emptySlide()]);
  const [activeSlideId, setActiveSlideId] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const loadedRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragSlideIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const activeSlide = slides.find((s) => s.id === activeSlideId) || slides[0];
  const activeIndex = slides.findIndex((s) => s.id === activeSlide?.id);
  const selectedElement = activeSlide?.elements.find((e) => e.id === selectedId) || null;

  const persist = useCallback((s: Slide[], t: string) => {
    const record = { id: deckId, title: t, slides: s };
    saveLocal(STORE_PRESENTATIONS, record).catch(() => {});
    setSaveState("saving");
    scheduleFirestoreSync(businessId, "bizPresentation", deckId, record, 1500);
    setTimeout(() => setSaveState("saved"), 1600);
  }, [businessId, deckId]);

  useEffect(() => {
    (async () => {
      const local = await getLocal<{ id: string; title: string; slides: Slide[] }>(STORE_PRESENTATIONS, deckId).catch(() => null);
      if (local?.slides?.length) {
        setSlides(local.slides);
        setActiveSlideId(local.slides[0].id);
        if (local.title) setTitle(local.title);
      } else {
        const remote = await fetchFromFirestore<{ id: string; title: string; slides: Slide[] }>(businessId, "bizPresentation", deckId).catch(() => null);
        if (remote?.slides?.length) {
          setSlides(remote.slides);
          setActiveSlideId(remote.slides[0].id);
        } else {
          setActiveSlideId(slides[0].id);
        }
        if (remote?.title) setTitle(remote.title);
      }
      loadedRef.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, deckId]);

  const updateSlides = (next: Slide[]) => {
    setSlides(next);
    if (loadedRef.current) { setSaveState("unsaved"); persist(next, title); }
  };

  const updateElement = (id: string, patch: Partial<SlideElement>) => {
    if (!activeSlide) return;
    updateSlides(slides.map((s) => (s.id === activeSlide.id ? { ...s, elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) } : s)));
  };

  const addElement = (partial: Omit<SlideElement, "id" | "z">) => {
    if (!activeSlide) return;
    const z = Math.max(0, ...activeSlide.elements.map((e) => e.z)) + 1;
    const el: SlideElement = { id: newId(), z, ...partial };
    updateSlides(slides.map((s) => (s.id === activeSlide.id ? { ...s, elements: [...s.elements, el] } : s)));
    setSelectedId(el.id);
  };

  const addText = () => addElement({ type: "text", x: 20, y: 40, width: 60, height: 15, rotation: 0, text: "New text", fontSize: 32, color: "#0F172A", align: "left", bold: false, italic: false });
  const addShape = (shapeType: SlideElement["shapeType"]) => addElement({ type: "shape", x: 35, y: 35, width: 30, height: 30, rotation: 0, shapeType, fill: "#2563EB", borderColor: "#0F172A", borderWidth: 0, opacity: 1 });
  const addImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => addElement({ type: "image", x: 20, y: 20, width: 40, height: 40, rotation: 0, src: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    if (!activeSlide || !selectedId) return;
    updateSlides(slides.map((s) => (s.id === activeSlide.id ? { ...s, elements: s.elements.filter((e) => e.id !== selectedId) } : s)));
    setSelectedId(null);
  };

  const setBackground = (bg: Slide["background"]) => {
    if (!activeSlide) return;
    updateSlides(slides.map((s) => (s.id === activeSlide.id ? { ...s, background: bg } : s)));
  };
  const setOverlay = (overlay: Slide["overlay"]) => {
    if (!activeSlide) return;
    updateSlides(slides.map((s) => (s.id === activeSlide.id ? { ...s, overlay } : s)));
  };

  const addSlide = () => {
    const s = emptySlide();
    const next = [...slides, s];
    updateSlides(next);
    setActiveSlideId(s.id);
    setSelectedId(null);
  };
  const duplicateSlide = (id: string) => {
    const idx = slides.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const copy: Slide = { ...slides[idx], id: newId(), elements: slides[idx].elements.map((e) => ({ ...e, id: newId() })) };
    const next = [...slides.slice(0, idx + 1), copy, ...slides.slice(idx + 1)];
    updateSlides(next);
    setActiveSlideId(copy.id);
  };
  const deleteSlide = (id: string) => {
    if (slides.length <= 1) return;
    const next = slides.filter((s) => s.id !== id);
    updateSlides(next);
    if (activeSlideId === id) setActiveSlideId(next[0].id);
  };

  const handleSlideDragStart = (i: number) => () => { dragSlideIndex.current = i; };
  const handleSlideDragOver = (i: number) => (e: React.DragEvent) => { e.preventDefault(); setDragOverIndex(i); };
  const handleSlideDrop = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragSlideIndex.current;
    setDragOverIndex(null); dragSlideIndex.current = null;
    if (from === null || from === i) return;
    const next = [...slides];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    updateSlides(next);
  };

  const forceSaveNow = () => { flushFirestoreSync(businessId, "bizPresentation", deckId, { id: deckId, title, slides }); setSaveState("saved"); };

  const downloadPdf = async () => {
    const pdf = new jsPDF({ unit: "pt", format: [CANVAS_W, CANVAS_H], orientation: "landscape" });
    for (let i = 0; i < slides.length; i++) {
      setActiveSlideId(slides[i].id);
      setSelectedId(null);
      await new Promise((r) => setTimeout(r, 60));
      if (!canvasRef.current) continue;
      const canvasImg = await html2canvas(canvasRef.current, { backgroundColor: "#ffffff", scale: 2 });
      const imgData = canvasImg.toDataURL("image/jpeg", 0.92);
      if (i > 0) pdf.addPage([CANVAS_W, CANVAS_H], "landscape");
      pdf.addImage(imgData, "JPEG", 0, 0, CANVAS_W, CANVAS_H);
    }
    pdf.save(`${title || "deck"}.pdf`);
    setDownloadMenuOpen(false);
  };

  if (presenting) return <PresentMode deck={{ id: deckId, title, slides }} onExit={() => setPresenting(false)} />;
  if (!activeSlide) return null;

  const editorScale = 0.66;

  return (
    <div style={{ minHeight: "100dvh", background: "#EEF2F8", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E7ECF3", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700 }}>
          <ChevronLeft size={16} /> Presentations
        </button>
        <input value={title} onChange={(e) => { setTitle(e.target.value); persist(slides, e.target.value); }} style={{ flex: 1, minWidth: 120, border: "none", outline: "none", fontSize: 15, fontWeight: 800, color: "#0F172A", background: "transparent" }} />
        <span style={{ fontSize: 11, color: saveState === "unsaved" ? "#F59E0B" : "#94A3B8", display: "flex", alignItems: "center", gap: 4 }}>
          {saveState === "saved" ? <><Check size={12} /> Saved</> : saveState === "saving" ? "Saving…" : "Unsaved"}
        </span>
        <div style={{ position: "relative" }}>
          <button onClick={() => setDownloadMenuOpen((o) => !o)} style={{ background: "#EFF4FF", border: "1px solid #DBE6FF", color: "#2563EB", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={13} /> Export
          </button>
          {downloadMenuOpen && (
            <div style={{ position: "absolute", top: "110%", right: 0, background: "#fff", border: "1px solid #E7ECF3", borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,0.12)", zIndex: 10, minWidth: 150 }}>
              <button onClick={downloadPdf} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "none", border: "none", fontSize: 12.5, cursor: "pointer" }}>Download PDF</button>
            </div>
          )}
        </div>
        <button onClick={() => setPresenting(true)} style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Maximize2 size={13} /> Project
        </button>
        <button onClick={forceSaveNow} style={{ background: "#EFF4FF", color: "#2563EB", border: "1px solid #DBE6FF", borderRadius: 10, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          Save
        </button>
      </div>

      {/* Insert toolbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E7ECF3", padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <button onClick={addText} style={{ ...toolBtn }}><Type size={13} /> Text</button>
        <button onClick={() => addShape("rect")} style={{ ...toolBtn }}><Square size={13} /></button>
        <button onClick={() => addShape("circle")} style={{ ...toolBtn }}><CircleIcon size={13} /></button>
        <button onClick={() => addShape("triangle")} style={{ ...toolBtn }}><Triangle size={13} /></button>
        <label style={{ ...toolBtn, cursor: "pointer" }}>
          <ImageIcon size={13} /> Image
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(f); e.target.value = ""; }} />
        </label>

        <div style={{ width: 1, height: 20, background: "#E2E8F0", margin: "0 4px" }} />

        <label style={{ fontSize: 11.5, color: "#64748B", display: "flex", alignItems: "center", gap: 6 }}>
          Background
          <input type="color" value={activeSlide.background.type === "color" ? activeSlide.background.value : "#ffffff"} onChange={(e) => setBackground({ type: "color", value: e.target.value })} style={{ width: 26, height: 26, border: "none", background: "none", cursor: "pointer" }} />
          <label style={{ ...toolBtn, padding: "4px 8px" }}>
            Image
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => setBackground({ type: "image", value: ev.target?.result as string }); r.readAsDataURL(f); e.target.value = ""; }} />
          </label>
        </label>

        <label style={{ fontSize: 11.5, color: "#64748B", display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
          <input type="checkbox" checked={!!activeSlide.overlay} onChange={(e) => setOverlay(e.target.checked ? { color: "#000000", opacity: 0.4 } : null)} />
          Overlay
          {activeSlide.overlay && (
            <input type="range" min={0} max={0.9} step={0.05} value={activeSlide.overlay.opacity} onChange={(e) => setOverlay({ color: activeSlide.overlay!.color, opacity: Number(e.target.value) })} style={{ width: 70 }} />
          )}
        </label>

        {selectedElement && (
          <>
            <div style={{ width: 1, height: 20, background: "#E2E8F0", margin: "0 4px" }} />
            {selectedElement.type === "text" && (
              <>
                <input type="color" value={selectedElement.color} onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })} style={{ width: 26, height: 26, border: "none", background: "none", cursor: "pointer" }} />
                <input type="number" value={selectedElement.fontSize} onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })} style={{ width: 50, fontSize: 11.5, border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 6px" }} />
                <button onClick={() => updateElement(selectedElement.id, { bold: !selectedElement.bold })} style={{ ...toolBtn, background: selectedElement.bold ? "#DBE6FF" : "#F1F5FB" }}>B</button>
                <button onClick={() => updateElement(selectedElement.id, { italic: !selectedElement.italic })} style={{ ...toolBtn, background: selectedElement.italic ? "#DBE6FF" : "#F1F5FB", fontStyle: "italic" }}>I</button>
              </>
            )}
            {selectedElement.type === "shape" && (
              <>
                <input type="color" value={selectedElement.fill} onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })} style={{ width: 26, height: 26, border: "none", background: "none", cursor: "pointer" }} />
                <input type="range" min={0} max={1} step={0.05} value={selectedElement.opacity} onChange={(e) => updateElement(selectedElement.id, { opacity: Number(e.target.value) })} style={{ width: 70 }} />
                <input type="number" min={0} max={12} value={selectedElement.borderWidth} onChange={(e) => updateElement(selectedElement.id, { borderWidth: Number(e.target.value) })} style={{ width: 44, fontSize: 11.5, border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 6px" }} title="Border width" />
                <input type="color" value={selectedElement.borderColor} onChange={(e) => updateElement(selectedElement.id, { borderColor: e.target.value })} style={{ width: 26, height: 26, border: "none", background: "none", cursor: "pointer" }} title="Border color" />
              </>
            )}
            <button onClick={deleteSelected} style={{ ...toolBtn, color: "#EF4444" }}><Trash2 size={13} /></button>
          </>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Slide list */}
        <div style={{ width: 160, background: "#fff", borderRight: "1px solid #E7ECF3", overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {slides.map((s, i) => (
            <div
              key={s.id}
              draggable
              onDragStart={handleSlideDragStart(i)}
              onDragOver={handleSlideDragOver(i)}
              onDrop={handleSlideDrop(i)}
              onClick={() => { setActiveSlideId(s.id); setSelectedId(null); }}
              style={{
                position: "relative", cursor: "pointer",
                border: s.id === activeSlideId ? "2px solid #2563EB" : "1px solid #E2E8F0",
                borderRadius: 8, overflow: "hidden",
                outline: dragOverIndex === i ? "2px dashed #2563EB" : "none",
              }}
            >
              <div style={{
                width: "100%", aspectRatio: `${CANVAS_W}/${CANVAS_H}`,
                background: s.background.type === "color" ? s.background.value : "#fff",
                backgroundImage: s.background.type === "image" ? `url(${s.background.value})` : undefined,
                backgroundSize: "cover", backgroundPosition: "center",
              }} />
              <div style={{ position: "absolute", top: 2, left: 4, fontSize: 9, color: s.background.type === "color" && s.background.value === "#FFFFFF" ? "#94A3B8" : "#fff", fontWeight: 800, textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>{i + 1}</div>
              <div style={{ position: "absolute", bottom: 2, right: 2, display: "flex", gap: 2 }}>
                <button onClick={(e) => { e.stopPropagation(); duplicateSlide(s.id); }} style={miniBtn}><Copy size={10} /></button>
                {slides.length > 1 && <button onClick={(e) => { e.stopPropagation(); deleteSlide(s.id); }} style={miniBtn}><Trash2 size={10} /></button>}
              </div>
            </div>
          ))}
          <button onClick={addSlide} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 8, border: "1px dashed #DCE3ED", background: "#F7F9FC", color: "#2563EB", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={13} /> Add Slide
          </button>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: 30 }}>
          <SlideCanvas slide={activeSlide} scale={editorScale} selectedId={selectedId} onSelect={setSelectedId} onChangeElement={updateElement} canvasRef={canvasRef} />
        </div>
      </div>
    </div>
  );
};

const toolBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 5, background: "#F1F5FB", border: "1px solid #E2E8F0",
  borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, color: "#334155", cursor: "pointer",
};
const miniBtn: React.CSSProperties = {
  width: 16, height: 16, borderRadius: 4, background: "rgba(0,0,0,0.55)", border: "none", color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};

export default PresentationCanvasEditor;
export { PresentMode };

/** Renders each slide off-screen and captures it for a PDF — used by the
 * deck list's Download button so a person never has to open the full
 * editor just to export something they already finished. */
export async function downloadDeckPdfStandalone(deck: Deck) {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-9999px";
  host.style.top = "0";
  document.body.appendChild(host);

  const { createRoot } = await import("react-dom/client");
  const root = createRoot(host);

  const pdf = new jsPDF({ unit: "pt", format: [CANVAS_W, CANVAS_H], orientation: "landscape" });

  for (let i = 0; i < deck.slides.length; i++) {
    await new Promise<void>((resolve) => {
      root.render(
        <SlideCanvas slide={deck.slides[i]} scale={1} selectedId={null} onSelect={() => {}} onChangeElement={() => {}} readOnly />
      );
      setTimeout(resolve, 80);
    });
    const target = host.firstElementChild as HTMLElement;
    if (target) {
      const canvasImg = await html2canvas(target, { backgroundColor: "#ffffff", scale: 2 });
      const imgData = canvasImg.toDataURL("image/jpeg", 0.92);
      if (i > 0) pdf.addPage([CANVAS_W, CANVAS_H], "landscape");
      pdf.addImage(imgData, "JPEG", 0, 0, CANVAS_W, CANVAS_H);
    }
  }

  pdf.save(`${deck.title || "deck"}.pdf`);
  root.unmount();
  document.body.removeChild(host);
}
