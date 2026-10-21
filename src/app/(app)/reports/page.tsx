"use client";
import { useEffect, useState } from "react";
import { api, currentMonth, gradeOf, money } from "@/lib/api";
import { useAccounting } from "@/lib/accounting";
import FeeMonthReport from "@/components/fee-month-report";
import GrRegisterReport from "@/components/gr-register-report";
import { useSession } from "@/components/session";
import { AccountList, JournalReport, LedgerReport, PeriodReport, RecvPayReport } from "@/components/account-reports";

const baseTabs: [string, string][] = [["fees", "Fee report"], ["results", "Result report"]];
const accountTabs: [string, string][] = [["list", "Account List"], ["jv", "Journal Voucher"], ["ledger", "Account Ledger"], ["recpay", "Receivable / Payable"], ["month", "Month Wise"], ["monthCmp", "Month Comparison"], ["year", "Year Wise"], ["yearCmp", "Year Comparison"]];

export default function ReportsPage() {
  const { user } = useSession();
  const isSchool = user.role === "school";
  const acc = useAccounting(isSchool);
  const [tab, setTab] = useState("fees");
  const [month, setMonth] = useState(currentMonth());
  const [fees, setFees] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [paperId, setPaperId] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const paper = papers.find((p) => p._id === paperId);

  useEffect(() => { api("/api/papers").then((d) => setPapers(d.items)); }, []);
  useEffect(() => { api(`/api/fees?month=${month}`).then((d) => setFees(d.items)); }, [month]);
  useEffect(() => {
    if (!paper) return setResults([]);
    Promise.all([api(`/api/students?className=${encodeURIComponent(paper.className)}`), api(`/api/marks?paper=${paper._id}`)]).then(([st, mk]) => {
      const byStudent = Object.fromEntries(mk.items.map((m: any) => [m.student, m.obtained]));
      const rows = st.items.filter((s: any) => byStudent[s._id] !== undefined).map((s: any) => ({ ...s, obtained: byStudent[s._id], pct: (byStudent[s._id] / paper.totalMarks) * 100 }));
      setResults(rows.sort((a: any, b: any) => b.obtained - a.obtained));
    });
  }, [paperId]); // eslint-disable-line

  const fr = fees.map((f) => { const prev = f.previous || 0, pend = f.amount - f.paid; return { ...f, prev, pend, balance: prev + pend }; });
  const sum = (k: string) => fr.reduce((a, f) => a + (f[k] || 0), 0);
  const defaulters = fr.filter((f) => f.balance > 0);
  const received = fr.filter((f) => f.paid > 0);
  const passed = results.filter((r) => r.pct >= 40).length;
  const cards = [["Fee (this month)", sum("amount")], ["Previous pending", sum("prev")], ["Received", sum("paid")], ["This month pending", sum("pend")], ["Total balance", sum("balance")]];
  const tabs = isSchool ? [baseTabs[0], ["feeMonth", "Month Wise Fee Receivable"], ["gr", "GR Register"], baseTabs[1], ...accountTabs] : baseTabs;
  const data = { accounts: acc.accounts, types: acc.types, entries: acc.entries, payments: acc.payments };

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold">Reports</h1><p className="text-sm text-slate-500">{isSchool ? "Fee, result and accounting reports (scroll the tabs sideways for more)." : "Fee and result reports."}</p></div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${tab === id ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{label}</button>)}
      </div>

      {tab === "fees" && (
        <>
          <input type="month" className="input w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map(([l, v]) => <div key={l as string} className="card"><p className="text-sm text-slate-500">{l}</p><p className="text-xl font-bold">{money(v as number)}</p></div>)}
          </div>
          <div className="card overflow-x-auto p-0">
            <h2 className="p-4 font-semibold">Received fees ({received.length})</h2>
            <table className="w-full"><thead><tr>{["Student", "Class", "Chalan #", "Received", "Received on", "Received by", "Narration", "Status"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>{received.map((f) => { const last = (f.payments || [])[(f.payments || []).length - 1]; return <tr key={f._id} className="border-t"><td className="td">{f.student?.name}</td><td className="td">{f.student?.className}</td><td className="td">{f.chalanNo}</td><td className="td">{money(f.paid)}</td><td className="td whitespace-nowrap">{last?.date || f.receivedDate || "-"}</td><td className="td">{last?.receivedBy || "-"}</td><td className="td">{last?.narration || "-"}</td><td className="td"><span className={`rounded px-2 py-1 text-xs ${f.balance <= 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{f.balance <= 0 ? "Received" : "Part received"}</span></td></tr>; })}
                {!received.length && <tr><td colSpan={8} className="td py-6 text-center text-slate-400">No fees received for this month</td></tr>}</tbody></table>
          </div>
          <div className="card overflow-x-auto p-0">
            <h2 className="p-4 font-semibold">Pending / defaulters ({defaulters.length})</h2>
            <table className="w-full"><thead><tr>{["Student", "Class", "Chalan #", "Previous pending", "This month pending", "Balance"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>{defaulters.map((f) => <tr key={f._id} className="border-t"><td className="td">{f.student?.name}</td><td className="td">{f.student?.className}</td><td className="td">{f.chalanNo}</td><td className="td">{money(f.prev)}</td><td className="td">{money(f.pend)}</td><td className="td font-semibold">{money(f.balance)}</td></tr>)}</tbody></table>
          </div>
        </>
      )}

      {tab === "results" && (
        <>
          <select className="input w-72" value={paperId} onChange={(e) => setPaperId(e.target.value)}>
            <option value="">Select test / exam paper</option>
            {papers.map((p) => <option key={p._id} value={p._id}>{p.title} - Class {p.className}</option>)}
          </select>
          {paper && (
            <div className="card overflow-x-auto p-0">
              <p className="p-4 text-sm text-slate-600">Appeared: {results.length} · Passed: {passed} · Failed: {results.length - passed} · Pass mark: 40%</p>
              <table className="w-full"><thead><tr>{["Position", "Roll #", "Student", "Obtained", "%", "Grade"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                <tbody>{results.map((r, i) => <tr key={r._id} className="border-t"><td className="td">{i + 1}</td><td className="td">{r.rollNo}</td><td className="td">{r.name}</td><td className="td">{r.obtained}/{paper.totalMarks}</td><td className="td">{r.pct.toFixed(1)}%</td><td className="td font-semibold">{gradeOf(r.pct)}</td></tr>)}</tbody></table>
            </div>
          )}
        </>
      )}

      {isSchool && tab === "feeMonth" && <FeeMonthReport />}
      {isSchool && tab === "gr" && <GrRegisterReport />}

      {isSchool && tab !== "feeMonth" && tab !== "gr" && !baseTabs.some(([id]) => id === tab) && (acc.loading ? <p className="text-slate-500">Loading...</p> : (
        <>
          {tab === "list" && <AccountList data={data} />}
          {tab === "jv" && <JournalReport data={data} />}
          {tab === "ledger" && <LedgerReport data={data} />}
          {tab === "recpay" && <RecvPayReport data={data} />}
          {tab === "month" && <PeriodReport data={data} mode="month" compare={false} title="Month Wise Report" />}
          {tab === "monthCmp" && <PeriodReport data={data} mode="month" compare title="Month Wise Comparison" />}
          {tab === "year" && <PeriodReport data={data} mode="year" compare={false} title="Year Wise Report" />}
          {tab === "yearCmp" && <PeriodReport data={data} mode="year" compare title="Year Wise Comparison" />}
        </>
      ))}
    </div>
  );
}
