"use client";
import { useCallback, useEffect, useState } from "react";
import { FaPen, FaPlus, FaPrint, FaTrash } from "react-icons/fa";
import { api, today } from "@/lib/api";
import { Field, confirmDelete, formDialog, toast } from "@/lib/alerts";
import { printPaper } from "@/lib/print";
import { sessionOptions } from "@/lib/results";
import { useSession } from "./session";
import { classSubjectFields } from "@/lib/teacher-scope";
import type { PaperType } from "./school-papers";

const label = (type: PaperType) => (type === "exam" ? "Exam" : "Test");
const fieldsFor = (type: PaperType, classSubject: Field[]): Field[] => [
  { name: "title", label: type === "exam" ? "Exam title (e.g. Mid Term Math)" : "Test title (e.g. Maths Monthly Test)", required: true },
  ...(type === "exam" ? [{ name: "term", label: "Exam term (only for exams)", type: "select", options: ["", "First term", "Mid term", "Final term"] } as Field] : []),
  ...(type === "exam" ? [{ name: "session", label: "Session", type: "select", options: sessionOptions() } as Field] : []),
  ...(type === "exam" ? [{ name: "passPercentage", label: "Pass percentage", type: "number", hint: "Marks needed to pass. Empty = 33%." } as Field] : []),
  ...classSubject,
  { name: "date", label: "Date", type: "date" },
  { name: "totalMarks", label: "Total marks", type: "number", required: true },
  { name: "questions", label: "Questions (one per line)", type: "textarea" },
];

// Teacher portal: his own tests (Tests tab) or exams (Exams tab). The Tests tab
// only offers "+ Test", the Exams tab only "+ Exam".
export default function TeacherPapers({ type }: { type: PaperType }) {
  const { user } = useSession();
  const { classSubject, editClassSubject, extra, transform } = classSubjectFields(user);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const load = useCallback(() => api("/api/papers").then((d) => setRows(d.items.filter((r: any) => r.type === type))).catch((e) => toast("error", e.message)), [type]);
  useEffect(() => { load(); }, [load]);

  async function save(row?: any) {
    const v = await formDialog(row ? `Edit ${label(type).toLowerCase()}` : `Add ${label(type).toLowerCase()}`, fieldsFor(type, row ? editClassSubject : classSubject), row || { type, date: today(), term: "First term", session: sessionOptions()[2] || "" });
    if (!v) return;
    if (type === "exam" && !v.term) return toast("error", "Select the exam term (First, Mid or Final term) for an exam paper");
    try {
      await api(row ? `/api/papers/${row._id}` : "/api/papers", { method: row ? "PUT" : "POST", body: row ? transform(v, false) : { ...extra, ...transform(v, true) } });
      toast("success", "Paper saved"); load();
    } catch (e: any) { toast("error", e.message); }
  }
  async function remove(row: any) {
    if (!(await confirmDelete())) return;
    try { await api(`/api/papers/${row._id}`, { method: "DELETE" }); toast("success", "Deleted"); load(); }
    catch (e: any) { toast("error", e.message); }
  }

  const shown = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase())).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold">{type === "exam" ? "Exams" : "Tests"}</h1><p className="text-sm text-slate-500">Previous {type === "exam" ? "exams" : "tests"} are listed below. Use Add {label(type)} to create a new one.</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn flex items-center gap-2" onClick={() => save()}><FaPlus /> Add {label(type)}</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input className="input w-full sm:w-48" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[600px]">
          <thead><tr>{["Title", ...(type === "exam" ? ["Term"] : []), "Class", "Subject", "Date", "Total marks", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="td">{r.title}</td>
                {type === "exam" && <td className="td">{r.term || "-"}</td>}
                <td className="td">{r.className}</td><td className="td">{r.subject}</td><td className="td">{r.date}</td><td className="td">{r.totalMarks}</td>
                <td className="td whitespace-nowrap">
                  <button className="icon-btn text-slate-600" title="Print" onClick={() => printPaper(r, user.schoolInfo)}><FaPrint /></button>
                  <button className="icon-btn text-blue-600" title="Edit" onClick={() => save(r)}><FaPen /></button>
                  <button className="icon-btn text-red-600" title="Delete" onClick={() => remove(r)}><FaTrash /></button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={7} className="td py-8 text-center text-slate-400">No {type === "exam" ? "exams" : "tests"} yet. Click Add {label(type)}.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
