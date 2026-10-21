"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/lib/alerts";
import AccountActions, { badge } from "@/components/account-actions";

// Platform admin only: approve / reject / delete schools
export default function SchoolsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(() => api("/api/users").then((d) => setRows(d.items)).catch((e) => toast("error", e.message)), []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">School Approvals</h1>
      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr>{["School", "Admin name", "Email", "Phone", "Status", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u._id} className="border-t">
                <td className="td">{u.schoolName}</td><td className="td">{u.name}</td><td className="td">{u.email}</td><td className="td">{u.phone}</td>
                <td className="td"><span className={`rounded px-2 py-1 text-xs capitalize ${badge[u.status]}`}>{u.status}</span></td>
                <td className="td whitespace-nowrap"><AccountActions u={u} reload={load} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="td py-8 text-center text-slate-400">No schools yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
