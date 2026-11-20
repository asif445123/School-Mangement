"use client";
import { useState } from "react";
import { FaPen, FaPlus, FaTrash } from "react-icons/fa";
import { api, money } from "@/lib/api";
import { confirmDelete, formDialog, toast } from "@/lib/alerts";
import { supplierLedger } from "@/lib/inventory-calc";
import { useInventory } from "@/lib/inventory-data";

// Suppliers: the supplier master file.
export default function SuppliersPage() {
  const { suppliers, invoices, payments, loading, reload } = useInventory();
  const [q, setQ] = useState("");

  async function save(row?: any) {
    const v = await formDialog(row ? "Edit Supplier" : "Add Suppliers", [
      { name: "name", label: "Supplier Name", required: true },
      { name: "phone", label: "Phone" },
      { name: "address", label: "Address" },
      { name: "openingPayable", label: "Opening Payable Balance", type: "number" },
    ], row || { openingPayable: 0 });
    if (!v) return;
    try {
      await api(row ? `/api/inventory/suppliers/${row._id}` : "/api/inventory/suppliers", { method: row ? "PUT" : "POST", body: v });
      toast("success", "Saved"); reload();
    } catch (e: any) { toast("error", e.message); }
  }

  async function remove(row: any) {
    if (!(await confirmDelete("This supplier will be removed."))) return;
    try { await api(`/api/inventory/suppliers/${row._id}`, { method: "DELETE" }); toast("success", "Deleted"); reload(); }
    catch (e: any) { toast("error", e.message); }
  }

  const term = q.trim().toLowerCase();
  const shown = suppliers.map((s) => ({ ...s, balance: supplierLedger(s, invoices, payments).balance }))
    .filter((r) => !term || [r.name, r.phone, r.address].join(" ").toLowerCase().includes(term));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Suppliers</h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <input className="input min-w-0 flex-1 sm:w-56 sm:flex-none" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn flex items-center gap-2 whitespace-nowrap" onClick={() => save()}><FaPlus /> Add New</button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[700px]">
          <thead><tr>{["Supplier", "Phone", "Address", "Opening Payable", "Balance Payable", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="td font-medium">{r.name}</td>
                <td className="td">{r.phone || "-"}</td>
                <td className="td">{r.address || "-"}</td>
                <td className="td">{money(r.openingPayable)}</td>
                <td className={`td font-semibold ${r.balance > 0 ? "text-red-600" : ""}`}>{money(r.balance)}</td>
                <td className="td whitespace-nowrap">
                  <button className="icon-btn text-blue-600" title="Edit" aria-label={`Edit ${r.name}`} onClick={() => save(r)}><FaPen /></button>
                  <button className="icon-btn text-red-600" title="Delete" aria-label={`Delete ${r.name}`} onClick={() => remove(r)}><FaTrash /></button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={6} className="td py-8 text-center text-slate-400">{loading ? "Loading..." : "No suppliers yet"}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
