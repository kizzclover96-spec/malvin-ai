import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { BizToolShell, BizRow, BizEmptyState, BizFormCard, bizInputStyle, bizBtnStyle, bizToolTint, bizTextMuted, useBizCollection } from "./BizToolShared";
import { Download } from "lucide-react";

interface Invoice { id: string; number: string; client: string; amount: number; status: "Draft" | "Sent" | "Paid" | "Overdue"; date: string; }

// Status colors stay semantic (paid=green, overdue=red) rather than brand
// colors — that's a meaningful signal, not decoration.
const STATUS_COLORS: Record<string, string> = { Draft: "#8E8E93", Sent: "#3B82F6", Paid: "#16A34A", Overdue: "#EF4444" };

function downloadInvoicePDF(invoice: Invoice, businessName: string, currency: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 56;
  doc.setFontSize(20); doc.setTextColor(15, 23, 42);
  doc.text(businessName || "Invoice", marginX, 70);
  doc.setFontSize(11); doc.setTextColor(100, 116, 139);
  doc.text(`Invoice ${invoice.number}`, marginX, 92);
  doc.text(`Date: ${invoice.date}`, marginX, 108);
  doc.text(`Status: ${invoice.status}`, marginX, 124);
  doc.setDrawColor(230, 230, 230);
  doc.line(marginX, 150, 539, 150);
  doc.setFontSize(12); doc.setTextColor(15, 23, 42);
  doc.text("Billed to", marginX, 178);
  doc.setFontSize(14);
  doc.text(invoice.client, marginX, 198);
  doc.setDrawColor(230, 230, 230);
  doc.line(marginX, 240, 539, 240);
  doc.setFontSize(11); doc.setTextColor(100, 116, 139);
  doc.text("Description", marginX, 264);
  doc.text("Amount", 480, 264, { align: "right" as any });
  doc.setFontSize(13); doc.setTextColor(15, 23, 42);
  doc.text(invoice.number, marginX, 288);
  doc.text(`${currency}${Number(invoice.amount).toFixed(2)}`, 480, 288, { align: "right" as any });
  doc.setDrawColor(230, 230, 230);
  doc.line(marginX, 320, 539, 320);
  doc.setFontSize(16);
  doc.text("Total", marginX, 350);
  doc.text(`${currency}${Number(invoice.amount).toFixed(2)}`, 480, 350, { align: "right" as any });
  doc.save(`${invoice.number}.pdf`);
}

const BizInvoices: React.FC<{ businessId: string; onClose: () => void; currency?: string; businessName?: string }> = ({ businessId, onClose, currency = "€", businessName = "" }) => {
  const { items, add, update, remove } = useBizCollection<Invoice>(businessId, "bizInvoices");
  const [formOpen, setFormOpen] = useState(false);
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.trim() || !amount) return;
    const number = `INV-${String(items.length + 1).padStart(4, "0")}`;
    await add({ number, client, amount: Number(amount), status: "Draft", date: new Date().toISOString().slice(0, 10) });
    setClient(""); setAmount(""); setFormOpen(false);
  };

  const totalOutstanding = items.filter((i) => i.status !== "Paid").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <BizToolShell
      title="Invoices"
      subtitle={`${currency}${totalOutstanding.toFixed(2)} outstanding across ${items.filter(i => i.status !== "Paid").length} invoice(s)`}
      onClose={onClose}
      headerAction={!formOpen && <button onClick={() => setFormOpen(true)} style={bizBtnStyle}>+ New</button>}
    >
      {formOpen && (
        <form onSubmit={submit}>
          <BizFormCard onCancel={() => setFormOpen(false)}>
            <input placeholder="Client name" value={client} onChange={(e) => setClient(e.target.value)} style={bizInputStyle} required />
            <input type="number" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={bizInputStyle} required />
            <button type="submit" style={bizBtnStyle}>Create Invoice</button>
          </BizFormCard>
        </form>
      )}

      {items.length === 0 && <BizEmptyState label="No invoices yet." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((inv) => (
          <BizRow key={inv.id} onDelete={() => remove(inv.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{inv.number} · {inv.client}</div>
                <div style={{ fontSize: 11.5, color: bizTextMuted }}>{inv.date} · {currency}{Number(inv.amount).toFixed(2)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => downloadInvoicePDF(inv, businessName, currency)}
                  title="Download PDF"
                  style={{ background: "#EFF4FF", border: "1px solid #DBE6FF", color: bizToolTint, borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                >
                  <Download size={13} />
                </button>
                <select
                  value={inv.status}
                  onChange={(e) => update(inv.id, { status: e.target.value })}
                  style={{ background: `${STATUS_COLORS[inv.status]}18`, color: STATUS_COLORS[inv.status], border: `1px solid ${STATUS_COLORS[inv.status]}55`, borderRadius: 8, fontSize: 11.5, fontWeight: 700, padding: "6px 10px" }}
                >
                  {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </BizRow>
        ))}
      </div>
    </BizToolShell>
  );
};

export default BizInvoices;