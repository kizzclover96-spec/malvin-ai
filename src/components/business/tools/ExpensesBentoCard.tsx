import React, { useState } from "react";
import { useBizCollection } from "./BizToolShared";
import { Receipt, ChevronDown, ChevronRight, Plus, X } from "lucide-react";

interface Expense { id: string; label: string; amount: number; category: string; date: string; receiptUrl?: string; }

const CATS = ["Supplies", "Rent", "Payroll", "Marketing", "Utilities", "Other"];

export const ExpensesBentoCard: React.FC<{ businessId: string; theme: any; accent: string; currency?: string }> = ({ businessId, theme, accent, currency = "€" }) => {
  const { items, add, remove } = useBizCollection<Expense>(businessId, "bizExpenses");
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Supplies");

  const now = new Date();
  const thisMonth = items.filter((e) => {
    const d = new Date(e.date || 0);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = thisMonth.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !amount) return;
    await add({ label, amount: Number(amount), category, date: new Date().toISOString().slice(0, 10) });
    setLabel(""); setAmount("");
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{currency}{monthTotal.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: theme.subtext }}>spent this month · {thisMonth.length} item{thisMonth.length === 1 ? "" : "s"}</div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          title={open ? "Close" : "Manage expenses"}
          style={{ width: 28, height: 28, borderRadius: "50%", background: `${accent}14`, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          {open ? <ChevronDown size={14} color={accent} /> : <ChevronRight size={14} color={accent} />}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, background: `${accent}0a`, border: `1px solid ${accent}22`, borderRadius: 12, padding: 10 }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input placeholder="Expense (e.g. Packaging boxes)" value={label} onChange={(e) => setLabel(e.target.value)} style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, border: `1px solid ${theme.cardBorder}`, background: theme.cardBg, color: theme.text }} />
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ flex: 1, fontSize: 12, padding: "8px 10px", borderRadius: 8, border: `1px solid ${theme.cardBorder}`, background: theme.cardBg, color: theme.text }} />
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ fontSize: 12, padding: "8px 6px", borderRadius: 8, border: `1px solid ${theme.cardBorder}`, background: theme.cardBg, color: theme.text }}>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button type="submit" style={{ background: accent, border: "none", color: "#fff", padding: "8px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <Plus size={12} /> Add Expense
            </button>
          </form>
          {items.length > 0 && (
            <div style={{ maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {items.slice(0, 20).map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, padding: "4px 2px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Receipt size={11} color={theme.subtext} />{e.label} <span style={{ opacity: 0.4 }}>· {e.category}</span></span>
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {currency}{Number(e.amount).toFixed(2)}
                    <button onClick={() => remove(e.id)} style={{ background: "none", border: "none", color: "rgba(220,60,60,0.7)", cursor: "pointer", display: "flex" }}><X size={11} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpensesBentoCard;