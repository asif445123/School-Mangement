"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaChevronDown, FaChevronRight, FaTimesCircle } from "react-icons/fa";
import { api, today } from "@/lib/api";
import { toast } from "@/lib/alerts";
import { ClassRow, buildClasses, norm } from "@/lib/class-rows";
import { classTeacherClasses } from "@/lib/teacher-scope";
import { useSession } from "./session";

type Kind = "diary" | "papers" | "marks";
const LABEL: Record<Kind, string> = { diary: "Diary", papers: "Papers", marks: "Marks" };
const Tick = ({ ok, title }: { ok: boolean; title: string }) => ok ? <FaCheckCircle className="text-lg text-green-600" title={title} /> : <FaTimesCircle className="text-lg text-red-500" title={title} />;

// Teacher portal: green tick / red cross for diary, papers or marks of the chosen date.
// Class teacher: all subjects of his class + his own subject in other classes. Subject teacher: the classes and subjects he teaches.
export default function TeacherStatus({ kind }: { kind: Kind }) {
  const { user } = useSession();
  const cts = useMemo(() => classTeacherClasses(user), [user]);
  const isClassTeacher = cts.length > 0;
  const inMyClass = (r: ClassRow) => cts.some((c) => norm(c.className) === norm(r.className) && (!norm(c.section) || norm(c.section) === norm(r.section)));
  const [date, setDate] = useState(today());
  const [subTeachers, setSubTeachers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]); // diary entries, or papers, of the date
  const [marks, setMarks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const req: Promise<any>[] = [api(kind === "diary" ? `/api/diary?date=${date}` : `/api/papers?date=${date}`), isClassTeacher ? api("/api/users?role=teacher&view=class") : Promise.resolve({ items: [] })];
      // the roster (not the students resource) is what a teacher may read
      if (kind === "marks") req.push(api("/api/marks"), api("/api/roster"));
      const [it, ts, mk, st] = await Promise.all(req);
      setItems(it.items); setSubTeachers(ts.items); if (mk) setMarks(mk.items); if (st) setStudents(st.items);
    } catch (e: any) { toast("error", e.message); }
  }, [date, kind, isClassTeacher]);
  useEffect(() => { load(); }, [load]);

  // rows: my class (all subjects, from the subject teachers + me) and my own subjects elsewhere
  const classRows = useMemo(() => buildClasses([...subTeachers, user]).filter(inMyClass), [subTeachers, user, cts]); // eslint-disable-line
  const otherRows = useMemo(() => buildClasses([user]).filter((r) => !inMyClass(r)), [user, cts]); // eslint-disable-line

  const ofClass = (r: ClassRow) => items.filter((e) => norm(e.className) === norm(r.className) && (!e.section || norm(e.section) === norm(r.section)));
  const ofSubject = (list: any[], subject: string) => list.filter((e) => norm(e.subject) === norm(subject));
  const marksOf = (paperId: string) => new Set(marks.filter((m) => m.paper === paperId).map((m) => m.student));
  const progress = (p: any) => { const st = students.filter((s) => norm(s.className) === norm(p.className) && !s.leftDate), m = marksOf(p._id), done = st.filter((s) => m.has(s._id)).length; return { done, total: st.length, complete: st.length > 0 && done === st.length }; };
  const subjectOk = (list: any[], subject: string) => { const es = ofSubject(list, subject); return es.length > 0 && (kind !== "marks" || es.every((p) => progress(p).complete)); };
  const detail = (es: any[]) => kind === "diary" ? es.map((e) => e.text).join(" · ") : kind === "papers" ? es.map((p) => `${p.type === "exam" ? "Exam" : "Test"}: ${p.title}`).join(" · ") : es.map((p) => { const g = progress(p); return `${p.title} (${g.done}/${g.total} students)`; }).join(" · ");

  if (!classRows.length && !otherRows.length) return null;

  const table = (title: string, hint: string, rows: ClassRow[]) => rows.length === 0 ? null : (
    <div className="card overflow-x-auto p-0">
      <h3 className="p-4 pb-1 font-semibold">{title}</h3>
      <p className="px-4 pb-2 text-xs text-slate-500">{hint}</p>
      <table className="w-full min-w-[600px]">
        <thead><tr><th className="th w-8"></th><th className="th">Class</th><th className="th">Section</th><th className="th text-center">{LABEL[kind]}</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const list = ofClass(r), okCount = r.subjects.filter((s) => subjectOk(list, s.name)).length, complete = r.subjects.length > 0 && okCount === r.subjects.length;
            const key = `${title}|${r.key}`, isOpen = open === key;
            return (
              <Fragment key={key}>
                <tr className="cursor-pointer border-t hover:bg-slate-50" onClick={() => setOpen(isOpen ? null : key)}>
                  <td className="td text-slate-400">{isOpen ? <FaChevronDown /> : <FaChevronRight />}</td>
                  <td className="td font-semibold">{r.className}</td><td className="td">{r.section || "-"}</td>
                  <td className="td text-center"><span className="inline-flex items-center gap-2"><Tick ok={complete} title={complete ? "All done" : "Something is missing"} /><span className="text-xs text-slate-500">{okCount}/{r.subjects.length}</span></span></td>
                </tr>
                {isOpen && (
                  <tr className="bg-slate-50"><td colSpan={4} className="p-3">
                    <table className="w-full rounded-lg bg-white">
                      <thead><tr><th className="th">Subject</th><th className="th">Teacher</th><th className="th text-center">Done</th><th className="th">{kind === "diary" ? "Homework / Note" : kind === "papers" ? "Test / exam paper" : "Paper and marks given"}</th></tr></thead>
                      <tbody>
                        {r.subjects.map((s) => { const es = ofSubject(list, s.name), ok = subjectOk(list, s.name); return (
                          <tr key={s.name} className="border-t"><td className="td font-medium">{s.name}</td><td className="td">{s.teachers.join(", ")}</td><td className="td text-center"><Tick ok={ok} title={ok ? "Done" : "Not done"} /></td>
                            <td className={`td ${es.length ? "" : "text-red-500"}`}>{es.length ? detail(es) : kind === "diary" ? "Diary not filled" : "No test or exam paper on this date"}</td></tr>); })}
                        {!r.subjects.length && <tr><td colSpan={4} className="td py-4 text-center text-slate-400">No subjects assigned yet</td></tr>}
                      </tbody>
                    </table>
                  </td></tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{LABEL[kind]} status</h2>
          <p className="text-sm text-slate-500">Green tick = done for {date === today() ? "today" : date}, red cross = not done. Click a class to see its subjects.</p>
        </div>
        <div className="flex items-end gap-2">
          <div><label className="text-xs font-semibold text-slate-500">Date</label><input type="date" className="input mt-1 w-44" value={date} onChange={(e) => setDate(e.target.value || today())} /></div>
          {date !== today() && <button className="btn-light" onClick={() => setDate(today())}>Today</button>}
        </div>
      </div>
      {table("My class - subject wise", "All subjects of the class you are class teacher of, with their subject teachers.", classRows)}
      {table(isClassTeacher ? "My subject in other classes" : "Classes I teach", isClassTeacher ? "The subject you teach in other classes." : "The classes and subjects assigned to you by the school or your class teacher.", otherRows)}
    </div>
  );
}
