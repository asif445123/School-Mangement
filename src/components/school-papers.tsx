"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaChevronDown, FaChevronRight, FaPen, FaPlus, FaPrint, FaTimesCircle, FaTrash } from "react-icons/fa";
import { api, today } from "@/lib/api";
import { Field, confirmDelete, formDialog, toast } from "@/lib/alerts";
import { ClassRow, buildClasses, norm } from "@/lib/class-rows";
import { printPaper } from "@/lib/print";
import { useSession } from "./session";

const Tick = ({ ok, title }: { ok: boolean; title: string }) => ok ? <FaCheckCircle className="text-lg text-green-600" title={title} /> : <FaTimesCircle className="text-lg text-red-500" title={title} />;
const paperFields = (type: string): Field[] => [
  { name: "title", label: type === "exam" ? "Exam title (e.g. Mid Term Math)" : "Test title (e.g. Maths Monthly Test)", required: true },
  ...(type === "exam" ? [{ name: "term", label: "Exam term", type: "select", options: ["First term", "Mid term", "Final term"] } as Field] : []),
  { name: "date", label: "Date", type: "date", required: true },
  { name: "totalMarks", label: "Total marks", type: "number", required: true },
  { name: "questions", label: "Questions (one per line)", type: "textarea" },
];
const short = (s: string, n = 70) => (s.length > n ? s.slice(0, n) + "..." : s);
const kind = (p: any) => (p.type === "exam" ? `Exam${p.term ? ` - ${p.term}` : ""}` : "Test");

