"use client";
import { useState } from "react";
import Link from "next/link";
import { demo } from "@/lib/demo-data";
import { money } from "@/lib/api";

const tabs: Record<string, { head: string[]; rows: () => any[][] }> = {
  Students: { head: ["Roll #", "Name", "Father", "Class", "Monthly fee"], rows: () => demo.students.map((s) => [s.rollNo, s.name, s.fatherName, s.className, money(s.monthlyFee)]) },
  "Fee Chalan": { head: ["Chalan #", "Student", "Month", "Amount", "Paid", "Status"], rows: () => demo.fees.map((f) => [f.chalanNo, f.student, f.month, money(f.amount), money(f.paid), f.status]) },
  "Daily Diary": { head: ["Date", "Class", "Subject", "Homework"], rows: () => demo.diary.map((d) => [d.date, d.className, d.subject, d.text]) },
  Papers: { head: ["Title", "Type", "Class", "Subject", "Total marks"], rows: () => demo.papers.map((p) => [p.title, p.type, p.className, p.subject, p.totalMarks]) },
  Results: { head: ["Student", "Paper", "Marks", "%"], rows: () => demo.results.map((r) => [r.student, r.paper, `${r.obtained}/${r.total}`, ((r.obtained / r.total) * 100).toFixed(1) + "%"]) },
};

export default function DemoPage() {
  const [tab, setTab] = useState("Students");
  const t = tabs[tab];
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-100 p-3 text-sm text-amber-800">
        <span>🧪 Demo mode - all data below is fake and read-only.</span>
        <Link href="/login" className="btn">Back to login</Link>
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {Object.keys(tabs).map((k) => <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${tab === k ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{k}</button>)}
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[600px]">
          <thead><tr>{t.head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{t.rows().map((r, i) => <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className="td capitalize">{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </main>
  );
}
