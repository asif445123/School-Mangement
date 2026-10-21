"use client";
import { useEffect, useState } from "react";
import { api, gradeOf, money, today } from "@/lib/api";
import { toast } from "@/lib/alerts";

const TERMS = ["First term", "Mid term", "Final term"];
const badge: any = { paid: "bg-green-100 text-green-700", partial: "bg-amber-100 text-amber-700", unpaid: "bg-red-100 text-red-700" };

function Marks({ title, rows }: { title: string; rows: any[] }) {
  const obt = rows.reduce((a, m) => a + m.obtained, 0), tot = rows.reduce((a, m) => a + m.paper.totalMarks, 0);
  return (
    <div className="card overflow-x-auto p-0">
      <h3 className="p-4 pb-2 font-semibold">{title}</h3>
      <table className="w-full">
        <thead><tr>{["Subject", "Paper", "Marks", "%", "Grade"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((m) => { const pct = (m.obtained / m.paper.totalMarks) * 100; return (
            <tr key={m._id} className="border-t"><td className="td">{m.paper.subject}</td><td className="td">{m.paper.title}</td><td className="td">{m.obtained} / {m.paper.totalMarks}</td><td className="td">{pct.toFixed(1)}%</td><td className="td font-semibold">{gradeOf(pct)}</td></tr>); })}
          {!rows.length && <tr><td colSpan={5} className="td py-5 text-center text-slate-400">No marks yet</td></tr>}
          {rows.length > 0 && <tr className="border-t bg-slate-50 font-semibold"><td className="td" colSpan={2}>Total</td><td className="td">{obt} / {tot}</td><td className="td">{tot ? ((obt / tot) * 100).toFixed(1) : "0.0"}%</td><td className="td">{tot ? gradeOf((obt / tot) * 100) : "-"}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// one date picker for one list (diary and tests each have their own)
function DatePick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-end gap-2">
      <div><label className="text-xs font-semibold text-slate-500">{label}</label><input type="date" className="input mt-1 w-44" value={value} onChange={(e) => onChange(e.target.value || today())} /></div>
      {value !== today() && <button className="btn-light" onClick={() => onChange(today())}>Today</button>}
    </div>
  );
}

export default function MyPortalPage() {
  const [d, setD] = useState<any>(null);
  const [showFees, setShowFees] = useState(false);
  const [diaryDate, setDiaryDate] = useState(today());
  const [testDate, setTestDate] = useState(today());
  useEffect(() => { api("/api/my").then(setD).catch((e) => toast("error", e.message)); }, []);
  if (!d) return <p className="text-slate-500">Loading...</p>;

  const { student, fees, diary, marks, papers } = d;
  const father = student.fatherName;
  // male: son of, female: daughter of (shown neutral if the gender was never entered)
  const title = !father ? student.name : student.gender === "Male" ? `${student.name} son of ${father}` : student.gender === "Female" ? `${student.name} daughter of ${father}` : `${student.name} · Father: ${father}`;

  const total = fees.reduce((a: number, f: any) => a + f.amount, 0), paid = fees.reduce((a: number, f: any) => a + f.paid, 0);
  const dayDiary = diary.filter((x: any) => x.date === diaryDate), dayPapers = papers.filter((p: any) => p.date === testDate && p.type === "test");
  const m = marks.filter((x: any) => x.paper);
  const exams = m.filter((x: any) => x.paper.type === "exam");
  const markOf = (id: string) => m.find((x: any) => x.paper._id === id);

  return (
    <div className="space-y-8">
      <div className="card text-center"><h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-slate-600">Class {student.className} · Roll # {student.rollNo || "-"}</p></div>

      <section className="space-y-3">
        <h2 className="font-semibold">Fee chalan summary</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[["Total amount", total, "text-slate-800"], ["Paid amount", paid, "text-green-700"], ["Balance", total - paid, total - paid > 0 ? "text-red-600" : "text-green-700"]].map(([l, v, c]) => (
            <div key={l as string} className="card"><p className="text-sm text-slate-500">{l}</p><p className={`mt-1 text-2xl font-bold ${c}`}>{money(v as number)}</p></div>
          ))}
        </div>
        <button className="btn-light" onClick={() => setShowFees(!showFees)}>{showFees ? "Hide detail" : "Show detail"}</button>
        {showFees && (
          <div className="card overflow-x-auto p-0">
            <table className="w-full">
              <thead><tr>{["Month", "Chalan #", "Amount", "Paid", "Balance", "Status"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>
                {fees.map((f: any) => { const bal = f.amount - f.paid, st = bal <= 0 ? "paid" : f.paid > 0 ? "partial" : "unpaid"; return (
                  <tr key={f._id} className="border-t"><td className="td">{f.month === "0000-00" ? "Previous pending" : f.month}</td><td className="td">{f.chalanNo}</td><td className="td">{money(f.amount)}</td><td className="td">{money(f.paid)}</td><td className="td">{money(bal)}</td>
                    <td className="td"><span className={`rounded px-2 py-1 text-xs ${badge[st]}`}>{st === "paid" ? "Received" : st === "partial" ? "Part received" : "Pending"}</span></td></tr>); })}
                {!fees.length && <tr><td colSpan={6} className="td py-6 text-center text-slate-400">No chalans yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-semibold">Daily diary</h2>
          <DatePick label="Diary date" value={diaryDate} onChange={setDiaryDate} />
        </div>
        <div className="card overflow-x-auto p-0">
          <table className="w-full"><thead><tr>{["Date", "Subject", "Homework / Note"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{dayDiary.map((x: any) => <tr key={x._id} className="border-t"><td className="td whitespace-nowrap">{x.date}</td><td className="td">{x.subject}</td><td className="td">{x.text}</td></tr>)}
              {!dayDiary.length && <tr><td colSpan={3} className="td py-5 text-center text-slate-400">No diary for {diaryDate === today() ? "today" : diaryDate}</td></tr>}</tbody></table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-semibold">Tests</h2>
          <DatePick label="Test date" value={testDate} onChange={setTestDate} />
        </div>
        <div className="card overflow-x-auto p-0">
          <table className="w-full"><thead><tr>{["Date", "Subject", "Test", "Total marks", "Marks obtained", "%"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{dayPapers.map((p: any) => <tr key={p._id} className="border-t"><td className="td whitespace-nowrap">{p.date}</td><td className="td">{p.subject}</td><td className="td">{p.title}</td><td className="td">{p.totalMarks}</td><td className="td font-semibold">{markOf(p._id) ? markOf(p._id).obtained : "-"}</td><td className="td">{markOf(p._id) ? ((markOf(p._id).obtained / p.totalMarks) * 100).toFixed(1) + "%" : "-"}</td></tr>)}
              {!dayPapers.length && <tr><td colSpan={6} className="td py-5 text-center text-slate-400">No test on {testDate === today() ? "today" : testDate}</td></tr>}</tbody></table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Exam marks</h2>
        {TERMS.map((t) => <Marks key={t} title={`${t} marks`} rows={exams.filter((x: any) => x.paper.term === t)} />)}
      </section>
    </div>
  );
}
