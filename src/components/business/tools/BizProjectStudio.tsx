import React, { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { firestore as db } from "../../../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import {
  BizToolShell, BizRow, BizEmptyState, BizFormCard, bizInputStyle, bizBtnStyle, bizBtnGhostStyle,
  bizToolTint, bizTextMuted, useBizCollection, BizActionGrid, BizActionButton,
} from "./BizToolShared";
import { FolderKanban, FileText, MonitorPlay, ChevronLeft, Maximize2, Download, StickyNote, Send, GripVertical, Link2, Plus } from "lucide-react";
import DocumentEditor from "./DocumentEditor";
import PresentationCanvasEditor, { PresentMode, downloadDeckPdfStandalone, type Deck } from "./PresentationCanvasEditor";

/* ============================================================================
   Projects = Presentation + Projects + Documents, merged.
   These three are really one job — "produce and share the artifact a
   project needs" — so a secretary shouldn't have to know which of three
   separate tools holds the deck they just finished. Download and Project
   (present/cast) sit directly on every deck row, not three clicks deep.
============================================================================ */

type Mode = "home" | "projects" | "documents" | "decks";

/* ------------------------------- Projects ------------------------------- */

interface ProjectTask { id: string; title: string; done: boolean; }
interface Project { id: string; title: string; description: string; members: string; tasks: ProjectTask[]; }

