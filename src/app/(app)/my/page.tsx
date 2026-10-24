"use client";
import { useEffect, useState } from "react";
import { api, gradeOf, money, today } from "@/lib/api";
import { toast } from "@/lib/alerts";

const TERMS = ["First term", "Mid term", "Final term"];
const badge: any = { paid: "bg-green-100 text-green-700", partial: "bg-amber-100 text-amber-700", unpaid: "bg-red-100 text-red-700" };
const feeStatus = (f: any) => (f.amount - f.paid <= 0 ? "paid" : f.paid > 0 ? "partial" : "unpaid");
const totalsOf = (fees: any[]) => {
  const total = fees.reduce((a, f) => a + f.amount, 0), paid = fees.reduce((a, f) => a + f.paid, 0);
  return { total, paid, balance: total - paid };
};
// exam marks of one child, for one term (or every term when term is empty)
const examStats = (bundle: any, term = "") => {
  const rows = (bundle.marks || []).filter((x: any) => x.paper && x.paper.type === "exam" && (!term || x.paper.term === term));
  const obt = rows.reduce((a: number, m: any) => a + m.obtained, 0), tot = rows.reduce((a: number, m: any) => a + m.paper.totalMarks, 0);
  return { obt, tot, pct: tot ? (obt / tot) * 100 : null };
};
const classLine = (s: any) => `Class ${s.className}${s.section ? ` ${s.section}` : ""} · Roll # ${s.rollNo || "-"}`;

function Marks({ title, rows }: { title: string; rows: any[] }) {
  const obt = rows.reduce((a, m) => a + m.obtained, 0), tot = rows.reduce((a, m) => a + m.paper.totalMarks, 0);
  return (
    <div className="card overflow-x-auto p-0">
      <h3 className="p-4 pb-2 font-semibold">{title}</h3>
      <table className="w-full min-w-[600px]">
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
      <div><label className="text-xs font-semibold text-slate-500">{label}</label><input type="date" className="input mt-1 w-full sm:w-44" value={value} onChange={(e) => onChange(e.target.value || today())} /></div>
      {value !== today() && <button className="btn-light" onClick={() => onChange(today())}>Today</button>}
    </div>
  );
}

