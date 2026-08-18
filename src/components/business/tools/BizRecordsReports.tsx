import React, { useState } from "react";
import { firestore as db } from "../../../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import {
  BizToolShell, BizRow, BizEmptyState, BizFormCard, bizInputStyle, bizBtnStyle, bizBtnGhostStyle,
  bizToolTint, bizTextMuted, useBizCollection, BizActionGrid, BizActionButton,
} from "./BizToolShared";
import { Database, PieChart, ChevronLeft } from "lucide-react";

/* ============================================================================
   Records = Records + Reports, merged. A report is just records read back
   as a summary — they belong together, not as two things to remember to
   check separately.
============================================================================ */

type Mode = "home" | "records" | "reports";
interface RecordDoc { id: string; data: Record<string, string>; }

const RecordsView: React.FC<{ businessId: string; onBack: () => void }> = ({ businessId, onBack }) => {
  const [fields, setFields] = useState<string[]>([]);
  const [fieldsDraft, setFieldsDraft] = useState("");
  const { items, add, remove } = useBizCollection<RecordDoc>(businessId, "bizRecords");
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  React.useEffect(() => {
    const ref = doc(db, "businesses", businessId, "bizRecordsConfig", "fields");
    return onSnapshot(ref, (snap) => setFields(snap.data()?.fields || []));
  }, [businessId]);

  const saveFields = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = fieldsDraft.split(",").map((f) => f.trim()).filter(Boolean);
    if (!list.length) return;
    await setDoc(doc(db, "businesses", businessId, "bizRecordsConfig", "fields"), { fields: list });
    setFieldsDraft("");
  };

  const submitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields.some((f) => draft[f]?.trim())) return;
    await add({ data: draft });
    setDraft({}); setFormOpen(false);
  };

  if (fields.length === 0) {
    return (
      <div>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: bizToolTint, cursor: "pointer", fontSize: 13, marginBottom: 14, padding: 0 }}><ChevronLeft size={14} /> Records</button>
        <h3 style={{ margin: "0 0 8px" }}>Set up what you're tracking</h3>
        <p style={{ fontSize: 13, color: bizTextMuted, marginBottom: 16 }}>e.g. "Client, Vehicle, License Plate, Last Service"</p>
        <form onSubmit={saveFields} style={{ display: "flex", gap: 8 }}>
          <input placeholder="Field names, comma separated" value={fieldsDraft} onChange={(e) => setFieldsDraft(e.target.value)} style={bizInputStyle} />
          <button type="submit" style={bizBtnStyle}>Set Up</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: bizToolTint, cursor: "pointer", fontSize: 13, marginBottom: 14, padding: 0 }}><ChevronLeft size={14} /> Records</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>Records</h3>
        {!formOpen && <button onClick={() => setFormOpen(true)} style={bizBtnStyle}>+ New</button>}
      </div>
      <p style={{ fontSize: 11.5, color: bizTextMuted, marginBottom: 16 }}>Tracking: {fields.join(" · ")}</p>
      {formOpen && (
        <form onSubmit={submitRecord}>
          <BizFormCard onCancel={() => setFormOpen(false)}>
            {fields.map((f) => (<input key={f} placeholder={f} value={draft[f] || ""} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })} style={bizInputStyle} />))}
            <button type="submit" style={bizBtnStyle}>Add Record</button>
          </BizFormCard>
        </form>
      )}
      {items.length === 0 && <BizEmptyState label="No records yet." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((r) => (
          <BizRow key={r.id} onDelete={() => remove(r.id)}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
              {fields.map((f) => (<div key={f} style={{ fontSize: 12.5 }}><span style={{ color: bizTextMuted }}>{f}: </span><span style={{ fontWeight: 600 }}>{r.data?.[f] || "—"}</span></div>))}
            </div>
          </BizRow>
        ))}
      </div>
      <button onClick={() => setDoc(doc(db, "businesses", businessId, "bizRecordsConfig", "fields"), { fields: [] })} style={{ marginTop: 20, background: "none", border: "none", color: "#B0B9C6", fontSize: 11, cursor: "pointer" }}>Reset field setup</button>
    </div>
  );
};

