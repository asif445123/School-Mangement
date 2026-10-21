"use client";
import { useCallback, useEffect, useState } from "react";
import { FaPen, FaPlus, FaTimes, FaTrash } from "react-icons/fa";
import { api, money, today } from "@/lib/api";
import { confirmDelete, formDialog, toast } from "@/lib/alerts";

const emptyRow = () => ({ account: "", narration: "", amount: "" });
const label = (a: any) => `${a.code} - ${a.name}`;
const tabs: [string, string, string][] = [["code", "Code Wise", "Search account code..."], ["date", "Date Wise", "Search date e.g. 2026-10..."], ["narration", "Narration Wise", "Search narration..."], ["account", "Account Wise", "Search account name..."]];

export default function EntriesPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState([emptyRow(), emptyRow()]);
  const [tab, setTab] = useState("code");
  const [q, setQ] = useState("");
  const load = useCallback(() => Promise.all([api("/api/accounts"), api("/api/entries")]).then(([a, e]) => { setAccounts(a.items); setEntries(e.items); }).catch((e) => toast("error", e.message)), []);
  useEffect(() => { load(); }, [load]);

  const setRow = (i: number, k: string, v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const find = (text: string) => accounts.find((a) => label(a) === text || a.code === text.trim());
  const total = rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);

  async function save() {
    const filled = rows.filter((r) => r.account || r.amount || r.narration);
    if (!filled.length) return toast("error", "Add at least one entry");
    const body: any[] = [];
    for (const r of filled) {
      const acc = find(r.account);
      if (!acc) return toast("error", `Select a valid account for "${r.account || "empty row"}"`);
      if (!(Number(r.amount) > 0)) return toast("error", "Enter an amount for every entry");
      body.push({ account: acc._id, narration: r.narration, amount: Number(r.amount) });
    }
    try { await api("/api/entries/bulk", { method: "POST", body: { date, rows: body } }); toast("success", "Entries saved"); setRows([emptyRow(), emptyRow()]); load(); }
    catch (e: any) { toast("error", e.message); }
  }
  async function edit(row: any) {
    const v = await formDialog("Edit entry", [{ name: "date", label: "Date", type: "date", required: true }, { name: "narration", label: "Narration" }, { name: "amount", label: "Amount", type: "number", required: true }], row);
    if (!v) return;
    if (!(v.amount > 0)) return toast("error", "Amount must be greater than 0");
    try { await api(`/api/entries/${row._id}`, { method: "PUT", body: v }); toast("success", "Saved"); load(); }
    catch (e: any) { toast("error", e.message); }
  }
  async function remove(row: any) {
    if (!(await confirmDelete())) return;
    try { await api(`/api/entries/${row._id}`, { method: "DELETE" }); toast("success", "Deleted"); load(); }
    catch (e: any) { toast("error", e.message); }
  }

  const term = q.trim().toLowerCase();
  const shown = entries.filter((e) => !term || (tab === "date" ? e.date.includes(term) : tab === "narration" ? (e.narration || "").toLowerCase().includes(term) : tab === "code" ? String(e.account?.code || "").toLowerCase().includes(term) : String(e.account?.name || "").toLowerCase().includes(term)))
    .sort((a, b) => b.date.localeCompare(a.date));
  const placeholder = tabs.find((t) => t[0] === tab)![2];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Entries</h1>
      <div className="card space-y-4">
        <h2 className="font-semibold">Add entry</h2>
        <div><label className="text-sm text-slate-600">Date</label><input type="date" className="input mt-1 w-48" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <datalist id="account-list">{accounts.map((a) => <option key={a._id} value={label(a)} />)}</datalist>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full">
            <thead><tr><th className="th">#</th><th className="th">Account code</th><th className="th">Narration</th><th className="th">Amount</th><th className="th"></th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="td">{i + 1}</td>
                  <td className="td"><input className="input min-w-48" list="account-list" placeholder="Search account..." value={r.account} onChange={(e) => setRow(i, "account", e.target.value)} /></td>
                  <td className="td"><input className="input min-w-48" placeholder="Narration" value={r.narration} onChange={(e) => setRow(i, "narration", e.target.value)} /></td>
                  <td className="td"><input type="number" min={0} className="input w-32" placeholder="Amount" value={r.amount} onChange={(e) => setRow(i, "amount", e.target.value)} /></td>
                  <td className="td">{rows.length > 1 && <button className="icon-btn text-slate-400 hover:text-red-600" title="Remove row" onClick={() => setRows(rows.filter((_, j) => j !== i))}><FaTimes /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="flex items-center gap-2 text-sm font-medium text-emerald-700" onClick={() => setRows([...rows, emptyRow()])}><FaPlus /> Add entry row</button>
        <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Total amount</p><p className="text-lg font-bold">{money(total)}</p></div>
        <button className="btn !bg-emerald-700 hover:!bg-emerald-800" onClick={save}>Save</button>
      </div>

      <div className="space-y-3">
        <div className="card flex flex-wrap items-center gap-3">
          <div className="inline-flex overflow-hidden rounded-lg border">
            {tabs.map(([k, l]) => <button key={k} onClick={() => { setTab(k); setQ(""); }} className={`px-4 py-2 text-sm ${tab === k ? "bg-emerald-700 text-white" : "bg-white text-slate-600"}`}>{l}</button>)}
          </div>
          <input className="input w-60" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="card overflow-x-auto p-0">
          <table className="w-full">
            <thead><tr>{["Date", "Code", "Account", "Account type", "Narration", "Amount", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r._id} className="border-t">
                  <td className="td whitespace-nowrap">{r.date}</td><td className="td">{r.account?.code}</td><td className="td">{r.account?.name}</td>
                  <td className="td">{r.account?.accountType?.name}</td><td className="td">{r.narration}</td><td className="td font-semibold">{money(r.amount)}</td>
                  <td className="td whitespace-nowrap">
                    <button className="icon-btn text-blue-600" title="Edit" onClick={() => edit(r)}><FaPen /></button>
                    <button className="icon-btn text-red-600" title="Delete" onClick={() => remove(r)}><FaTrash /></button>
                  </td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={7} className="td py-8 text-center text-slate-400">No entries found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
