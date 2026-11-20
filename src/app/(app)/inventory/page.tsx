"use client";
import { useState } from "react";
import { FaPen, FaPlus, FaPrint, FaTrash } from "react-icons/fa";
import { api, money } from "@/lib/api";
import { confirmDelete, formDialog, toast } from "@/lib/alerts";
import { stockLabel, stockOf, stockValue, belowAlert, ITEM_CATEGORIES, ITEM_UNITS } from "@/lib/inventory-calc";
import { useInventory } from "@/lib/inventory-data";
import { printStockReport } from "@/lib/print";
import { useSession } from "@/components/session";

// Items (Stock): the store master file with the live stock of every item.
export default function ItemsPage() {
  const { user } = useSession();
  const { items, moves, loading, reload } = useInventory();
  const [q, setQ] = useState("");

  const rows = items.map((i) => ({
    ...i,
    moves: moves.filter((m) => String(m.item?._id || m.item) === String(i._id)),
  })).map((i) => ({ ...i, stock: stockOf(i, i.moves), value: stockValue(i, i.moves), alert: belowAlert(i, i.moves) }));

  async function save(row?: any) {
    const v = await formDialog(row ? "Edit item" : "Add Items - Stationery, Books, Furniture & Equipment", [
      { name: "name", label: "Item Name", required: true },
      { name: "category", label: "Category", type: "select", options: ITEM_CATEGORIES },
      { name: "unit", label: "Unit (pcs, box, set)", type: "select", options: row?.unit && !ITEM_UNITS.includes(row.unit) ? [...ITEM_UNITS, row.unit] : ITEM_UNITS },
      { name: "rate", label: "Rate (Rs)", type: "number" },
      { name: "openingStock", label: "Opening Stock", type: "number" },
      { name: "minStock", label: "Minimum Stock Alert", type: "number", hint: "The item is marked in red when the stock reaches this number." },
    ], row ? { ...row, unit: row.unit || "pcs" } : { unit: "pcs", category: "Stationery" });
    if (!v) return;
    try {
      await api(row ? `/api/inventory/items/${row._id}` : "/api/inventory/items", { method: row ? "PUT" : "POST", body: v });
      toast("success", "Saved"); reload();
    } catch (e: any) { toast("error", e.message); }
  }

  async function remove(row: any) {
    if (!(await confirmDelete("This item will be removed from the store list."))) return;
    try { await api(`/api/inventory/items/${row._id}`, { method: "DELETE" }); toast("success", "Deleted"); reload(); }
    catch (e: any) { toast("error", e.message); }
  }

  const term = q.trim().toLowerCase();
  const shown = rows.filter((r) => !term || [r.name, r.category, r.unit].join(" ").toLowerCase().includes(term));
  const totalValue = rows.reduce((s, r) => s + r.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{stockLabel}</h1>
          <p className="mt-1 text-sm text-slate-500">Store items with their live stock. Stock comes from the opening stock plus Stock In minus Stock Out (purchases add stock automatically).</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input className="input min-w-0 flex-1 sm:w-48 sm:flex-none" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-light" title="Print stock report" onClick={() => printStockReport(shown, user?.schoolInfo)}><FaPrint /><span className="hidden sm:inline">Print</span></button>
          <button className="btn flex items-center gap-2 whitespace-nowrap" onClick={() => save()}><FaPlus /> Add New</button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[700px]">
          <thead><tr>{["Item", "Category", "Unit", "Rate", "In Stock", "Value", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="td font-medium">{r.name}</td>
                <td className="td">{r.category}</td>
                <td className="td">{r.unit}</td>
                <td className="td">{money(r.rate)}</td>
                <td className="td">
                  <span className={r.alert ? "font-bold text-red-600" : "font-semibold"}>{r.stock.toLocaleString()}</span>
                  {r.alert && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">Low</span>}
                </td>
                <td className="td font-semibold">{money(r.value)}</td>
                <td className="td whitespace-nowrap">
                  <button className="icon-btn text-blue-600" title="Edit" aria-label={`Edit ${r.name}`} onClick={() => save(r)}><FaPen /></button>
                  <button className="icon-btn text-red-600" title="Delete" aria-label={`Delete ${r.name}`} onClick={() => remove(r)}><FaTrash /></button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={7} className="td py-8 text-center text-slate-400">{loading ? "Loading items..." : "No items yet. Add books, stationery, furniture or equipment."}</td></tr>}
          </tbody>
          {!!shown.length && <tfoot><tr className="border-t bg-slate-50 font-semibold"><td className="td" colSpan={5}>Total stock value</td><td className="td">{money(totalValue)}</td><td className="td"></td></tr></tfoot>}
        </table>
      </div>
    </div>
  );
}