const ReportCard: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div style={{ background: "#fff", border: "1px solid #E7ECF3", borderRadius: 16, padding: 18, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: bizToolTint, marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A" }}>{value}</div>
    {sub && <div style={{ fontSize: 11.5, color: bizTextMuted, marginTop: 4 }}>{sub}</div>}
  </div>
);

const ReportsView: React.FC<{ businessId: string; onBack: () => void; currency?: string }> = ({ businessId, onBack, currency = "€" }) => {
  const expenses = useBizCollection<any>(businessId, "bizExpenses");
  const invoices = useBizCollection<any>(businessId, "bizInvoices");
  const projects = useBizCollection<any>(businessId, "bizProjects");
  const schedule = useBizCollection<any>(businessId, "bizSchedule");
  const forms = useBizCollection<any>(businessId, "bizForms");
  const records = useBizCollection<any>(businessId, "bizRecords");

  const totalExpenses = expenses.items.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const invoicedTotal = invoices.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const paidTotal = invoices.items.filter((i) => i.status === "Paid").reduce((s, i) => s + Number(i.amount), 0);
  const outstanding = invoicedTotal - paidTotal;
  const allTasks = projects.items.flatMap((p) => p.tasks || []);
  const doneTasks = allTasks.filter((t: any) => t.done).length;
  const upcomingEvents = schedule.items.filter((e) => new Date(e.date) >= new Date(new Date().toDateString())).length;

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: bizToolTint, cursor: "pointer", fontSize: 13, marginBottom: 14, padding: 0 }}><ChevronLeft size={14} /> Records</button>
      <h3 style={{ margin: "0 0 4px" }}>Reports</h3>
      <p style={{ fontSize: 12.5, color: bizTextMuted, marginBottom: 18 }}>A live snapshot pulled from your other business tools.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <ReportCard label="Net Cash Flow" value={`${currency}${(paidTotal - totalExpenses).toFixed(2)}`} sub={`${currency}${paidTotal.toFixed(2)} in · ${currency}${totalExpenses.toFixed(2)} out`} />
        <ReportCard label="Outstanding Invoices" value={`${currency}${outstanding.toFixed(2)}`} sub={`${invoices.items.filter((i) => i.status !== "Paid").length} unpaid`} />
        <ReportCard label="Project Progress" value={allTasks.length ? `${Math.round((doneTasks / allTasks.length) * 100)}%` : "—"} sub={`${doneTasks}/${allTasks.length} tasks done across ${projects.items.length} project(s)`} />
        <ReportCard label="Upcoming Schedule" value={String(upcomingEvents)} sub="events/shifts ahead" />
        <ReportCard label="Active Forms" value={String(forms.items.length)} sub="collecting submissions" />
        <ReportCard label="Records Tracked" value={String(records.items.length)} sub="entries logged" />
      </div>
      <p style={{ fontSize: 11.5, color: bizTextMuted, marginTop: 22 }}>Updates automatically as Expenses, Invoices, Projects, Schedule, Forms and Records change.</p>
    </div>
  );
};

const BizRecordsReports: React.FC<{ businessId: string; onClose: () => void; currency?: string }> = ({ businessId, onClose, currency = "€" }) => {
  const [mode, setMode] = useState<Mode>("home");

  return (
    <BizToolShell title="Records" subtitle="Structured data, and the reports it turns into" onClose={onClose}>
      {mode === "records" && <RecordsView businessId={businessId} onBack={() => setMode("home")} />}
      {mode === "reports" && <ReportsView businessId={businessId} onBack={() => setMode("home")} currency={currency} />}
      {mode === "home" && (
        <BizActionGrid>
          <BizActionButton icon={Database} label="Records" sub="Structured entries for anything you track" onClick={() => setMode("records")} />
          <BizActionButton icon={PieChart} label="Reports" sub="See it all summarized in one view" onClick={() => setMode("reports")} />
        </BizActionGrid>
      )}
    </BizToolShell>
  );
};

export default BizRecordsReports;
