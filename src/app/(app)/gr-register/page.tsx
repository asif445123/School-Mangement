"use client";
import { useCallback, useEffect, useState } from "react";
import { FaPen, FaPlus, FaTrash } from "react-icons/fa";
import { api, today } from "@/lib/api";
import { Field, Swal, confirmDelete, formDialog, toast } from "@/lib/alerts";

const fields: Field[] = [
  { name: "grNo", label: "G.R. No.", required: true },
  { name: "admissionDate", label: "Date of admission", type: "date" },
  { name: "name", label: "Name of student", required: true },
  { name: "fatherName", label: "Father's name" },
  { name: "fatherOccupation", label: "Father's occupation" },
  { name: "gender", label: "Gender", type: "radio", options: ["Male", "Female"] },
  { name: "dob", label: "Date of birth", type: "date" },
  { name: "address", label: "Address", type: "textarea" },
  { name: "phone", label: "Phone" },
  { name: "admissionClass", label: "Class in which admitted" },
  { name: "previousSchool", label: "Previous school" },
  { name: "leavingDate", label: "Date of leaving (empty if still studying)", type: "date" },
  { name: "leavingClass", label: "Class at leaving" },
  { name: "leavingReason", label: "Reason for leaving (e.g. Passed, Transfer)" },
  { name: "remarks", label: "Remarks", type: "textarea" },
];

export default function GrRegisterPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const load = useCallback(() => Promise.all([api("/api/grRegister"), api("/api/students")]).then(([g, s]) => { setRows(g.items); setStudents(s.items); }).catch((e) => toast("error", e.message)), []);
  useEffect(() => { load(); }, [load]);

  const nextNo = () => String(Math.max(0, ...rows.map((r) => parseInt(r.grNo) || 0)) + 1);
  async function store(v: any, id?: string) {
    try { await api(id ? `/api/grRegister/${id}` : "/api/grRegister", { method: id ? "PUT" : "POST", body: v }); toast("success", "Saved"); load(); }
    catch (e: any) { toast("error", e.message.includes("Duplicate") ? "This G.R. No. already exists" : e.message); }
  }
  async function add() {
    let base: any = { grNo: nextNo(), admissionDate: today(), gender: "Male" };
    const linked = new Set(rows.map((r) => String(r.student)));
    const free = students.filter((s) => !linked.has(s._id));
    if (free.length) { // optionally copy the details of a student already in the system
      const pick = await Swal.fire({
        title: "Add to G.R. Register", text: "Copy details from an existing student (optional)", input: "select", showCancelButton: true, confirmButtonText: "Next",
        inputOptions: { blank: "Blank entry", ...Object.fromEntries(free.map((s) => [s._id, `${s.name} (Class ${s.className}${s.rollNo ? `, Roll ${s.rollNo}` : ""})`])) },
      });
      if (!pick.isConfirmed) return;
      const s = free.find((x) => x._id === pick.value);
      if (s) base = { ...base, student: s._id, name: s.name, fatherName: s.fatherName, gender: s.gender || "Male", dob: s.dob, admissionDate: s.admissionDate || today(), admissionClass: s.className, phone: s.phone, leavingDate: s.leftDate };
    }
    const v = await formDialog("G.R. Register entry", fields, base);
    if (v) store(base.student ? { ...v, student: base.student } : v);
  }
  async function edit(r: any) { const v = await formDialog("Edit G.R. Register entry", fields, r); if (v) store(v, r._id); }
  async function remove(r: any) {
    if (!(await confirmDelete(`Delete G.R. No. ${r.grNo} (${r.name})?`))) return;
    try { await api(`/api/grRegister/${r._id}`, { method: "DELETE" }); toast("success", "Deleted"); load(); }
    catch (e: any) { toast("error", e.message); }
  }

  const shown = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase())).sort((a, b) => String(a.grNo).localeCompare(String(b.grNo), undefined, { numeric: true }));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold">G.R. Register</h1><p className="text-sm text-slate-500">Enter every admitted student here. The full register is in Reports &rarr; GR Register.</p></div>
        <div className="flex gap-2">
          <input className="input w-48" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn flex items-center gap-2" onClick={add}><FaPlus /> Add entry</button>
        </div>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr>{["G.R. No", "Admission date", "Name", "Father", "Date of birth", "Class admitted", "Left on", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="td font-semibold">{r.grNo}</td><td className="td whitespace-nowrap">{r.admissionDate || "-"}</td><td className="td">{r.name}</td><td className="td">{r.fatherName || "-"}</td>
                <td className="td whitespace-nowrap">{r.dob || "-"}</td><td className="td">{r.admissionClass || "-"}</td>
                <td className="td">{r.leavingDate ? <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">{r.leavingDate}</span> : "-"}</td>
                <td className="td whitespace-nowrap">
                  <button className="icon-btn text-blue-600" title="Edit" onClick={() => edit(r)}><FaPen /></button>
                  <button className="icon-btn text-red-600" title="Delete" onClick={() => remove(r)}><FaTrash /></button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={8} className="td py-8 text-center text-slate-400">No entries yet. Click Add entry.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
