"use client";
import { useCallback, useEffect, useState } from "react";
import { FaPen, FaTimes, FaTrash } from "react-icons/fa";
import { api } from "@/lib/api";
import { confirmDelete, toast } from "@/lib/alerts";

export default function MarksEntry({ initialPaperId = "" }: { initialPaperId?: string }) {
  const [papers, setPapers] = useState<any[]>([]);
  const [paperId, setPaperId] = useState(initialPaperId);
  const [students, setStudents] = useState<any[]>([]);
  const [saved, setSaved] = useState<Record<string, { id: string; obtained: number }>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string[]>([]); // students whose saved mark is being changed
  const [saving, setSaving] = useState(false);
  const paper = papers.find((p) => p._id === paperId);

  useEffect(() => { api("/api/papers").then((d) => setPapers(d.items)); }, []);

  // students of the paper's class + the marks already stored on the server
  const load = useCallback(async (p: any) => {
    if (!p) return;
    const [st, mk] = await Promise.all([api(`/api/students?className=${encodeURIComponent(p.className)}`), api(`/api/marks?paper=${p._id}`)]);
    setStudents(st.items.sort((a: any, b: any) => Number(a.rollNo) - Number(b.rollNo)));
    setSaved(Object.fromEntries(mk.items.map((m: any) => [m.student, { id: m._id, obtained: m.obtained }])));
    setValues(Object.fromEntries(mk.items.map((m: any) => [m.student, String(m.obtained)])));
    setEditing([]);
  }, []);
  useEffect(() => { load(paper).catch((e) => toast("error", e.message)); }, [paperId, papers]); // eslint-disable-line

  const isOpen = (id: string) => !saved[id] || editing.includes(id); // row shows an input
  async function save() {
    const marks = students.filter((s) => isOpen(s._id) && values[s._id] !== undefined && values[s._id] !== "").map((s) => ({ student: s._id, obtained: Number(values[s._id]) }));
    if (!marks.length) return toast("error", "Enter marks for at least one student");
    setSaving(true);
    try {
      await api("/api/marks/bulk", { method: "POST", body: { paper: paperId, marks } });
      await load(paper); // show what is really stored
      toast("success", `Marks saved for ${marks.length} student(s)`);
    } catch (e: any) { toast("error", e.message); }
    finally { setSaving(false); }
  }
  async function remove(s: any) {
    if (!(await confirmDelete(`Delete the marks of ${s.name}?`))) return;
    try { await api(`/api/marks/${saved[s._id].id}`, { method: "DELETE" }); toast("success", "Marks deleted"); await load(paper); }
    catch (e: any) { toast("error", e.message); }
  }
  const cancelEdit = (s: any) => { setEditing(editing.filter((x) => x !== s._id)); setValues({ ...values, [s._id]: String(saved[s._id].obtained) }); };
  const anyOpen = students.some((s) => isOpen(s._id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Enter Marks</h1>
        <select className="input w-72" value={paperId} onChange={(e) => setPaperId(e.target.value)}>
          <option value="">Select test / exam paper</option>
          {papers.map((p) => <option key={p._id} value={p._id}>{p.title} - Class {p.className} ({p.type})</option>)}
        </select>
      </div>
      {paper && (
        <div className="card overflow-x-auto p-0">
          <p className="p-4 pb-2 text-sm text-slate-500">Marks saved: {Object.keys(saved).length} of {students.length} students · Total marks {paper.totalMarks}</p>
          <table className="w-full">
            <thead><tr><th className="th">Roll #</th><th className="th">Student</th><th className="th">Marks (out of {paper.totalMarks})</th><th className="th">Actions</th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id} className="border-t">
                  <td className="td">{s.rollNo}</td><td className="td">{s.name}</td>
                  <td className="td">
                    {isOpen(s._id)
                      ? <input type="number" min={0} max={paper.totalMarks} className="input w-32" value={values[s._id] ?? ""} onChange={(e) => setValues({ ...values, [s._id]: e.target.value })} />
                      : <span className="font-semibold">{saved[s._id].obtained} <span className="font-normal text-slate-400">/ {paper.totalMarks}</span></span>}
                  </td>
                  <td className="td whitespace-nowrap">
                    {saved[s._id] && !editing.includes(s._id) && <>
                      <button className="icon-btn text-blue-600" title="Edit marks" onClick={() => setEditing([...editing, s._id])}><FaPen /></button>
                      <button className="icon-btn text-red-600" title="Delete marks" onClick={() => remove(s)}><FaTrash /></button>
                    </>}
                    {saved[s._id] && editing.includes(s._id) && <button className="icon-btn text-slate-500" title="Cancel edit" onClick={() => cancelEdit(s)}><FaTimes /></button>}
                  </td>
                </tr>
              ))}
              {!students.length && <tr><td colSpan={4} className="td py-8 text-center text-slate-400">No students found in class {paper.className}</td></tr>}
            </tbody>
          </table>
          {!!students.length && anyOpen && <div className="p-4"><button className="btn" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save marks"}</button></div>}
        </div>
      )}
    </div>
  );
}
