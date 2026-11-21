"use client";
import { useEffect, useState } from "react";
import { api, currentMonth, money } from "@/lib/api";

// Fee Report (moved from Reports -> Student Reports): received vs pending
// fees for one month, with summary cards.
export default function FeeReport() {
  const [month, setMonth] = useState(currentMonth());
  const [fees, setFees] = useState<any[]>([]);

  useEffect(() => { api(`/api/fees?month=${month}`).then((d) => setFees(d.items)).catch(() => setFees([])); }, [month]);

  const fr = fees.map((f) => { const prev = f.previous || 0, pend = f.amount - f.paid; return { ...f, prev, pend, balance: prev + pend }; });
  const sum = (k: string) => fr.reduce((a, f) => a + (f[k] || 0), 0);
  const defaulters = fr.filter((f) => f.balance > 0);
  const received = fr.filter((f) => f.paid > 0);
  const cards = [["Fee (this month)", sum("amount")], ["Previous pending", sum("prev")], ["Received", sum("paid")], ["This month pending", sum("pend")], ["Total balance", sum("balance")]];

  return (
    <div className="space-y-4">
      <input type="month" className="input w-full sm:w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
      <div className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-5">
        {cards.map(([l, v]) => <div key={l as string} className="card"><p className="text-sm text-slate-500">{l}</p><p className="text-xl font-bold">{money(v as number)}</p></div>)}
      </div>
      <div className="card overflow-x-auto p-0">
        <h2 className="p-4 font-semibold">Received fees ({received.length})</h2>
        <table className="w-full min-w-[600px]"><thead><tr>{["Student", "Class", "Chalan #", "Received", "Received on", "Received by", "Narration", "Status"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{received.map((f) => { const last = (f.payments || [])[(f.payments || []).length - 1]; return <tr key={f._id} className="border-t"><td className="td">{f.student?.name}</td><td className="td">{f.student?.className}</td><td className="td">{f.chalanNo}</td><td className="td">{money(f.paid)}</td><td className="td whitespace-nowrap">{last?.date || f.receivedDate || "-"}</td><td className="td">{last?.receivedBy || "-"}</td><td className="td">{last?.narration || "-"}</td><td className="td"><span className={`rounded px-2 py-1 text-xs ${f.balance <= 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{f.balance <= 0 ? "Received" : "Part received"}</span></td></tr>; })}
            {!received.length && <tr><td colSpan={8} className="td py-6 text-center text-slate-400">No fees received for this month</td></tr>}</tbody></table>
      </div>
      <div className="card overflow-x-auto p-0">
        <h2 className="p-4 font-semibold">Pending / defaulters ({defaulters.length})</h2>
        <table className="w-full min-w-[600px]"><thead><tr>{["Student", "Class", "Chalan #", "Previous pending", "This month pending", "Balance"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{defaulters.map((f) => <tr key={f._id} className="border-t"><td className="td">{f.student?.name}</td><td className="td">{f.student?.className}</td><td className="td">{f.chalanNo}</td><td className="td">{money(f.prev)}</td><td className="td">{money(f.pend)}</td><td className="td font-semibold">{money(f.balance)}</td></tr>)}
            {!defaulters.length && <tr><td colSpan={6} className="td py-6 text-center text-slate-400">No pending fees for this month</td></tr>}</tbody></table>
      </div>
    </div>
  );
}
