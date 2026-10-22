"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaChevronDown, FaChevronRight, FaPen, FaPlus, FaTimesCircle, FaTrash } from "react-icons/fa";
import { api, today } from "@/lib/api";
import { confirmDelete, formDialog, toast } from "@/lib/alerts";
import { ClassRow, buildClasses, norm } from "@/lib/class-rows";

const Tick = ({ ok, title }: { ok: boolean; title: string }) => ok ? <FaCheckCircle className="text-lg text-green-600" title={title} /> : <FaTimesCircle className="text-lg text-red-500" title={title} />;
const short = (s: string, n = 90) => (s.length > n ? s.slice(0, n) + "..." : s);

export default function SchoolDiary() {
  const [date, setDate] = useState(today());
  const [teachers, setTeachers] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => Promise.all([api("/api/users?role=teacher"), api(`/api/diary?date=${date}`)]).then(([t, d]) => { setTeachers(t.items); setEntries(d.items); }).catch((e) => toast("error", e.message)), [date]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => buildClasses(teachers), [teachers]);
  // diary entries of the chosen date that belong to a class (entries without a section count for every section)
  const ofClass = (r: ClassRow) => entries.filter((e) => norm(e.className) === norm(r.className) && (!e.section || norm(e.section) === norm(r.section)));
  const ofSubject = (list: any[], subject: string) => list.filter((e) => norm(e.subject) === norm(subject));

  const textField = [{ name: "text", label: "Homework / Note", type: "textarea", required: true }];
  async function add(r: ClassRow, subject: string) {
    const v = await formDialog(`Add diary - Class ${r.className}${r.section ? " " + r.section : ""} - ${subject}`, textField);
    if (!v) return;
    try { await api("/api/diary", { method: "POST", body: { date, className: r.className, section: r.section, subject, text: v.text } }); toast("success", "Diary added"); load(); }
    catch (e: any) { toast("error", e.message); }
  }
  async function edit(e: any) {
    const v = await formDialog(`Edit diary - ${e.subject}`, textField, e);
    if (!v) return;
    try { await api(`/api/diary/${e._id}`, { method: "PUT", body: { text: v.text } }); toast("success", "Saved"); load(); }
    catch (er: any) { toast("error", er.message); }
  }
  async function remove(e: any) {
    if (!(await confirmDelete())) return;
    try { await api(`/api/diary/${e._id}`, { method: "DELETE" }); toast("success", "Deleted"); load(); }
    catch (er: any) { toast("error", er.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Daily Diary</h1>
          <p className="text-sm text-slate-500">{date === today() ? "Today's diary" : `Diary of ${date}`} - click a class to see its subjects.</p>
        </div>
        <div className="flex items-end gap-2">
          <div><label className="text-xs font-semibold text-slate-500">Date</label><input type="date" className="input mt-1 w-44" value={date} onChange={(e) => setDate(e.target.value || today())} /></div>
          {date !== today() && <button className="btn-light" onClick={() => setDate(today())}>Today</button>}
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[600px]">
          <thead><tr><th className="th w-8"></th><th className="th">Class teacher</th><th className="th">Class</th><th className="th">Section</th><th className="th">Homework / Note</th><th className="th text-center">Diary</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const list = ofClass(r), filled = r.subjects.filter((s) => ofSubject(list, s.name).length).length, complete = r.subjects.length > 0 && filled === r.subjects.length;
              const others = list.filter((e) => !r.subjects.some((s) => norm(s.name) === norm(e.subject)));
              const isOpen = open === r.key;
              const summary = list.map((e) => `${e.subject}: ${e.text}`).join(" · ");
              return (
                <Fragment key={r.key}>
                  <tr className="cursor-pointer border-t hover:bg-slate-50" onClick={() => setOpen(isOpen ? null : r.key)}>
                    <td className="td text-slate-400">{isOpen ? <FaChevronDown /> : <FaChevronRight />}</td>
                    <td className="td">{r.classTeachers.join(", ") || "-"}</td><td className="td font-semibold">{r.className}</td><td className="td">{r.section || "-"}</td>
                    <td className="td text-slate-600">{summary ? short(summary) : <span className="text-slate-400">No diary yet</span>}</td>
                    <td className="td text-center">{r.subjects.length ? <span className="inline-flex items-center gap-2"><Tick ok={complete} title={complete ? "All subjects filled" : "Some subjects missing"} /><span className="text-xs text-slate-500">{filled}/{r.subjects.length}</span></span> : <span className="text-slate-300">-</span>}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50"><td colSpan={6} className="p-3">
                      <table className="w-full rounded-lg bg-white">
                        <thead><tr><th className="th">Subject</th><th className="th">Teacher</th><th className="th text-center">Filled</th><th className="th">Homework / Note</th><th className="th">Actions</th></tr></thead>
                        <tbody>
                          {r.subjects.map((s) => {
                            const es = ofSubject(list, s.name);
                            if (!es.length) return (
                              <tr key={s.name} className="border-t"><td className="td font-medium">{s.name}</td><td className="td">{s.teachers.join(", ")}</td><td className="td text-center"><Tick ok={false} title="Diary not filled" /></td>
                                <td className="td text-slate-400">Not filled</td>
                                <td className="td"><button className="icon-btn text-emerald-600" title="Add diary" onClick={() => add(r, s.name)}><FaPlus /></button></td></tr>
                            );
                            return es.map((e, i) => (
                              <tr key={e._id} className="border-t"><td className="td font-medium">{i === 0 ? s.name : ""}</td><td className="td">{i === 0 ? s.teachers.join(", ") : ""}</td><td className="td text-center"><Tick ok title="Diary filled" /></td>
                                <td className="td">{e.text}</td>
                                <td className="td whitespace-nowrap"><button className="icon-btn text-blue-600" title="Edit" onClick={() => edit(e)}><FaPen /></button><button className="icon-btn text-red-600" title="Delete" onClick={() => remove(e)}><FaTrash /></button></td></tr>
                            ));
                          })}
                          {others.map((e) => (
                            <tr key={e._id} className="border-t"><td className="td font-medium">{e.subject}</td><td className="td text-slate-400">not assigned</td><td className="td text-center"><Tick ok title="Diary filled" /></td><td className="td">{e.text}</td>
                              <td className="td whitespace-nowrap"><button className="icon-btn text-blue-600" title="Edit" onClick={() => edit(e)}><FaPen /></button><button className="icon-btn text-red-600" title="Delete" onClick={() => remove(e)}><FaTrash /></button></td></tr>
                          ))}
                          {!r.subjects.length && !others.length && <tr><td colSpan={5} className="td py-4 text-center text-slate-400">No subject teachers are assigned to this class yet (add them on the Teachers page).</td></tr>}
                        </tbody>
                      </table>
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
            {!rows.length && <tr><td colSpan={6} className="td py-8 text-center text-slate-400">No classes yet. Add teachers with a class and subject on the Teachers page.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
