"use client";
import { useCallback, useEffect, useState } from "react";
import { FaPen, FaPlus, FaTrash } from "react-icons/fa";
import { api } from "@/lib/api";
import { typeFlags } from "@/lib/account-flags";
import { confirmDelete, formDialog, toast } from "@/lib/alerts";

// Account master file
export default function AccountMasterPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const load = useCallback(() => Promise.all([api("/api/accounts"), api("/api/accountTypes")]).then(([a, t]) => { setRows(a.items); setTypes(t.items); }).catch((e) => toast("error", e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function save(row?: any) {
    if (!types.length) return toast("info", "Create an account type first");
    const v = await formDialog(row ? "Edit account" : "Add account", [
      { name: "code", label: "Account code", required: true },
      { name: "name", label: "Account name", required: true },
      { name: "accountType", label: "Account type", type: "select", options: types.map((t) => t.name) },
    ], row ? { ...row, accountType: row.accountType?.name } : {});
    if (!v) return;
    const type = types.find((t) => t.name === v.accountType);
    try {
      await api(row ? `/api/accounts/${row._id}` : "/api/accounts", { method: row ? "PUT" : "POST", body: { code: v.code, name: v.name, accountType: type._id } });
      toast("success", "Saved"); load();
    } catch (e: any) { toast("error", e.message.includes("Duplicate") ? "Account code already exists" : e.message); }
  }
  async function remove(row: any) {
    if (!(await confirmDelete())) return;
    try { await api(`/api/accounts/${row._id}`, { method: "DELETE" }); toast("success", "Deleted"); load(); }
    catch (e: any) { toast("error", e.message); }
  }
  const shown = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Account Master</h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <input className="input min-w-0 flex-1 sm:w-48 sm:flex-none" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn flex items-center gap-2" onClick={() => save()}><FaPlus /> Add account</button>
        </div>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[600px]">
          <thead><tr>{["Code", "Account name", "Account type", "Account", "Counts as", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="td">{r.code}</td><td className="td">{r.name}</td><td className="td">{r.accountType?.name}</td>
                <td className="td">{[typeFlags(r.accountType).receivable && "Receivable", typeFlags(r.accountType).payable && "Payable"].filter(Boolean).join(" / ") || "-"}</td><td className="td">{[typeFlags(r.accountType).income && "Income", typeFlags(r.accountType).expense && "Expense"].filter(Boolean).join(" / ") || "-"}</td>
                <td className="td whitespace-nowrap">
                  <button className="icon-btn text-blue-600" title="Edit" onClick={() => save(r)}><FaPen /></button>
                  <button className="icon-btn text-red-600" title="Delete" onClick={() => remove(r)}><FaTrash /></button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={6} className="td py-8 text-center text-slate-400">No accounts yet. Create an account type, then add accounts.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
