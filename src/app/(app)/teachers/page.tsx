"use client";
import { useCallback, useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { api } from "@/lib/api";
import { Field, Swal, formDialog, toast } from "@/lib/alerts";
import { assignmentsOf, classTeacherAssignment, classTeacherClasses, nz, splitList } from "@/lib/teacher-scope";
import AccountActions, { badge } from "@/components/account-actions";
import { useSession } from "@/components/session";

const TYPES = ["Class teacher", "Subject teacher"];
const esc = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const lbl = (t: string) => `<label style="display:block;text-align:left;font-size:13px;margin-top:8px;color:#475569">${t}</label>`;
const inp = (k: string, v: any) => `<input data-k="${k}" value="${esc(v)}" class="swal2-input" style="width:100%;margin:4px 0">`;

// one assignment = teacher type + class + section + subject
function block(a: any, i: number) {
  return `<div class="asg" style="border:1px solid #e2e8f0;border-radius:8px;padding:4px 12px 10px;margin-top:12px;text-align:left">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><b style="font-size:13px">${i === 0 ? "Teacher assignment" : "Extra assignment"}</b>${i > 0 ? '<button type="button" class="asg-del" title="Remove" style="border:0;background:none;color:#dc2626;font-size:18px;cursor:pointer">✕</button>' : ""}</div>
    ${lbl("Teacher type")}<select data-k="teacherType" class="swal2-select" style="width:100%;margin:4px 0">${TYPES.map((t) => `<option ${t === a.teacherType ? "selected" : ""}>${t}</option>`).join("")}</select>
    ${lbl("Teacher class (e.g. 5 or 5, 6)")}${inp("className", a.className)}
    ${lbl("Teacher section (e.g. A)")}${inp("section", a.section)}
    ${lbl("Teacher subject")}${inp("subject", a.subject)}
  </div>`;
}

// School admin dialog: name, assignments (+ "Add new entry" for more), phone, email, password
async function teacherDialog(title: string, t: any, isNew: boolean) {
  const first = { teacherType: t.teacherType || "Class teacher", className: t.className, section: t.section, subject: t.subject };
  const blocks = [first, ...(t.assignments || [])];
  const pw = isNew ? `${lbl("Password (6+ chars) *")}<div style="position:relative"><input id="t-password" type="password" class="swal2-input" style="width:100%;margin:4px 0;padding-right:44px"><button type="button" onclick="var i=document.getElementById('t-password');var s=i.type==='password';i.type=s?'text':'password';this.textContent=s?'👁️':'👁️‍🗨️'" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:0;font-size:18px;cursor:pointer">👁️‍🗨️</button></div>` : "";
  const res = await Swal.fire({
    title, focusConfirm: false, showCancelButton: true, confirmButtonText: "Save", confirmButtonColor: "#2563eb",
    html: `${lbl("Teacher name *")}<input id="t-name" class="swal2-input" style="width:100%;margin:4px 0" value="${esc(t.name)}">
      <div id="asg-list">${blocks.map(block).join("")}</div>
      <button type="button" id="asg-add" style="margin-top:12px;border:1px dashed #94a3b8;background:#f8fafc;border-radius:8px;padding:8px 14px;color:#047857;font-weight:600;cursor:pointer">+ Add new entry</button>
      ${lbl("Phone")}<input id="t-phone" class="swal2-input" style="width:100%;margin:4px 0" value="${esc(t.phone)}">
      ${lbl("Email (login) *")}<input id="t-email" type="email" class="swal2-input" style="width:100%;margin:4px 0" value="${esc(t.email)}">${pw}`,
    didOpen: () => {
      const list = document.getElementById("asg-list")!;
      document.getElementById("asg-add")!.onclick = () => list.insertAdjacentHTML("beforeend", block({ teacherType: "Subject teacher" }, list.children.length + 1));
      list.onclick = (e) => { const b = (e.target as HTMLElement).closest(".asg-del"); if (b) b.closest(".asg")!.remove(); };
    },
    preConfirm: () => {
      const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() || "";
      const all = [...document.querySelectorAll(".asg")].map((el) => Object.fromEntries([...el.querySelectorAll("[data-k]")].map((i) => [(i as HTMLInputElement).dataset.k, (i as HTMLInputElement).value.trim()])));
      if (!val("t-name")) { Swal.showValidationMessage("Teacher name is required"); return false; }
      if (!val("t-email")) { Swal.showValidationMessage("Email is required"); return false; }
      if (isNew && val("t-password").length < 6) { Swal.showValidationMessage("Password must be 6+ characters"); return false; }
      return { name: val("t-name"), phone: val("t-phone"), email: val("t-email"), ...(isNew ? { password: val("t-password") } : {}), ...all[0], extras: all.slice(1) };
    },
  });
  return res.isConfirmed ? res.value : null;
}

// Class teacher adding a subject teacher: type, class and section are filled in automatically
const classTeacherFields: Field[] = [
  { name: "name", label: "Teacher name", required: true },
  { name: "subject", label: "Teacher subject", required: true },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email (login)", type: "email", required: true },
];
const line = (a: any) => `${a.teacherType === "Class teacher" ? "Class teacher" : "Subject teacher"} - ${a.className || "?"}${a.section ? " " + a.section : ""}${a.subject ? " - " + a.subject : ""}`;

export default function TeachersPage() {
  const { user } = useSession();
  const isSchool = user.role === "school";
  const ct: any = classTeacherAssignment(user);
  const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(() => api("/api/users?role=teacher").then((d) => setRows(d.items)).catch((e) => toast("error", e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    const v = isSchool
      ? await teacherDialog("Add teacher", {}, true)
      : await formDialog("Add subject teacher", [...classTeacherFields, { name: "password", label: "Password (6+ chars)", type: "password", required: true }]);
    if (!v) return;
    try { await api("/api/users", { method: "POST", body: v }); toast("success", "Teacher created"); load(); }
    catch (e: any) { toast("error", e.message); }
  }
  async function edit(u: any) {
    const v = isSchool ? await teacherDialog("Edit teacher", u, false) : await formDialog("Edit teacher", classTeacherFields, { ...u, subject: u.matchedSubject ?? u.subject });
    if (!v) return;
    try { await api(`/api/users/${u._id}`, { method: "PATCH", body: v }); toast("success", "Teacher updated"); load(); }
    catch (e: any) { toast("error", e.message); }
  }

  const myClasses = classTeacherClasses(user);
  // the teacher's assignments outside this class teacher's own class(es)
  const otherTeaching = (u: any) => {
    const rest = assignmentsOf(u).filter((a) => !splitList(a.className).some((c) => myClasses.some((m) => nz(m.className) === nz(c))));
    return rest.length ? rest.map((a, i) => <div key={i}>{a.className} {a.section} - {a.subject}</div>) : "-";
  };
  const heads = isSchool ? ["Name", "Type", "Class", "Section", "Subject", "Extra assignments", "Phone", "Email", "Status", "Actions"] : ["Name", "Subject", "Also teaches", "Phone", "Email", "Status", "Actions"];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{isSchool ? "Teachers" : "Subject Teachers"}</h1>
          {!isSchool && <p className="text-sm text-slate-500">Class {ct?.className || "-"}{ct?.section ? ` - Section ${ct.section}` : ""}. Teachers you add here are subject teachers of your class.</p>}
        </div>
        <button className="btn flex items-center gap-2" onClick={add}><FaPlus /> {isSchool ? "Add teacher" : "Add subject teacher"}</button>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr>{heads.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u._id} className="border-t">
                <td className="td">{u.name}</td>
                {isSchool && <><td className="td">{u.teacherType || "-"}</td><td className="td">{u.className || "-"}</td><td className="td">{u.section || "-"}</td></>}
                <td className="td">{(u.matchedSubject ?? u.subject) || "-"}</td>
                {!isSchool && <td className="td text-xs">{otherTeaching(u)}</td>}
                {isSchool && <td className="td text-xs">{(u.assignments || []).length ? (u.assignments || []).map((a: any, i: number) => <div key={i}>{line(a)}</div>) : "-"}</td>}
                <td className="td">{u.phone}</td><td className="td">{u.email}</td>
                <td className="td"><span className={`rounded px-2 py-1 text-xs capitalize ${badge[u.status]}`}>{u.status}</span></td>
                <td className="td whitespace-nowrap"><AccountActions u={u} reload={load} onEdit={edit} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={heads.length} className="td py-8 text-center text-slate-400">No teachers yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
