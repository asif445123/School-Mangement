"use client";
import { useState } from "react";
import { FaPen, FaPlus, FaTrash } from "react-icons/fa";
import { api, today } from "@/lib/api";
import { confirmDelete, formDialog, toast } from "@/lib/alerts";
import { REQUISITION_STATUS } from "@/lib/inventory-calc";
import { useInventory } from "@/lib/inventory-data";

const statusClass = (s: string) =>
  s === "Approved" ? "bg-green-100 text-green-700"
    : s === "Rejected" ? "bg-red-100 text-red-700"
      : s === "Ordered" ? "bg-blue-100 text-blue-700"
        : "bg-amber-100 text-amber-700";

// Purchase Requisition: a department asks the office to buy something.
export default function RequisitionsPage() {
  const { requisitions, loading, reload } = useInventory();
  const [q, setQ] = useState("");

  async function save(row?: any) {
    const v = await formDialog(row ? "Edit Purchase Requisition" : "Add Purchase Requisition", [
      { name: "date", label: "Date", type: "date" },
      { name: "item", label: "Item / Description", required: true },
      { name: "quantity", label: "Quantity", type: "number", required: true },
      { name: "department", label: "Department" },
      { name: "requestedBy", label: "Requested By" },
      { name: "status", label: "Status", type: "select", options: REQUISITION_STATUS },
      { name: "note", label: "Note", type: "textarea" },
    ], row || { date: today(), status: "Pending" });
    if (!v) return;
    if (!(Number(v.quantity) > 0)) return toast("error", "Quantity must be greater than 0");
    try {
      await api(row ? `/api/inventory/requisitions/${row._id}` : "/api/inventory/requisitions", { method: row ? "PUT" : "POST", body: v });
      toast("success", "Saved"); reload();
    } catch (e: any) { toast("error", e.message); }
  }

  async function remove(row: any) {
    if (!(await confirmDelete())) return;
    try { await api(`/api/inventory/requisitions/${row._id}`, { method: "DELETE" }); toast("success", "Deleted"); reload(); }
    catch (e: any) { toast("error", e.message); }
  }

  const term = q.trim().toLowerCase();
  const shown = requisitions.filter((r) => !term || [r.date, r.item, r.department, r.requestedBy, r.status, r.quantity, r.note].join(" ").toLowerCase().includes(term));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Purchase Requisition</h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <input className="input min-w-0 flex-1 sm:w-56 sm:flex-none" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn flex items-center gap-2 whitespace-nowrap" onClick={() => save()}><FaPlus /> Add New</button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[700px]">
          <thead><tr>{["Date", "Item", "Qty", "Dept", "By", "Status", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="td whitespace-nowrap">{r.date}</td>
                <td className="td font-medium">{r.item}{r.note ? <span className="block text-xs text-slate-500">{r.note}</span> : null}</td>
                <td className="td">{r.quantity}</td>
                <td className="td">{r.department || "-"}</td>
                <td className="td">{r.requestedBy || "-"}</td>
                <td className="td"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(r.status)}`}>{r.status}</span></td>
                <td className="td whitespace-nowrap">
                  <button className="icon-btn text-blue-600" title="Edit" aria-label={`Edit ${r.item}`} onClick={() => save(r)}><FaPen /></button>
                  <button className="icon-btn text-red-600" title="Delete" aria-label={`Delete ${r.item}`} onClick={() => remove(r)}><FaTrash /></button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={7} className="td py-8 text-center text-slate-400">{loading ? "Loading..." : "No requisitions yet"}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
