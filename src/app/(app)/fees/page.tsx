"use client";
import { useCallback, useEffect, useState } from "react";
import { FaMoneyBillWave, FaPrint, FaTrash } from "react-icons/fa";
import { api, currentMonth, money, today } from "@/lib/api";
import { confirmDelete, formDialog, toast } from "@/lib/alerts";
import { printChalan } from "@/lib/print";
import { useSession } from "@/components/session";

const badge: any = { paid: "bg-green-100 text-green-700", partial: "bg-amber-100 text-amber-700", unpaid: "bg-red-100 text-red-700" };
const head = ["Chalan #", "Student", "Class", "Fee", "Previous pending", "Total payable", "Received", "This month pending", "Balance", "Status", "Received on", "Received by", "Narration", "Actions"];

export default function FeesPage() {
  const { user } = useSession();
  const isSchool = user.role === "school";
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(() => api(`/api/fees?month=${month}`).then((d) => setRows(d.items)).catch((e) => toast("error", e.message)), [month]);
  useEffect(() => { load(); }, [load]);

  async function generate() {
    try { const d = await api("/api/fees/generate", { method: "POST", body: { month } }); toast("success", `${d.created} chalan(s) created`); load(); }
    catch (e: any) { toast("error", e.message); }
  }
  async function receive(f: any) {
    const prev = f.previous || 0, balance = prev + f.amount - f.paid;
    if (balance <= 0) return toast("info", "Already fully paid");
    const v = await formDialog(`Receive fee - ${f.student?.name} (Balance ${money(balance)})`, [
      { name: "amount", label: `Amount (previous pending ${money(prev)} + this month ${money(f.amount - f.paid)})`, type: "number", required: true },
      { name: "date", label: "Receiving date", type: "date", required: true },
      { name: "receivedBy", label: "Received by", required: true },
      { name: "narration", label: "Narration (optional)", type: "textarea" },
    ], { amount: balance, date: today(), receivedBy: user.name });
    if (!v) return;
    if (!(v.amount > 0) || v.amount > balance) return toast("error", `Amount must be between 1 and ${balance}`);
    try { await api("/api/fees/receive", { method: "POST", body: { fee: f._id, ...v } }); toast("success", "Fee received"); load(); }
    catch (e: any) { toast("error", e.message); }
  }
  async function remove(f: any) {
    if (!(await confirmDelete())) return;
    try { await api(`/api/fees/${f._id}`, { method: "DELETE" }); toast("success", "Deleted"); load(); }
    catch (e: any) { toast("error", e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Fee Chalan & Receiving</h1>
        <div className="flex gap-2">
          <input type="month" className="input w-full min-w-0 flex-1 sm:w-44 sm:flex-none" value={month} onChange={(e) => setMonth(e.target.value)} />
          {isSchool && <button className="btn" onClick={generate}>Generate chalans</button>}
        </div>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[600px]">
          <thead><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((f) => {
              const prev = f.previous || 0, pend = f.amount - f.paid, balance = prev + pend, total = prev + f.amount;
              const st = balance <= 0 ? "paid" : balance < total ? "partial" : "unpaid";
              const last = (f.payments || [])[(f.payments || []).length - 1];
              return (
                <tr key={f._id} className="border-t">
                  <td className="td">{f.chalanNo}</td><td className="td">{f.student?.name}</td><td className="td">{f.student?.className}</td>
                  <td className="td">{money(f.amount)}</td><td className="td">{money(prev)}</td><td className="td">{money(total)}</td><td className="td">{money(f.paid)}</td>
                  <td className="td">{money(pend)}</td><td className="td font-semibold">{money(balance)}</td>
                  <td className="td"><span className={`rounded px-2 py-1 text-xs capitalize ${badge[st]}`}>{({ paid: "Received", partial: "Part received", unpaid: "Pending" } as any)[st]}</span></td>
                  <td className="td whitespace-nowrap">{last?.date || "-"}</td><td className="td">{last?.receivedBy || "-"}</td><td className="td min-w-40">{last?.narration || "-"}</td>
                  <td className="td whitespace-nowrap">
                    <button className="icon-btn text-green-600" title="Receive fee" onClick={() => receive(f)}><FaMoneyBillWave /></button>
                    <button className="icon-btn text-slate-600" title="Print chalan" onClick={() => printChalan(f, user.schoolInfo)}><FaPrint /></button>
                    {isSchool && <button className="icon-btn text-red-600" title="Delete" onClick={() => remove(f)}><FaTrash /></button>}
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={head.length} className="td py-8 text-center text-slate-400">No chalans for this month.{isSchool ? " Add students, then click Generate chalans." : ""}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