const ProjectDetail: React.FC<{ project: Project; onBack: () => void; onUpdateTasks: (tasks: ProjectTask[]) => void }> = ({ project, onBack, onUpdateTasks }) => {
  const [newTask, setNewTask] = useState("");
  const tasks = project.tasks || [];
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const dragIndex = React.useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const addTask = (e: React.FormEvent) => { e.preventDefault(); if (!newTask.trim()) return; onUpdateTasks([...tasks, { id: "t" + Date.now(), title: newTask, done: false }]); setNewTask(""); };
  const toggle = (id: string) => onUpdateTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const removeTask = (id: string) => onUpdateTasks(tasks.filter((t) => t.id !== id));
  const handleDragStart = (i: number) => (e: React.DragEvent) => { dragIndex.current = i; e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (i: number) => (e: React.DragEvent) => { e.preventDefault(); setOverIndex(i); };
  const handleDrop = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    setOverIndex(null); dragIndex.current = null;
    if (from === null || from === i) return;
    const next = [...tasks];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    onUpdateTasks(next);
  };

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: bizToolTint, cursor: "pointer", fontSize: 13, marginBottom: 14, padding: 0 }}><ChevronLeft size={14} /> All projects</button>
      <h3 style={{ margin: "0 0 4px" }}>{project.title}</h3>
      <p style={{ fontSize: 12.5, color: bizTextMuted, marginBottom: 4 }}>{project.description}</p>
      {project.members && <p style={{ fontSize: 11.5, color: bizTextMuted, marginBottom: 14 }}>Members: {project.members}</p>}
      <div style={{ height: 8, borderRadius: 4, background: "#EEF2F8", overflow: "hidden", marginBottom: 6 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: bizToolTint, transition: "width 0.3s ease" }} />
      </div>
      <p style={{ fontSize: 11, color: bizTextMuted, marginBottom: 18 }}>{done}/{tasks.length} milestones complete ({pct}%)</p>
      <form onSubmit={addTask} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input placeholder="Add a task or milestone..." value={newTask} onChange={(e) => setNewTask(e.target.value)} style={bizInputStyle} />
        <button type="submit" style={bizBtnStyle}><Plus size={14} /></button>
      </form>
      {tasks.length > 1 && <p style={{ fontSize: 10.5, color: bizTextMuted, marginBottom: 8 }}>Drag the handle to reorder tasks.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tasks.map((t, i) => (
          <div key={t.id} draggable onDragStart={handleDragStart(i)} onDragOver={handleDragOver(i)} onDrop={handleDrop(i)} onDragEnd={() => setOverIndex(null)}
            style={{ display: "flex", alignItems: "center", gap: 8, outline: overIndex === i ? `2px dashed ${bizToolTint}` : "none", outlineOffset: 2, borderRadius: 14 }}>
            <span style={{ cursor: "grab", color: "#C3CCDA", flexShrink: 0 }}><GripVertical size={15} /></span>
            <div style={{ flex: 1 }}>
              <BizRow onDelete={() => removeTask(t.id)}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
                  <span style={{ fontSize: 13.5, textDecoration: t.done ? "line-through" : "none", color: t.done ? bizTextMuted : "#0F172A" }}>{t.title}</span>
                </label>
              </BizRow>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProjectsView: React.FC<{ businessId: string; onBack: () => void }> = ({ businessId, onBack }) => {
  const { items, add, update, remove } = useBizCollection<Project>(businessId, "bizProjects");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!title.trim()) return; await add({ title, description, members, tasks: [] }); setTitle(""); setDescription(""); setMembers(""); setFormOpen(false); };
  const openProject = items.find((p) => p.id === openId);
  if (openProject) return <ProjectDetail project={openProject} onBack={() => setOpenId(null)} onUpdateTasks={(tasks) => update(openProject.id, { tasks })} />;

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: bizToolTint, cursor: "pointer", fontSize: 13, marginBottom: 14, padding: 0 }}><ChevronLeft size={14} /> Projects</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Projects</h3>
        {!formOpen && <button onClick={() => setFormOpen(true)} style={bizBtnStyle}>+ New</button>}
      </div>
      {formOpen && (
        <form onSubmit={submit}>
          <BizFormCard onCancel={() => setFormOpen(false)}>
            <input placeholder="Project title" value={title} onChange={(e) => setTitle(e.target.value)} style={bizInputStyle} required />
            <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} style={bizInputStyle} />
            <input placeholder="Members (comma separated)" value={members} onChange={(e) => setMembers(e.target.value)} style={bizInputStyle} />
            <button type="submit" style={bizBtnStyle}>Create Project</button>
          </BizFormCard>
        </form>
      )}
      {items.length === 0 && <BizEmptyState label="No projects yet." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((p) => {
          const tasks = p.tasks || [];
          const done = tasks.filter((t) => t.done).length;
          return (
            <BizRow key={p.id} onDelete={() => remove(p.id)}>
              <div onClick={() => setOpenId(p.id)} style={{ cursor: "pointer" }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.title}</div>
                <div style={{ fontSize: 11.5, color: bizTextMuted }}>{tasks.length ? `${done}/${tasks.length} complete` : "No tasks yet"}</div>
              </div>
            </BizRow>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------- Documents ------------------------------- */

interface Doc { id: string; title: string; url: string; folder: string; }

const DocumentsView: React.FC<{ businessId: string; onBack: () => void }> = ({ businessId, onBack }) => {
  const { items, add, remove } = useBizCollection<Doc>(businessId, "bizDocuments");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [folder, setFolder] = useState("General");
  const [filter, setFilter] = useState("All");
  const [openDocId, setOpenDocId] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!title.trim()) return; await add({ title, url, folder: folder || "General" }); setTitle(""); setUrl(""); setFormOpen(false); };
  const folders = ["All", ...Array.from(new Set(items.map((d) => d.folder || "General")))];
  const visible = filter === "All" ? items : items.filter((d) => (d.folder || "General") === filter);

  const openDoc = items.find((d) => d.id === openDocId);
  if (openDoc) {
    return (
      <DocumentEditor
        businessId={businessId}
        docId={openDoc.id}
        title={openDoc.title}
        folder={openDoc.folder}
        url={openDoc.url}
        onBack={() => setOpenDocId(null)}
      />
    );
  }

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: bizToolTint, cursor: "pointer", fontSize: 13, marginBottom: 14, padding: 0 }}><ChevronLeft size={14} /> Projects</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Documents</h3>
        {!formOpen && <button onClick={() => setFormOpen(true)} style={bizBtnStyle}>+ New</button>}
      </div>
      {formOpen && (
        <form onSubmit={submit}>
          <BizFormCard onCancel={() => setFormOpen(false)}>
            <input placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)} style={bizInputStyle} required />
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Folder (e.g. Contracts)" value={folder} onChange={(e) => setFolder(e.target.value)} style={bizInputStyle} />
              <input placeholder="Link (optional)" value={url} onChange={(e) => setUrl(e.target.value)} style={bizInputStyle} />
            </div>
            <button type="submit" style={bizBtnStyle}>Add Document</button>
          </BizFormCard>
        </form>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {folders.map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid #DBE6FF`, background: filter === f ? bizToolTint : "transparent", color: filter === f ? "#fff" : bizToolTint, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{f}</button>
        ))}
      </div>
      {visible.length === 0 && <BizEmptyState label="No documents yet." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((d) => (
          <BizRow key={d.id} onDelete={() => remove(d.id)}>
            <div onClick={() => setOpenDocId(d.id)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <FileText size={16} color={bizToolTint} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{d.title}</div>
                <div style={{ fontSize: 11, fontStyle: "italic", color: bizTextMuted, marginTop: 1 }}>Tap to edit</div>
                {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, color: bizToolTint, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}><Link2 size={11} /> Open link</a>}
              </div>
            </div>
          </BizRow>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------- Presentation / Decks ------------------------------- */

const NotesPanel: React.FC<{ businessId: string; connectedApps: { name: string; url: string }[] }> = ({ businessId, connectedApps }) => {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);

  useEffect(() => {
    const ref = doc(db, "business", businessId, "bizPresentationConfig", "notes");
    return onSnapshot(ref, (snap) => setText(snap.data()?.text || ""));
  }, [businessId]);

  const save = async () => { await setDoc(doc(db, "business", businessId, "bizPresentationConfig", "notes"), { text, updatedAt: Date.now() }); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const exportTxt = () => { const blob = new Blob([text], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "notes.txt"; a.click(); URL.revokeObjectURL(url); };
  const exportPdf = () => { const pdf = new jsPDF({ unit: "pt", format: "a4" }); pdf.setFontSize(12); pdf.text(pdf.splitTextToSize(text || "(empty note)", 480), 56, 70); pdf.save("notes.pdf"); };
  const sendToApp = (app: { name: string; url: string }) => { navigator.clipboard?.writeText(text).catch(() => {}); window.open(app.url, "_blank", "noopener,noreferrer"); setSendMenuOpen(false); };

  return (
    <div style={{ background: "#fff", border: "1px solid #E7ECF3", borderRadius: 16, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><StickyNote size={15} color={bizToolTint} /><span style={{ fontSize: 13, fontWeight: 700 }}>Notes</span></div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Jot down notes for this project..." style={{ ...bizInputStyle, height: 130, resize: "vertical", fontFamily: "inherit", marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", position: "relative" }}>
        <button onClick={save} style={bizBtnStyle}>{saved ? "Saved ✓" : "Save Note"}</button>
        <button onClick={exportTxt} style={bizBtnGhostStyle}>Export .txt</button>
        <button onClick={exportPdf} style={bizBtnGhostStyle}>Export PDF</button>
        <button onClick={() => setSendMenuOpen((o) => !o)} style={{ ...bizBtnGhostStyle, display: "flex", alignItems: "center", gap: 6 }}><Send size={12} /> Send to app</button>
        {sendMenuOpen && (
          <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, background: "#fff", border: "1px solid #E7ECF3", borderRadius: 10, padding: 6, zIndex: 5, minWidth: 180, boxShadow: "0 8px 24px rgba(15,23,42,0.1)" }}>
            {connectedApps.length === 0 ? <div style={{ fontSize: 11.5, color: bizTextMuted, padding: "8px 10px" }}>No connected apps yet.</div> : connectedApps.map((app) => (
              <button key={app.name} onClick={() => sendToApp(app)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: "#0F172A", padding: "8px 10px", fontSize: 12.5, cursor: "pointer", borderRadius: 6 }}>{app.name}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DecksView: React.FC<{ businessId: string; onBack: () => void; connectedApps: { name: string; url: string }[] }> = ({ businessId, onBack, connectedApps }) => {
  const { items, add, remove } = useBizCollection<Deck>(businessId, "bizPresentation");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [presentingId, setPresentingId] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!title.trim()) return; await add({ title, slides: [] }); setTitle(""); setFormOpen(false); };
  const openDeck = items.find((d) => d.id === openId);
  const presentingDeck = items.find((d) => d.id === presentingId);

  if (presentingDeck) return <PresentMode deck={presentingDeck} onExit={() => setPresentingId(null)} />;
  if (openDeck) return <PresentationCanvasEditor businessId={businessId} deckId={openDeck.id} title={openDeck.title} onBack={() => setOpenId(null)} />;

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: bizToolTint, cursor: "pointer", fontSize: 13, marginBottom: 14, padding: 0 }}><ChevronLeft size={14} /> Projects</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Presentations</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowNotes((s) => !s)} style={{ ...bizBtnGhostStyle, display: "flex", alignItems: "center", gap: 6 }}><StickyNote size={13} /> Notes</button>
          {!formOpen && <button onClick={() => setFormOpen(true)} style={bizBtnStyle}>+ New</button>}
        </div>
      </div>
      {showNotes && <NotesPanel businessId={businessId} connectedApps={connectedApps} />}
      {formOpen && (
        <form onSubmit={submit}>
          <BizFormCard onCancel={() => setFormOpen(false)}>
            <input placeholder="New deck title (e.g. Q3 Review)" value={title} onChange={(e) => setTitle(e.target.value)} style={bizInputStyle} required />
            <button type="submit" style={bizBtnStyle}>Create Deck</button>
          </BizFormCard>
        </form>
      )}
      {items.length === 0 && <BizEmptyState label="No decks yet." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((d) => (
          <BizRow key={d.id} onDelete={() => remove(d.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div onClick={() => setOpenId(d.id)} style={{ cursor: "pointer", flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{d.title}</div>
                <div style={{ fontSize: 11.5, color: bizTextMuted }}>{(d.slides || []).length} slide(s)</div>
              </div>
              {/* Download and Project sit right here — the whole point is not
                  making anyone open the editor just to export or cast a
                  deck they already finished. */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => downloadDeckPdfStandalone(d)} title="Download PDF" style={{ background: "#EFF4FF", border: "1px solid #DBE6FF", color: bizToolTint, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Download size={14} /></button>
                <button onClick={() => setPresentingId(d.id)} title="Project" style={{ background: bizToolTint, border: "none", color: "#fff", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Maximize2 size={14} /></button>
              </div>
            </div>
          </BizRow>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------- Root ------------------------------- */

const BizProjectStudio: React.FC<{ businessId: string; onClose: () => void; connectedApps?: { name: string; url: string }[] }> = ({ businessId, onClose, connectedApps = [] }) => {
  const [mode, setMode] = useState<Mode>("home");

  return (
    <BizToolShell title="Projects" subtitle="Projects, documents, and presentations — build it, then download or project it" onClose={onClose}>
      {mode === "projects" && <ProjectsView businessId={businessId} onBack={() => setMode("home")} />}
      {mode === "documents" && <DocumentsView businessId={businessId} onBack={() => setMode("home")} />}
      {mode === "decks" && <DecksView businessId={businessId} onBack={() => setMode("home")} connectedApps={connectedApps} />}
      {mode === "home" && (
        <BizActionGrid>
          <BizActionButton icon={FolderKanban} label="Projects" sub="Tasks, milestones and members" onClick={() => setMode("projects")} />
          <BizActionButton icon={FileText} label="Documents" sub="Store and organize files & links" onClick={() => setMode("documents")} />
          <BizActionButton icon={MonitorPlay} label="Presentations" sub="Build a deck, then download or project it" onClick={() => setMode("decks")} />
        </BizActionGrid>
      )}
    </BizToolShell>
  );
};

export default BizProjectStudio;