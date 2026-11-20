"use client";
import { useState } from "react";
import { FaTrash } from "react-icons/fa";
import { api, money, today } from "@/lib/api";
import { confirmDelete, toast } from "@/lib/alerts";
import { stockOf } from "@/lib/inventory-calc";
import { useInventory } from "@/lib/inventory-data";

// Stock In / Out: receive or issue store items. A Stock Out is also posted as
// an expense (quantity x rate) in Enter Expenses.
export default function StockPage() {
  const { items, moves, loading, reload } = useInventory();
  const [item, setItem] = useState("");
  const [type, setType] = useState("in");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const stockOfItem = (id: string) => {
    const it = items.find((i) => i._id === id);
    return it ? stockOf(it, moves.filter((m) => String(m.item?._id || m.item) === id)) : 0;
  };

  async function save() {
    if (!item) return toast("error", "Select an item");
    if (!(Number(qty) > 0)) return toast("error", "Quantity must be greater than 0");
    setBusy(true);
    try {
      await api("/api/inventory/stock-moves", { method: "POST", body: { item, type, qty: Number(qty), date, note } });
      toast("success", type === "out" ? "Stock out saved and expense posted" : "Stock in saved");
      setQty(""); setNote(""); reload();
    } catch (e: any) { toast("error", e.message); }
    finally { setBusy(false); }
  }

  async function remove(move: any) {
    if (!(await confirmDelete("This stock movement will be removed."))) return;
    try { await api(`/api/inventory/stock-moves/${move._id}`, { method: "DELETE" }); toast("success", "Deleted"); reload(); }
    catch (e: any) { toast("error", e.message); }
  }

  const shown = [...moves].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2"><label className="text-sm text-slate-600">Item</label>
            <select className="input mt-1" value={item} onChange={(e) => setItem(e.target.value)}>
              <option value="">Select item...</option>
              {items.map((it) => <option key={it._id} value={it._id}>{it.name} (stock {stockOfItem(it._id)})</option>)}
            </select>
          </div>
          <div><label className="text-sm text-slate-600">Type</label>
            <select className="input mt-1" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="in">Stock In</option>
              <option value="out">Stock Out</option>
            </select>
          </div>
          <div><label className="text-sm text-slate-600">Qty</label><input type="number" min={0} className="input mt-1" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div><label className="text-sm text-slate-600">Date</label><input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="flex gap-2"><div className="min-w-0 flex-1"><label className="text-sm text-slate-600">Note / Issued to</label><input className="input mt-1" value={note} onChange={(e) => setNote(e.target.value)} /></div></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Stationery / Books ka Stock Out hone par cost ka expense entry khud post hoti hai.</p>
          <button className="btn !bg-emerald-700 hover:!bg-emerald-800" disabled={busy} onClick={save}>Save</button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px]">
          <thead><tr>{["Date", "Item", "Type", "Qty", "Rate", "Note", "Ref", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((m) => (
              <tr key={m._id} className="border-t">
                <td className="td whitespace-nowrap">{m.date}</td>
                <td className="td font-medium">{m.item?.name || "-"}</td>
                <td className="td"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${m.type === "out" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{m.type === "out" ? "Out" : "In"}</span></td>
                <td className="td">{m.qty}</td>
                <td className="td">{money(m.rate)}</td>
                <td className="td">{m.note || "-"}</td>
                <td className="td">{m.ref || "-"}</td>
                <td className="td">
                  {m.ref ? <span className="text-xs text-slate-400">from {m.ref}</span>
                    : <button className="icon-btn text-red-600" title="Delete" aria-label="Delete movement" onClick={() => remove(m)}><FaTrash /></button>}
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={8} className="td py-8 text-center text-slate-400">{loading ? "Loading..." : "No stock movements yet"}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
