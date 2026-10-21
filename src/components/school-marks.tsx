"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaChevronDown, FaChevronRight, FaEye, FaPen, FaTimesCircle } from "react-icons/fa";
import { api, today } from "@/lib/api";
import { Swal, toast } from "@/lib/alerts";
import { ClassRow, buildClasses, norm } from "@/lib/class-rows";
import MarksEntry from "./marks-entry";

const Tick = ({ ok, title }: { ok: boolean; title: string }) => ok ? <FaCheckCircle className="text-lg text-green-600" title={title} /> : <FaTimesCircle className="text-lg text-red-500" title={title} />;
const esc = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
const short = (s: string, n = 70) => (s.length > n ? s.slice(0, n) + "..." : s);
const kind = (p: any) => (p.type === "exam" ? `Exam${p.term ? ` - ${p.term}` : ""}` : "Test");
const byRoll = (a: any, b: any) => Number(a.rollNo) - Number(b.rollNo);

export default function SchoolMarks() {
  const [mode, setMode] = useState<"status" | "entry">("status");
  const [entryPaper, setEntryPaper] = useState("");
  const [date, setDate] = useState(today());
  const [teachers, setTeachers] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => Promise.all([api("/api/users?role=teacher"), api(`/api/papers?date=${date}`), api("/api/marks"), api("/api/students")])
    .then(([t, p, m, s]) => { setTeachers(t.items); setPapers(p.items); setMarks(m.items); setStudents(s.items); }).catch((e) => toast("error", e.message)), [date]);
  useEffect(() => { if (mode === "status") load(); }, [load, mode]);

  const rows = useMemo(() => buildClasses(teachers), [teachers]);
  const marksOf = (paperId: string) => new Map<string, number>(marks.filter((m) => m.paper === paperId).map((m) => [m.student, m.obtained]));
  const classStudents = (className: string) => students.filter((s) => norm(s.className) === norm(className) && !s.leftDate); // students still studying
  // marks entered for how many students of the paper's class
  const progress = (p: any) => { const st = classStudents(p.className), m = marksOf(p._id), done = st.filter((s) => m.has(s._id)).length; return { done, total: st.length, complete: st.length > 0 && done === st.length }; };
  const ofClass = (r: ClassRow) => papers.filter((p) => norm(p.className) === norm(r.className) && (!p.section || norm(p.section) === norm(r.section)));
  const ofSubject = (list: any[], subject: string) => list.filter((p) => norm(p.subject) === norm(subject));
  const subjectOk = (list: any[], subject: string) => { const ps = ofSubject(list, subject); return ps.length > 0 && ps.every((p) => progress(p).complete); };

  function view(p: any) {
    const m = marksOf(p._id), sts = classStudents(p.className).sort(byRoll);
    Swal.fire({
      title: `${p.title} - ${p.subject}`, confirmButtonText: "Close",
      html: `<table style="width:100%;text-align:left;font-size:14px"><thead><tr><th>Roll</th><th>Student</th><th>Marks (out of ${esc(p.totalMarks)})</th></tr></thead><tbody>${sts.map((s) => `<tr><td>${esc(s.rollNo)}</td><td>${esc(s.name)}</td><td>${m.has(s._id) ? esc(m.get(s._id)) : '<span style="color:#dc2626">not entered</span>'}</td></tr>`).join("") || '<tr><td colspan="3">No students in this class</td></tr>'}</tbody></table>`,
    });
  }
  const enter = (p: any) => { setEntryPaper(p._id); setMode("entry"); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Marks</h1>
          <p className="text-sm text-slate-500">{mode === "entry" ? "Enter or change the marks of a test / exam paper." : `${date === today() ? "Tests and exams of today" : `Tests and exams of ${date}`} - click a class to see its subjects.`}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="inline-flex overflow-hidden rounded-lg border">
            {[["status", "Class wise status"], ["entry", "Enter marks"]].map(([k, l]) => <button key={k} onClick={() => { setMode(k as any); if (k === "entry") setEntryPaper(""); }} className={`px-4 py-2 text-sm ${mode === k ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}>{l}</button>)}
          </div>
          {mode === "status" && <>
            <div><label className="text-xs font-semibold text-slate-500">Date</label><input type="date" className="input mt-1 w-44" value={date} onChange={(e) => setDate(e.target.value || today())} /></div>
            {date !== today() && <button className="btn-light" onClick={() => setDate(today())}>Today</button>}
          </>}
        </div>
      </div>

      {mode === "entry" ? <MarksEntry key={entryPaper} initialPaperId={entryPaper} /> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full">
            <thead><tr><th className="th w-8"></th><th className="th">Class teacher</th><th className="th">Class</th><th className="th">Section</th><th className="th">Tests</th><th className="th">Exams</th><th className="th text-center">Marks</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const list = ofClass(r), okCount = r.subjects.filter((s) => subjectOk(list, s.name)).length, complete = r.subjects.length > 0 && okCount === r.subjects.length;
                const others = list.filter((p) => !r.subjects.some((s) => norm(s.name) === norm(p.subject)));
                const isOpen = open === r.key;
                const names = (type: string) => { const l = list.filter((p) => p.type === type); return l.length ? short(l.map((p) => { const g = progress(p); return `${p.subject}: ${p.title} (${g.done}/${g.total})`; }).join(" · ")) : <span className="text-slate-400">-</span>; };
                return (
                  <Fragment key={r.key}>
                    <tr className="cursor-pointer border-t hover:bg-slate-50" onClick={() => setOpen(isOpen ? null : r.key)}>
                      <td className="td text-slate-400">{isOpen ? <FaChevronDown /> : <FaChevronRight />}</td>
                      <td className="td">{r.classTeachers.join(", ") || "-"}</td><td className="td font-semibold">{r.className}</td><td className="td">{r.section || "-"}</td>
                      <td className="td text-slate-600">{names("test")}</td><td className="td text-slate-600">{names("exam")}</td>
                      <td className="td text-center">{r.subjects.length ? <span className="inline-flex items-center gap-2"><Tick ok={complete} title={complete ? "Marks given for all subjects" : "Marks missing for some subjects"} /><span className="text-xs text-slate-500">{okCount}/{r.subjects.length}</span></span> : <span className="text-slate-300">-</span>}</td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-50"><td colSpan={7} className="p-3">
                        <table className="w-full rounded-lg bg-white">
                          <thead><tr><th className="th">Subject</th><th className="th">Teacher</th><th className="th text-center">Marks given</th><th className="th">Test / exam paper</th><th className="th">Total marks</th><th className="th">Students marked</th><th className="th">Actions</th></tr></thead>
                          <tbody>
                            {r.subjects.map((s) => {
                              const ps = ofSubject(list, s.name);
                              if (!ps.length) return (
                                <tr key={s.name} className="border-t"><td className="td font-medium">{s.name}</td><td className="td">{s.teachers.join(", ")}</td><td className="td text-center"><Tick ok={false} title="No test or exam on this date" /></td>
                                  <td className="td text-slate-400" colSpan={4}>No test or exam paper on this date</td></tr>
                              );
                              return ps.map((p, i) => { const g = progress(p); return (
                                <tr key={p._id} className="border-t"><td className="td font-medium">{i === 0 ? s.name : ""}</td><td className="td">{i === 0 ? s.teachers.join(", ") : ""}</td>
                                  <td className="td text-center"><Tick ok={g.complete} title={g.complete ? "Marks given" : "Marks not given for all students"} /></td>
                                  <td className="td"><span className={`mr-2 rounded px-2 py-0.5 text-xs ${p.type === "exam" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{kind(p)}</span>{p.title}</td><td className="td">{p.totalMarks}</td>
                                  <td className={`td ${g.complete ? "text-green-700" : "text-red-600"}`}>{g.done} / {g.total}</td>
                                  <td className="td whitespace-nowrap"><button className="icon-btn text-slate-600" title="View marks" onClick={() => view(p)}><FaEye /></button><button className="icon-btn text-blue-600" title="Enter / edit marks" onClick={() => enter(p)}><FaPen /></button></td></tr>); });
                            })}
                            {others.map((p) => { const g = progress(p); return (
                              <tr key={p._id} className="border-t"><td className="td font-medium">{p.subject}</td><td className="td text-slate-400">not assigned</td><td className="td text-center"><Tick ok={g.complete} title="Marks" /></td>
                                <td className="td"><span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-xs">{kind(p)}</span>{p.title}</td><td className="td">{p.totalMarks}</td><td className="td">{g.done} / {g.total}</td>
                                <td className="td whitespace-nowrap"><button className="icon-btn text-slate-600" title="View marks" onClick={() => view(p)}><FaEye /></button><button className="icon-btn text-blue-600" title="Enter / edit marks" onClick={() => enter(p)}><FaPen /></button></td></tr>); })}
                            {!r.subjects.length && !others.length && <tr><td colSpan={7} className="td py-4 text-center text-slate-400">No subject teachers are assigned to this class yet (add them on the Teachers page).</td></tr>}
                          </tbody>
                        </table>
                      </td></tr>
                    )}
                  </Fragment>
                );
              })}
              {!rows.length && <tr><td colSpan={7} className="td py-8 text-center text-slate-400">No classes yet. Add teachers with a class and subject on the Teachers page.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