// The full portal of ONE child: fee chalans, daily diary, tests and exam marks.
// It keeps its own date pickers, so switching children never mixes their dates up.
function ChildDetail({ bundle }: { bundle: any }) {
  const [showFees, setShowFees] = useState(false);
  const [diaryDate, setDiaryDate] = useState(today());
  const [testDate, setTestDate] = useState(today());
  const { student, fees, diary, marks, papers } = bundle;
  const father = student.fatherName;
  // male: son of, female: daughter of (shown neutral if the gender was never entered)
  const title = !father ? student.name : student.gender === "Male" ? `${student.name} son of ${father}` : student.gender === "Female" ? `${student.name} daughter of ${father}` : `${student.name} · Father: ${father}`;

  const { total, paid, balance } = totalsOf(fees);
  const dayDiary = diary.filter((x: any) => x.date === diaryDate), dayPapers = papers.filter((p: any) => p.date === testDate && p.type === "test");
  const m = marks.filter((x: any) => x.paper);
  const exams = m.filter((x: any) => x.paper.type === "exam");
  const markOf = (id: string) => m.find((x: any) => x.paper._id === id);

  return (
    <div className="space-y-8">
      <div className="card text-center"><h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-slate-600">{classLine(student)}</p></div>

      <section className="space-y-3">
        <h2 className="font-semibold">Fee chalan summary</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[["Total amount", total, "text-slate-800"], ["Paid amount", paid, "text-green-700"], ["Balance", balance, balance > 0 ? "text-red-600" : "text-green-700"]].map(([l, v, c]) => (
            <div key={l as string} className="card"><p className="text-sm text-slate-500">{l}</p><p className={`mt-1 text-2xl font-bold ${c}`}>{money(v as number)}</p></div>
          ))}
        </div>
        <button className="btn-light" onClick={() => setShowFees(!showFees)}>{showFees ? "Hide detail" : "Show detail"}</button>
        {showFees && (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[600px]">
              <thead><tr>{["Month", "Chalan #", "Amount", "Paid", "Balance", "Status"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>
                {fees.map((f: any) => { const bal = f.amount - f.paid, st = feeStatus(f); return (
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
          <table className="w-full min-w-[600px]"><thead><tr>{["Date", "Subject", "Homework / Note"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
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
          <table className="w-full min-w-[600px]"><thead><tr>{["Date", "Subject", "Test", "Total marks", "Marks obtained", "%"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
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

export default function MyPortalPage() {
  const [d, setD] = useState<any>(null);
  const [sel, setSel] = useState("all"); // "all" = every child together, otherwise a student id
  const [allDiaryDate, setAllDiaryDate] = useState(today());
  useEffect(() => { api("/api/my").then(setD).catch((e) => toast("error", e.message)); }, []);
  if (!d) return <p className="text-slate-500">Loading...</p>;

  // children[] is one bundle per linked child; the single-student fields are
  // still in the response, so an older API answer keeps working too.
  const bundles: any[] = d.children?.length ? d.children
    : [{ student: d.student, fees: d.fees || [], diary: d.diary || [], marks: d.marks || [], papers: d.papers || [] }];
  const multi = bundles.length > 1;
  const active = multi ? bundles.find((b) => String(b.student._id) === sel) : bundles[0];

  // One child (student using his own login, or a guardian with a single child):
  // exactly the portal as before, no tabs needed.
  if (!multi) return <ChildDetail bundle={bundles[0]} />;

  const guardianName = d.guardian?.fatherName || d.guardian?.name || bundles[0].student.fatherName || "Guardian";
  const family = d.family || bundles.reduce((a: any, b: any) => { const t = totalsOf(b.fees); return { total: a.total + t.total, paid: a.paid + t.paid, balance: a.balance + t.balance }; }, { total: 0, paid: 0, balance: 0 });
  const tabCls = (on: boolean) => `min-h-[38px] whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium sm:text-sm ${on ? "bg-blue-600 text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-100"}`;

  return (
    <div className="space-y-6">
      <div className="card text-center">
        <h1 className="text-xl font-bold">Guardian Portal</h1>
        <p className="text-sm text-slate-600">{guardianName} · {bundles.length} children in this school · one login for the whole family</p>
      </div>

      <nav aria-label="Choose a child" className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
        <button className={tabCls(!active)} onClick={() => setSel("all")}>All children ({bundles.length})</button>
        {bundles.map((b) => (
          <button key={b.student._id} className={tabCls(active?.student._id === b.student._id)} onClick={() => setSel(String(b.student._id))}>
            {b.student.name} · Class {b.student.className}{b.student.section ? ` ${b.student.section}` : ""}
          </button>
        ))}
      </nav>

      {active ? <ChildDetail key={active.student._id} bundle={active} /> : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-semibold">Family fee summary (all children)</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[["Total amount", family.total, "text-slate-800"], ["Paid amount", family.paid, "text-green-700"], ["Balance", family.balance, family.balance > 0 ? "text-red-600" : "text-green-700"]].map(([l, v, c]) => (
                <div key={l as string} className="card"><p className="text-sm text-slate-500">{l}</p><p className={`mt-1 text-2xl font-bold ${c}`}>{money(v as number)}</p></div>
              ))}
            </div>
            <div className="card overflow-x-auto p-0">
              <table className="w-full min-w-[600px]">
                <thead><tr>{["Child", "Class", "Total", "Paid", "Balance", "Status"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                <tbody>
                  {bundles.map((b) => { const t = totalsOf(b.fees), st = t.balance <= 0 ? "paid" : t.paid > 0 ? "partial" : "unpaid"; return (
                    <tr key={b.student._id} className="border-t">
                      <td className="td font-semibold"><button className="text-blue-700 hover:underline" onClick={() => setSel(String(b.student._id))}>{b.student.name}</button></td>
                      <td className="td">{classLine(b.student)}</td><td className="td">{money(t.total)}</td><td className="td">{money(t.paid)}</td>
                      <td className="td font-semibold">{money(t.balance)}</td>
                      <td className="td"><span className={`rounded px-2 py-1 text-xs ${badge[st]}`}>{st === "paid" ? "Received" : st === "partial" ? "Part received" : "Pending"}</span></td>
                    </tr>); })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">Open a child above for his / her month-by-month chalan detail.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">My children</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {bundles.map((b) => { const t = totalsOf(b.fees), ex = examStats(b), diaryToday = b.diary.filter((x: any) => x.date === today()).length; return (
                <div key={b.student._id} className="card space-y-1">
                  <p className="font-semibold">{b.student.name}</p>
                  <p className="text-sm text-slate-600">{classLine(b.student)}</p>
                  <p className="text-sm">Fee balance: <b className={t.balance > 0 ? "text-red-600" : "text-green-700"}>{money(t.balance)}</b></p>
                  <p className="text-sm">Diary today: <b>{diaryToday ? `${diaryToday} ${diaryToday === 1 ? "entry" : "entries"}` : "none yet"}</b></p>
                  <p className="text-sm">Exam marks overall: <b>{ex.pct === null ? "no marks yet" : `${ex.pct.toFixed(1)}% (${gradeOf(ex.pct)})`}</b></p>
                  <button className="btn-light mt-2" onClick={() => setSel(String(b.student._id))}>Diary, fees &amp; marks -&gt;</button>
                </div>); })}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-semibold">Daily diary - all children</h2>
              <DatePick label="Diary date" value={allDiaryDate} onChange={setAllDiaryDate} />
            </div>
            {bundles.map((b) => { const day = b.diary.filter((x: any) => x.date === allDiaryDate); return (
              <div key={b.student._id} className="card overflow-x-auto p-0">
                <h3 className="p-4 pb-2 font-semibold">{b.student.name} <span className="text-sm font-normal text-slate-500">· {classLine(b.student)}</span></h3>
                <table className="w-full min-w-[600px]"><thead><tr>{["Date", "Subject", "Homework / Note"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                  <tbody>{day.map((x: any) => <tr key={x._id} className="border-t"><td className="td whitespace-nowrap">{x.date}</td><td className="td">{x.subject}</td><td className="td">{x.text}</td></tr>)}
                    {!day.length && <tr><td colSpan={3} className="td py-4 text-center text-slate-400">No diary for {allDiaryDate === today() ? "today" : allDiaryDate}</td></tr>}</tbody></table>
              </div>); })}
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Exam marks - all children</h2>
            <div className="card overflow-x-auto p-0">
              <table className="w-full min-w-[600px]">
                <thead><tr>{["Child", "Class", ...TERMS, "Overall", "Grade"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                <tbody>
                  {bundles.map((b) => { const all = examStats(b); return (
                    <tr key={b.student._id} className="border-t">
                      <td className="td font-semibold"><button className="text-blue-700 hover:underline" onClick={() => setSel(String(b.student._id))}>{b.student.name}</button></td>
                      <td className="td">{classLine(b.student)}</td>
                      {TERMS.map((t) => { const s = examStats(b, t); return <td key={t} className="td">{s.pct === null ? "-" : `${s.obt}/${s.tot} (${s.pct.toFixed(1)}%)`}</td>; })}
                      <td className="td font-semibold">{all.pct === null ? "-" : `${all.pct.toFixed(1)}%`}</td>
                      <td className="td font-semibold">{all.pct === null ? "-" : gradeOf(all.pct)}</td>
                    </tr>); })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">Open a child above for subject-by-subject paper marks and test marks.</p>
          </section>
        </div>
      )}
    </div>
  );
}
