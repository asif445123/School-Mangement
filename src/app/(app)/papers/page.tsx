"use client";
import { useCallback, useEffect, useState } from "react";
import { FaPen, FaPlus, FaPrint, FaTrash } from "react-icons/fa";
import { api, today } from "@/lib/api";
import { Field, confirmDelete, formDialog, toast } from "@/lib/alerts";
import { printPaper } from "@/lib/print";
import { useSession } from "@/components/session";
import { classSubjectFields } from "@/lib/teacher-scope";
import SchoolPapers from "@/components/school-papers";
import TeacherStatus from "@/components/teacher-status";

const fieldsFor = (classSubject: Field[]): Field[] => [
  { name: "title", label: "Title (e.g. Maths Monthly Test)", required: true },
  { name: "type", label: "Type", type: "select", options: ["test", "exam"] },
  { name: "term", label: "Exam term (only for exams)", type: "select", options: ["", "First term", "Mid term", "Final term"] },
  ...classSubject,
  { name: "date", label: "Date", type: "date" },
  { name: "totalMarks", label: "Total marks", type: "number", required: true },
  { name: "questions", label: "Questions (one per line)", type: "textarea" },
];

function TeacherPapers() {
  const { user } = useSession();
  const { classSubject, editClassSubject, extra, transform } = classSubjectFields(user);
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "test" | "exam">("all");
  const [q, setQ] = useState("");
  const load = useCallback(() => api("/api/papers").then((d) => setRows(d.items)).catch((e) => toast("error", e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function save(row?: any, type?: "test" | "exam") {
    const v = await formDialog(row ? "Edit paper" : `Add ${type === "exam" ? "exam" : "test"} paper`, fieldsFor(row ? editClassSubject : classSubject), row || { type, date: today() });
    if (!v) return;
    if (v.type === "exam" && !v.term) return toast("error", "Select the exam term (First, Mid or Final term) for an exam paper");
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

  const shown = rows.filter((r) => (filter === "all" || r.type === filter) && JSON.stringify(r).toLowerCase().includes(q.toLowerCase())).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold">Test & Exam Papers</h1><p className="text-sm text-slate-500">Previous tests and papers are listed below. Use Add Test or Add Exam to create a new one.</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn flex items-center gap-2" onClick={() => save(undefined, "test")}><FaPlus /> Add Test</button>
          <button className="btn flex items-center gap-2 !bg-emerald-600 hover:!bg-emerald-700" onClick={() => save(undefined, "exam")}><FaPlus /> Add Exam</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "test", "exam"] as const).map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${filter === t ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{t === "all" ? `All papers (${rows.length})` : `${t === "test" ? "Tests" : "Exams"} (${rows.filter((r) => r.type === t).length})`}</button>
        ))}
        <input className="input w-full sm:ml-auto sm:w-48" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[600px]">
          <thead><tr>{["Title", "Type", "Term", "Class", "Subject", "Date", "Total marks", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="td">{r.title}</td>
                <td className="td"><span className={`rounded px-2 py-1 text-xs uppercase ${r.type === "exam" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{r.type}</span></td>
                <td className="td">{r.type === "exam" ? r.term || "-" : "-"}</td><td className="td">{r.className}</td><td className="td">{r.subject}</td><td className="td">{r.date}</td><td className="td">{r.totalMarks}</td>
                <td className="td whitespace-nowrap">
                  <button className="icon-btn text-slate-600" title="Print" onClick={() => printPaper(r, user.schoolInfo)}><FaPrint /></button>
                  <button className="icon-btn text-blue-600" title="Edit" onClick={() => save(r)}><FaPen /></button>
                  <button className="icon-btn text-red-600" title="Delete" onClick={() => remove(r)}><FaTrash /></button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={8} className="td py-8 text-center text-slate-400">No papers yet. Click Add Test or Add Exam.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PapersPage() {
  const { user } = useSession();
  return user.role === "school" ? <SchoolPapers /> : <div className="space-y-8"><TeacherStatus kind="papers" /><TeacherPapers /></div>;
}
