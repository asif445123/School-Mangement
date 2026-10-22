"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import { FaChevronDown, FaChevronRight, FaPlus } from "react-icons/fa";
import { api } from "@/lib/api";
import { Field, formDialog, toast } from "@/lib/alerts";
import { assignmentsOf, classTeacherClasses, nz, PERIOD_OPTIONS, splitList } from "@/lib/teacher-scope";
import { Directory, classTeacherDialog, emptyDirectory, schoolTeacherDialog } from "@/lib/teacher-dialogs";
import AccountActions, { badge } from "@/components/account-actions";
import { useSession } from "@/components/session";

// Class teacher editing a subject teacher: only the subject he teaches in this class
const classTeacherFields: Field[] = [
  { name: "name", label: "Teacher name", required: true },
  { name: "subject", label: "Teacher subject", required: true },
  { name: "period", label: "Period", type: "select", options: ["", ...PERIOD_OPTIONS], required: true },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email (login)", type: "email", required: true },
];
const asgText = (a: any) => `${a.className || "?"}${a.section ? " " + a.section : ""}${a.subject ? " - " + a.subject : ""}${a.period ? ` (Period ${a.period})` : ""}`;

export default function TeachersPage() {
  const { user } = useSession();
  const isSchool = user.role === "school";
  const myClasses = classTeacherClasses(user);
  const [rows, setRows] = useState<any[]>([]);
  const [dir, setDir] = useState<Directory>(emptyDirectory);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => {
    api("/api/users?role=teacher").then((d) => setRows(d.items)).catch((e) => toast("error", e.message));
    api("/api/users?view=directory").then(setDir).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    const v = isSchool ? await schoolTeacherDialog("Add teacher", {}, true, dir) : await classTeacherDialog(dir);
    if (!v) return;
    try {
      const d = await api("/api/users", { method: "POST", body: v });
      toast("success", v.existingId ? (d.unchanged ? "This teacher already has that assignment" : "Added to the saved teacher") : "Teacher created");
      load();
    } catch (e: any) { toast("error", e.message); }
  }
  async function edit(u: any) {
    const v = isSchool ? await schoolTeacherDialog("Edit teacher", u, false, dir) : await formDialog("Edit teacher", classTeacherFields, { ...u, subject: u.matchedSubject ?? u.subject, period: u.matchedPeriod ?? u.period });
    if (!v) return;
    try { await api(`/api/users/${u._id}`, { method: "PATCH", body: v }); toast("success", "Teacher updated"); load(); }
    catch (e: any) { toast("error", e.message); }
  }
  // what a class teacher's colleague teaches outside the class teacher's own class(es)
  const otherTeaching = (u: any) => {
    const rest = assignmentsOf(u).filter((a) => !splitList(a.className).some((c) => myClasses.some((m) => nz(m.className) === nz(c))));
    return rest.length ? rest.map((a, i) => <div key={i}>{asgText(a)}</div>) : "-";
  };

  const heads = isSchool ? ["", "Name", "Type", "Class", "Section", "Subject", "Period", "Phone", "Email", "Status", "Actions"] : ["Name", "Subject", "Period", "Also teaches", "Phone", "Email", "Status", "Actions"];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{isSchool ? "Teachers" : "Subject Teachers"}</h1>
          <p className="text-sm text-slate-500">{isSchool ? "Click a teacher to see all his classes and subjects." : `Class ${myClasses.map((c) => c.className + (c.section ? " " + c.section : "")).join(", ") || "-"}. Teachers you add here are subject teachers of your class. Choose a saved teacher's name to add your class to him.`}</p>
        </div>
        <button className="btn flex items-center gap-2" onClick={add}><FaPlus /> {isSchool ? "Add teacher" : "Add subject teacher"}</button>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr>{heads.map((h, i) => <th key={i} className={`th ${h === "" ? "w-8" : ""}`}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((u) => {
              const all = assignmentsOf(u), isOpen = open === u._id;
              return (
                <Fragment key={u._id}>
                  <tr className={`border-t ${isSchool ? "cursor-pointer hover:bg-slate-50" : ""}`} onClick={() => isSchool && setOpen(isOpen ? null : u._id)}>
                    {isSchool && <td className="td text-slate-400">{isOpen ? <FaChevronDown /> : <FaChevronRight />}</td>}
                    <td className="td">{u.name}</td>
                    {isSchool && <><td className="td">{u.teacherType || "-"}</td><td className="td">{u.className || "-"}</td><td className="td">{u.section || "-"}</td></>}
                    <td className="td">{(u.matchedSubject ?? u.subject) || "-"}{isSchool && all.length > 1 && <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">+{all.length - 1} more</span>}</td>
                    <td className="td">{(u.matchedPeriod ?? u.period) ? `Period ${u.matchedPeriod ?? u.period}` : <span className="text-slate-400">Not set</span>}</td>
                    {!isSchool && <td className="td text-xs">{otherTeaching(u)}</td>}
                    <td className="td">{u.phone}</td><td className="td">{u.email}</td>
                    <td className="td"><span className={`rounded px-2 py-1 text-xs capitalize ${badge[u.status]}`}>{u.status}</span></td>
                    <td className="td whitespace-nowrap" onClick={(e) => e.stopPropagation()}><AccountActions u={u} reload={load} onEdit={edit} /></td>
                  </tr>
                  {isSchool && isOpen && (
                    <tr className="bg-slate-50"><td colSpan={heads.length} className="p-3">
                      <table className="w-full rounded-lg bg-white">
                        <thead><tr><th className="th">Teacher type</th><th className="th">Class</th><th className="th">Section</th><th className="th">Subject</th><th className="th">Period</th></tr></thead>
                        <tbody>
                          {all.map((a, i) => <tr key={i} className="border-t"><td className="td">{a.teacherType || "-"}{i === 0 && <span className="ml-2 text-xs text-slate-400">(main)</span>}</td><td className="td">{a.className || "-"}</td><td className="td">{a.section || "-"}</td><td className="td">{a.subject || "-"}</td><td className="td">{a.period ? `Period ${a.period}` : "Not set"}</td></tr>)}
                          {!all.length && <tr><td colSpan={5} className="td py-4 text-center text-slate-400">No assignments yet. Use the edit icon to add them.</td></tr>}
                        </tbody>
                      </table>
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
            {!rows.length && <tr><td colSpan={heads.length} className="td py-8 text-center text-slate-400">No teachers yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
