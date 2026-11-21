"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, currentMonth, money } from "@/lib/api";
import { feeReportSummary } from "@/lib/fee-report";
import FeeCollectionProgress from "@/components/fee-collection-progress";

// Fee Report: month-wise received vs pending fees. `compact` is the summary-only
// version embedded on the dashboard; the Student Reports page also shows detail tables.
export default function FeeReport({ compact = false }: { compact?: boolean } = {}) {
  const [month, setMonth] = useState(currentMonth());
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api(`/api/fees?month=${encodeURIComponent(month)}`)
      .then((d) => { if (active) setFees(d.items || []); })
      .catch((e: any) => { if (active) { setFees([]); setError(e.message || "Could not load the fee report"); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month]);

  const summary = useMemo(() => feeReportSummary(fees), [fees]);
  const received = summary.rows.filter((f) => f.paid > 0);
  const defaulters = summary.rows.filter((f) => f.balance > 0);
  const cards: [string, number][] = [
    ["Fee (this month)", summary.totalFee],
    ["Previous pending", summary.previousPending],
    ["Received", summary.received],
    ["This month pending", summary.thisMonthPending],
    ["Total balance", summary.totalBalance],
  ];
  const monthInputId = compact ? "dashboard-fee-month" : "fee-report-month";

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-end gap-4">
          <div className="w-full sm:w-48">
            <label className="block text-xs font-semibold text-slate-500" htmlFor={monthInputId}>Month</label>
            <input
              id={monthInputId}
              type="month"
              aria-label="Select fee report month"
              className="input mt-1 block w-full"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonth())}
            />
          </div>
          {compact && <p className="pb-2 text-sm text-slate-500">Fees received and pending for the selected month.</p>}
        </div>
        {compact && <Link className="pb-2 text-sm font-semibold text-blue-600 underline" href="/student-reports">Open full fee report</Link>}
      </div>

      {error ? <div className="card text-sm text-red-600">{error}</div> : loading ? (
        <div className="card py-6 text-center text-sm text-slate-500">Loading fee report…</div>
      ) : (
        <>
          <FeeCollectionProgress month={month} summary={summary} />
          <div className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-5">
            {cards.map(([label, value]) => (
              <div key={label} className="card">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-bold">{money(value)}</p>
              </div>
            ))}
          </div>

          {!compact && <>
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
          </>}
        </>
      )}
    </div>
  );
}