export default function SchoolPapers() {
  const { user } = useSession();
  const [date, setDate] = useState(today());
  const [teachers, setTeachers] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => Promise.all([api("/api/users?role=teacher"), api(`/api/papers?date=${date}`)]).then(([t, p]) => { setTeachers(t.items); setPapers(p.items); }).catch((e) => toast("error", e.message)), [date]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => buildClasses(teachers), [teachers]);
  // papers dated on the chosen day that belong to a class (a paper without a section counts for every section)
  const ofClass = (r: ClassRow) => papers.filter((p) => norm(p.className) === norm(r.className) && (!p.section || norm(p.section) === norm(r.section)));
  const ofSubject = (list: any[], subject: string) => list.filter((p) => norm(p.subject) === norm(subject));

  async function add(r: ClassRow, subject: string, type: "test" | "exam") {
    const v = await formDialog(`Add ${type} paper - Class ${r.className}${r.section ? " " + r.section : ""} - ${subject}`, paperFields(type), { date, term: "First term" });
    if (!v) return;
    try { await api("/api/papers", { method: "POST", body: { ...v, type, className: r.className, section: r.section, subject } }); toast("success", "Paper saved"); load(); }
    catch (e: any) { toast("error", e.message); }
  }
  async function edit(p: any) {
    const v = await formDialog(`Edit ${p.type} paper`, paperFields(p.type), p);
    if (!v) return;
    try { await api(`/api/papers/${p._id}`, { method: "PUT", body: v }); toast("success", "Saved"); load(); }
    catch (e: any) { toast("error", e.message); }
  }
  async function remove(p: any) {
    if (!(await confirmDelete(`Delete "${p.title}"?`))) return;
    try { await api(`/api/papers/${p._id}`, { method: "DELETE" }); toast("success", "Deleted"); load(); }
    catch (e: any) { toast("error", e.message); }
  }
  const paperActions = (p: any) => (
    <td className="td whitespace-nowrap">
      <button className="icon-btn text-slate-600" title="Print" onClick={() => printPaper(p, user.schoolInfo)}><FaPrint /></button>
      <button className="icon-btn text-blue-600" title="Edit" onClick={() => edit(p)}><FaPen /></button>
      <button className="icon-btn text-red-600" title="Delete" onClick={() => remove(p)}><FaTrash /></button>
    </td>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Test & Exam Papers</h1>
          <p className="text-sm text-slate-500">{date === today() ? "Papers dated today" : `Papers dated ${date}`} - click a class to see its subjects.</p>
        </div>
        <div className="flex items-end gap-2">
          <div><label className="text-xs font-semibold text-slate-500">Date</label><input type="date" className="input mt-1 w-44" value={date} onChange={(e) => setDate(e.target.value || today())} /></div>
          {date !== today() && <button className="btn-light" onClick={() => setDate(today())}>Today</button>}
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr><th className="th w-8"></th><th className="th">Class teacher</th><th className="th">Class</th><th className="th">Section</th><th className="th">Tests</th><th className="th">Exams</th><th className="th text-center">Papers</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const list = ofClass(r), filled = r.subjects.filter((s) => ofSubject(list, s.name).length).length, complete = r.subjects.length > 0 && filled === r.subjects.length;
              const others = list.filter((p) => !r.subjects.some((s) => norm(s.name) === norm(p.subject)));
              const isOpen = open === r.key;
              const tests = list.filter((p) => p.type === "test"), exams = list.filter((p) => p.type === "exam");
              const names = (l: any[]) => (l.length ? short(l.map((p) => `${p.subject}: ${p.title}`).join(" · ")) : <span className="text-slate-400">-</span>);
              return (
                <Fragment key={r.key}>
                  <tr className="cursor-pointer border-t hover:bg-slate-50" onClick={() => setOpen(isOpen ? null : r.key)}>
                    <td className="td text-slate-400">{isOpen ? <FaChevronDown /> : <FaChevronRight />}</td>
                    <td className="td">{r.classTeachers.join(", ") || "-"}</td><td className="td font-semibold">{r.className}</td><td className="td">{r.section || "-"}</td>
                    <td className="td text-slate-600">{names(tests)}</td><td className="td text-slate-600">{names(exams)}</td>
                    <td className="td text-center">{r.subjects.length ? <span className="inline-flex items-center gap-2"><Tick ok={complete} title={complete ? "All subjects have a paper" : "Some subjects have no paper"} /><span className="text-xs text-slate-500">{filled}/{r.subjects.length}</span></span> : <span className="text-slate-300">-</span>}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50"><td colSpan={7} className="p-3">
                      <table className="w-full rounded-lg bg-white">
                        <thead><tr><th className="th">Subject</th><th className="th">Teacher</th><th className="th text-center">Prepared</th><th className="th">Paper</th><th className="th">Total marks</th><th className="th">Actions</th></tr></thead>
                        <tbody>
                          {r.subjects.map((s) => {
                            const ps = ofSubject(list, s.name);
                            const addBtns = (
                              <>
                                <button className="mr-1 rounded border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50" onClick={() => add(r, s.name, "test")}><FaPlus className="mr-1 inline" />Test</button>
                                <button className="rounded border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50" onClick={() => add(r, s.name, "exam")}><FaPlus className="mr-1 inline" />Exam</button>
                              </>
                            );
                            if (!ps.length) return (
                              <tr key={s.name} className="border-t"><td className="td font-medium">{s.name}</td><td className="td">{s.teachers.join(", ")}</td><td className="td text-center"><Tick ok={false} title="No test or exam paper" /></td>
                                <td className="td text-slate-400">Not prepared</td><td className="td">-</td><td className="td whitespace-nowrap">{addBtns}</td></tr>
                            );
                            return ps.map((p, i) => (
                              <tr key={p._id} className="border-t"><td className="td font-medium">{i === 0 ? s.name : ""}</td><td className="td">{i === 0 ? s.teachers.join(", ") : ""}</td><td className="td text-center"><Tick ok title="Paper prepared" /></td>
                                <td className="td"><span className={`mr-2 rounded px-2 py-0.5 text-xs ${p.type === "exam" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{kind(p)}</span>{p.title}</td><td className="td">{p.totalMarks}</td>{paperActions(p)}</tr>
                            ));
                          })}
                          {others.map((p) => (
                            <tr key={p._id} className="border-t"><td className="td font-medium">{p.subject}</td><td className="td text-slate-400">not assigned</td><td className="td text-center"><Tick ok title="Paper prepared" /></td>
                              <td className="td"><span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-xs">{kind(p)}</span>{p.title}</td><td className="td">{p.totalMarks}</td>{paperActions(p)}</tr>
                          ))}
                          {!r.subjects.length && !others.length && <tr><td colSpan={6} className="td py-4 text-center text-slate-400">No subject teachers are assigned to this class yet (add them on the Teachers page).</td></tr>}
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
    </div>
  );
}
