import React, { useState } from "react";
import { firestore as db } from "../../../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  BizToolShell, BizRow, BizEmptyState, BizFormCard, bizInputStyle, bizBtnStyle, bizBtnGhostStyle,
  bizToolTint, bizTextMuted, useBizCollection, BizActionGrid, BizActionButton,
} from "./BizToolShared";
import { CalendarDays, FileText, Table, Repeat, ChevronLeft, Plus } from "lucide-react";

/* ============================================================================
   Workspace = Schedule + Forms + Sheets, merged.
   All three are "structured data collection over time" — a secretary doesn't
   think of them as separate apps, so they don't need to be separate tools.
   Landing screen is three tappable actions; each opens its own focused view.
============================================================================ */

type Mode = "home" | "schedule" | "forms" | "sheets";

/* ------------------------------- Schedule ------------------------------- */

interface ScheduleEvent { id: string; title: string; date: string; time: string; assignee: string; type: string; repeatLabel?: string; }
const TYPES = ["Shift", "Appointment", "Event"];
const REPEATS = ["Does not repeat", "Daily", "Weekly", "Every 2 weeks", "Monthly"];

function addDays(dateStr: string, days: number) { const d = new Date(dateStr + "T00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function addMonths(dateStr: string, months: number) { const d = new Date(dateStr + "T00:00"); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10); }
function nextOccurrence(dateStr: string, repeat: string) {
  if (repeat === "Daily") return addDays(dateStr, 1);
  if (repeat === "Weekly") return addDays(dateStr, 7);
  if (repeat === "Every 2 weeks") return addDays(dateStr, 14);
  if (repeat === "Monthly") return addMonths(dateStr, 1);
  return null;
}

const ScheduleView: React.FC<{ businessId: string; onBack: () => void }> = ({ businessId, onBack }) => {
  const { items, add, remove } = useBizCollection<ScheduleEvent>(businessId, "bizSchedule", "asc");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [assignee, setAssignee] = useState("");
  const [type, setType] = useState("Shift");
  const [repeat, setRepeat] = useState("Does not repeat");
  const [repeatUntil, setRepeatUntil] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    if (repeat === "Does not repeat" || !repeatUntil) {
      await add({ title, date, time, assignee, type, repeatLabel: repeat !== "Does not repeat" ? repeat : undefined });
    } else {
      let cursor: string | null = date;
      let count = 0;
      const writes: Promise<any>[] = [];
      while (cursor && cursor <= repeatUntil && count < 52) {
        writes.push(add({ title, date: cursor, time, assignee, type, repeatLabel: repeat }));
        cursor = nextOccurrence(cursor, repeat);
        count++;
      }
      await Promise.all(writes);
    }
    setTitle(""); setDate(""); setTime(""); setAssignee(""); setRepeat("Does not repeat"); setRepeatUntil(""); setFormOpen(false);
  };

  const grouped = items.reduce<Record<string, ScheduleEvent[]>>((acc, ev) => { (acc[ev.date] ||= []).push(ev); return acc; }, {});

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: bizToolTint, cursor: "pointer", fontSize: 13, marginBottom: 14, padding: 0 }}><ChevronLeft size={14} /> Workspace</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Schedule</h3>
        {!formOpen && <button onClick={() => setFormOpen(true)} style={bizBtnStyle}>+ New</button>}
      </div>

      {formOpen && (
        <form onSubmit={submit}>
          <BizFormCard onCancel={() => setFormOpen(false)}>
            <input placeholder="Title (e.g. Morning shift, Client fitting)" value={title} onChange={(e) => setTitle(e.target.value)} style={bizInputStyle} required />
            <div style={{ display: "flex", gap: 8 }}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={bizInputStyle} required />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={bizInputStyle} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Assigned to" value={assignee} onChange={(e) => setAssignee(e.target.value)} style={bizInputStyle} />
              <select value={type} onChange={(e) => setType(e.target.value)} style={bizInputStyle}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={repeat} onChange={(e) => setRepeat(e.target.value)} style={{ ...bizInputStyle, flex: 1 }}>{REPEATS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
              {repeat !== "Does not repeat" && <input type="date" placeholder="Repeat until" value={repeatUntil} onChange={(e) => setRepeatUntil(e.target.value)} min={date} style={{ ...bizInputStyle, flex: 1 }} />}
            </div>
            <button type="submit" style={bizBtnStyle}>Add to Schedule</button>
          </BizFormCard>
        </form>
      )}

      {items.length === 0 && <BizEmptyState label="Nothing scheduled yet." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {Object.keys(grouped).sort().map((date) => (
          <div key={date}>
            <div style={{ fontSize: 11, fontWeight: 800, color: bizToolTint, marginBottom: 8, letterSpacing: 0.5 }}>
              {new Date(date + "T00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {grouped[date].map((ev) => (
                <BizRow key={ev.id} onDelete={() => remove(ev.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                        {ev.title}
                        {ev.repeatLabel && <span title={ev.repeatLabel} style={{ display: "inline-flex" }}><Repeat size={11} color={bizToolTint} /></span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: bizTextMuted }}>{ev.type} {ev.assignee && `· ${ev.assignee}`} {ev.repeatLabel && `· ${ev.repeatLabel}`}</div>
                    </div>
                    {ev.time && <div style={{ fontSize: 12, color: bizTextMuted }}>{ev.time}</div>}
                  </div>
                </BizRow>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------- Forms ------------------------------- */

interface FormDef { id: string; title: string; description: string; fields: string[]; }
interface FormResponse { id: string; answers: Record<string, string>; }

const FormResponses: React.FC<{ businessId: string; form: FormDef; onBack: () => void }> = ({ businessId, form, onBack }) => {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  React.useEffect(() => {
    const q = query(collection(db, "business", businessId, "bizForms", form.id, "responses"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => setResponses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
  }, [businessId, form.id]);

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: bizToolTint, cursor: "pointer", fontSize: 13, marginBottom: 14, padding: 0 }}><ChevronLeft size={14} /> Back to forms</button>
      <h3 style={{ margin: "0 0 4px" }}>{form.title}</h3>
      <p style={{ fontSize: 12.5, color: bizTextMuted, marginBottom: 16 }}>{responses.length} response{responses.length === 1 ? "" : "s"}</p>
      {responses.length === 0 && <BizEmptyState label="No submissions yet. Share this form's link to start collecting." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {responses.map((r) => (
          <BizRow key={r.id}>
            {form.fields.map((f) => (<div key={f} style={{ marginBottom: 4, fontSize: 13 }}><span style={{ color: bizTextMuted }}>{f}: </span><span style={{ fontWeight: 600 }}>{r.answers?.[f] || "—"}</span></div>))}
          </BizRow>
        ))}
      </div>
    </div>
  );
};

const FormsView: React.FC<{ businessId: string; onBack: () => void }> = ({ businessId, onBack }) => {
  const { items, add, remove } = useBizCollection<FormDef>(businessId, "bizForms");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fieldsText, setFieldsText] = useState("");
  const [openForm, setOpenForm] = useState<FormDef | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const fields = fieldsText.split(",").map((f) => f.trim()).filter(Boolean);
    await add({ title, description, fields: fields.length ? fields : ["Response"] });
    setTitle(""); setDescription(""); setFieldsText(""); setFormOpen(false);
  };

  if (openForm) return <FormResponses businessId={businessId} form={openForm} onBack={() => setOpenForm(null)} />;

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: bizToolTint, cursor: "pointer", fontSize: 13, marginBottom: 14, padding: 0 }}><ChevronLeft size={14} /> Workspace</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Forms</h3>
        {!formOpen && <button onClick={() => setFormOpen(true)} style={bizBtnStyle}>+ New</button>}
      </div>
      {formOpen && (
        <form onSubmit={submit}>
          <BizFormCard onCancel={() => setFormOpen(false)}>
            <input placeholder="Form title (e.g. Time-off request)" value={title} onChange={(e) => setTitle(e.target.value)} style={bizInputStyle} required />
            <input placeholder="Short description" value={description} onChange={(e) => setDescription(e.target.value)} style={bizInputStyle} />
            <input placeholder="Fields, comma separated (e.g. Name, Date, Reason)" value={fieldsText} onChange={(e) => setFieldsText(e.target.value)} style={bizInputStyle} />
            <button type="submit" style={bizBtnStyle}>Create Form</button>
          </BizFormCard>
        </form>
      )}
      {items.length === 0 && <BizEmptyState label="No forms yet." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((f) => (
          <BizRow key={f.id} onDelete={() => remove(f.id)}>
            <div onClick={() => setOpenForm(f)} style={{ cursor: "pointer" }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{f.title}</div>
              <div style={{ fontSize: 11.5, color: bizTextMuted }}>{f.fields.join(" · ")}</div>
            </div>
          </BizRow>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------- Sheets ------------------------------- */

// Firestore rejects arrays-of-arrays ("nested arrays are not supported"),
// so the grid is serialized to a JSON string for storage and parsed back
// into string[][] wherever it's actually used as a grid.
interface SheetDoc { id: string; title: string; gridJson?: string; }
interface Sheet { id: string; title: string; grid: string[][]; }

const emptyGrid = (rows = 6, cols = 4): string[][] => Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));

function parseGrid(gridJson?: string): string[][] {
  if (!gridJson) return emptyGrid();
  try {
    const parsed = JSON.parse(gridJson);
    return Array.isArray(parsed) && parsed.length ? parsed : emptyGrid();
  } catch {
    return emptyGrid();
  }
}

const SheetEditor: React.FC<{ sheet: Sheet; onBack: () => void; onSave: (grid: string[][]) => void }> = ({ sheet, onBack, onSave }) => {
  const [grid, setGrid] = useState<string[][]>(sheet.grid?.length ? sheet.grid : emptyGrid());
  const setCell = (r: number, c: number, val: string) => setGrid((g) => g.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row)));
  const addRow = () => setGrid((g) => [...g, Array.from({ length: g[0]?.length || 4 }, () => "")]);
  const addCol = () => setGrid((g) => g.map((row) => [...row, ""]));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: bizToolTint, cursor: "pointer", fontSize: 13, padding: 0 }}><ChevronLeft size={14} /> Back</button>
        <button onClick={() => onSave(grid)} style={bizBtnStyle}>Save Sheet</button>
      </div>
      <h3 style={{ margin: "0 0 12px" }}>{sheet.title}</h3>
      <div style={{ overflowX: "auto", border: "1px solid #E7ECF3", borderRadius: 12, background: "#fff" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {grid.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} style={{ border: "1px solid #EEF1F6", padding: 0 }}>
                    <input value={cell} onChange={(e) => setCell(r, c, e.target.value)} style={{ width: 110, background: "transparent", border: "none", color: "#0F172A", padding: "8px 10px", fontSize: 12.5, outline: "none" }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={addRow} style={bizBtnGhostStyle}><Plus size={13} style={{ verticalAlign: -2 }} /> Row</button>
        <button onClick={addCol} style={bizBtnGhostStyle}><Plus size={13} style={{ verticalAlign: -2 }} /> Column</button>
      </div>
    </div>
  );
};

const SheetsView: React.FC<{ businessId: string; onBack: () => void }> = ({ businessId, onBack }) => {
  const { items: rawItems, add, update, remove } = useBizCollection<SheetDoc>(businessId, "bizSheets");
  const items: Sheet[] = rawItems.map((s) => ({ id: s.id, title: s.title, grid: parseGrid(s.gridJson) }));
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await add({ title, gridJson: JSON.stringify(emptyGrid()) });
    setTitle(""); setFormOpen(false);
  };

  if (openSheet) {
    const live = items.find((s) => s.id === openSheet.id) || openSheet;
    return <SheetEditor sheet={live} onBack={() => setOpenSheet(null)} onSave={(grid) => { update(live.id, { gridJson: JSON.stringify(grid) }); setOpenSheet(null); }} />;
  }

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: bizToolTint, cursor: "pointer", fontSize: 13, marginBottom: 14, padding: 0 }}><ChevronLeft size={14} /> Workspace</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Sheets</h3>
        {!formOpen && <button onClick={() => setFormOpen(true)} style={bizBtnStyle}>+ New</button>}
      </div>
      {formOpen && (
        <form onSubmit={create} style={{ marginBottom: 20 }}>
          <BizFormCard onCancel={() => setFormOpen(false)}>
            <input placeholder="Sheet name (e.g. Supplier costs)" value={title} onChange={(e) => setTitle(e.target.value)} style={bizInputStyle} required />
            <button type="submit" style={bizBtnStyle}>Create</button>
          </BizFormCard>
        </form>
      )}
      {items.length === 0 && <BizEmptyState label="No sheets yet." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((s) => (
          <BizRow key={s.id} onDelete={() => remove(s.id)}>
            <div onClick={() => setOpenSheet(s)} style={{ cursor: "pointer", fontWeight: 700, fontSize: 13.5 }}>{s.title}</div>
          </BizRow>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------- Root ------------------------------- */

const BizWorkspace: React.FC<{ businessId: string; onClose: () => void }> = ({ businessId, onClose }) => {
  const [mode, setMode] = useState<Mode>("home");

  return (
    <BizToolShell title="Workspace" subtitle="Schedule, forms, and sheets — all your structured data in one place" onClose={onClose}>
      {mode === "schedule" && <ScheduleView businessId={businessId} onBack={() => setMode("home")} />}
      {mode === "forms" && <FormsView businessId={businessId} onBack={() => setMode("home")} />}
      {mode === "sheets" && <SheetsView businessId={businessId} onBack={() => setMode("home")} />}
      {mode === "home" && (
        <BizActionGrid>
          <BizActionButton icon={CalendarDays} label="Schedule" sub="Shifts, appointments & recurring events" onClick={() => setMode("schedule")} />
          <BizActionButton icon={FileText} label="Forms" sub="Collect information with a custom form" onClick={() => setMode("forms")} />
          <BizActionButton icon={Table} label="Sheets" sub="A simple spreadsheet for business data" onClick={() => setMode("sheets")} />
        </BizActionGrid>
      )}
    </BizToolShell>
  );
};

export default BizWorkspace;