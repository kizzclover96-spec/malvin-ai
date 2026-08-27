import React from "react";
import { X, BarChart3, QrCode, Bell, Lock, Users, Package, MessageCircle } from "lucide-react";
import { formatBytes } from "../../../utils/storage";
import type { StorageState } from "../../../utils/storage";
import { useBizCollection } from "./BizToolShared";

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string; sub?: string }> = ({ icon: Icon, label, value, sub }) => (
  <div style={{ background: "#fff", border: "1px solid #E7ECF3", borderRadius: 18, padding: 18, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <Icon size={15} color="#2563EB" />
      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "#2563EB" }}>{label}</span>
    </div>
    <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>{value}</div>
    {sub && <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>{sub}</div>}
  </div>
);

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "#2563EB", margin: "26px 0 10px" }}>{label}</div>
);

const AnalyticsFullscreen: React.FC<{
  onClose: () => void;
  businessId: string;
  qrScans: number;
  noticeScans: number;
  storageState: StorageState;
  isPremium: boolean;
  memberCount?: number;
}> = ({ onClose, businessId, qrScans, noticeScans, storageState, isPremium, memberCount = 0 }) => {
  // App-wide counters — every tool the person could have used, tallied here.
  // Hooks run unconditionally (even on the locked/non-premium screen) so
  // hook order never changes between renders.
  const schedule = useBizCollection<any>(businessId, "bizSchedule");
  const forms = useBizCollection<any>(businessId, "bizForms");
  const sheets = useBizCollection<any>(businessId, "bizSheets");
  const documents = useBizCollection<any>(businessId, "bizDocuments");
  const expenses = useBizCollection<any>(businessId, "bizExpenses");
  const invoices = useBizCollection<any>(businessId, "bizInvoices");
  const polls = useBizCollection<any>(businessId, "bizPolls");
  const projects = useBizCollection<any>(businessId, "bizProjects");
  const records = useBizCollection<any>(businessId, "bizRecords");
  const decks = useBizCollection<any>(businessId, "bizPresentation");

  if (!isPremium) {
    return (
      <div style={{ minHeight: "100vh", background: "#F7F9FC", color: "#0F172A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30, textAlign: "center" }}>
        <button onClick={onClose} style={{ position: "fixed", top: 14, right: 14, background: "#EFF4FF", border: "none", borderRadius: "50%", width: 34, height: 34, color: "#2563EB", cursor: "pointer" }}><X size={16} /></button>
        <Lock size={26} style={{ marginBottom: 12, color: "#64748B" }} />
        <h2 style={{ margin: "0 0 8px" }}>Analytics is a Premium feature</h2>
        <p style={{ color: "#64748B", fontSize: 13, maxWidth: 320 }}>Upgrade to see everything happening across your Malvin account in one place.</p>
      </div>
    );
  }

  const pct = Math.min(100, storageState.percentUsed);
  const barColor = storageState.atLimit ? "#EF4444" : storageState.nearLimit ? "#F59E0B" : "#2563EB";

  const allTasks = (projects.items || []).flatMap((p: any) => p.tasks || []);
  const doneTasks = allTasks.filter((t: any) => t.done).length;
  const totalInvoiced = (invoices.items || []).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
  const totalPolls = (polls.items || []).length;
  const totalItems =
    schedule.items.length + forms.items.length + sheets.items.length + documents.items.length +
    expenses.items.length + invoices.items.length + polls.items.length + projects.items.length +
    records.items.length + decks.items.length;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F9FC", color: "#0F172A", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid #E7ECF3" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart3 size={18} color="#2563EB" />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Analytics</h1>
        </div>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "#EFF4FF", color: "#2563EB", cursor: "pointer" }}><X size={16} /></button>
      </div>

      <div style={{ padding: "20px 20px 60px" }}>
        <SectionHeader label="Reach" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <StatCard icon={QrCode} label="Total Scans" value={String(qrScans + noticeScans)} sub={`${qrScans} store · ${noticeScans} notice`} />
          <StatCard icon={Bell} label="Notice Reach" value={String(noticeScans)} sub="scans on your live notice" />
          <StatCard icon={Users} label="Team Members" value={String(memberCount)} sub="active in Team Hub" />
        </div>

        <SectionHeader label="Everything in Malvin" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <StatCard icon={Package} label="Total Items Tracked" value={String(totalItems)} sub="across every tool you've enabled" />
          <StatCard icon={MessageCircle} label="Schedule Entries" value={String(schedule.items.length)} sub={`${forms.items.length} forms · ${sheets.items.length} sheets`} />
          <StatCard icon={Package} label="Documents & Decks" value={String(documents.items.length + decks.items.length)} sub={`${documents.items.length} docs · ${decks.items.length} decks`} />
          <StatCard icon={Package} label="Projects" value={String(projects.items.length)} sub={`${doneTasks}/${allTasks.length} tasks complete`} />
          <StatCard icon={Package} label="Records Logged" value={String(records.items.length)} sub="structured entries" />
          <StatCard icon={Package} label="Polls Run" value={String(totalPolls)} sub="decisions put to a vote" />
          <StatCard icon={Package} label="Expense Entries" value={String(expenses.items.length)} sub="logged this account" />
          <StatCard icon={Package} label="Invoices" value={String(invoices.items.length)} sub={`totaling ${totalInvoiced.toFixed(2)}`} />
        </div>

        <SectionHeader label="Storage" />
        <div style={{ background: "#fff", border: "1px solid #E7ECF3", borderRadius: 18, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Storage used</span>
            <span style={{ fontSize: 12.5, color: "#64748B" }}>{formatBytes(storageState.usedBytes)} / {formatBytes(storageState.limitBytes)}</span>
          </div>
          <div style={{ height: 10, borderRadius: 6, background: "#EEF2F8", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: barColor, transition: "width 0.4s ease" }} />
          </div>
          <p style={{ fontSize: 11.5, color: "#64748B", marginTop: 10 }}>
            {storageState.atLimit
              ? "You're at your free storage limit — new uploads may fail until you upgrade or clear space."
              : storageState.nearLimit
              ? "You're close to your free storage limit. Consider upgrading your plan."
              : `${formatBytes(Math.max(0, storageState.limitBytes - storageState.usedBytes))} left on your current plan.`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsFullscreen;