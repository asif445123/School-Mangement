"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import { FaChevronDown, FaChevronRight, FaPlus } from "react-icons/fa";
import { api } from "@/lib/api";
import { Field, formDialog, toast } from "@/lib/alerts";
import { assignmentsOf, classTeacherAssignment, classTeacherClasses } from "@/lib/teacher-scope";
import { Directory, classTeacherDialog, emptyDirectory, schoolTeacherDialog } from "@/lib/teacher-dialogs";
import { BusySlot, busySlots, conflictsFor, conflictText, periodChoices, Seat } from "@/lib/period-conflicts";
import { blankSchedule, periodTime, SchoolSchedule } from "@/lib/timetable";
import AccountActions, { badge } from "@/components/account-actions";
import { useSession } from "@/components/session";

// Class teacher editing a subject teacher: only the subject and period he teaches in this class.
// A period that already belongs to another teacher of the class is shown but cannot be picked.
const classTeacherFields = (schedule: SchoolSchedule, busy: BusySlot[], seat: Seat): Field[] => [
  { name: "name", label: "Teacher name", required: true },
  { name: "subject", label: "Teacher subject", required: true },
  {
    name: "period", label: "Period", type: "select", required: true,
    choices: [
      { value: "", label: "Select period" },
      ...periodChoices(schedule, busy, seat).map((c) => ({ value: c.value, label: c.label, disabled: c.taken.length > 0 })),
    ],
  },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email (login)", type: "email", required: true },
];

// Period number with the period time underneath (the times are one school-wide setting)
function PeriodCell({ period, schedule }: { period?: any; schedule: SchoolSchedule }) {
  if (!period) return <span className="text-slate-400">Not set</span>;
  const time = periodTime(schedule, period);
  return (
    <div>
      <div className="font-medium text-slate-700">Period {period}</div>
      {time ? <div className="text-xs text-slate-500">{time}</div> : <div className="text-xs text-slate-400">Time not set</div>}
    </div>
  );
}
const timeText = (period: any, schedule: SchoolSchedule, friday = false) => periodTime(schedule, period, friday) || "Not set";

// All classes / subjects / periods of one teacher, shown under his row
function AssignmentTable({ all, schedule, empty }: { all: any[]; schedule: SchoolSchedule; empty?: string }) {
  return (
    <table className="w-full rounded-lg bg-white">
      <thead><tr>
        <th className="th">Teacher type</th><th className="th">Class</th><th className="th">Section</th><th className="th">Subject</th>
        <th className="th">Period</th><th className="th">Time (Mon–Thu)</th><th className="th">Friday</th>
      </tr></thead>
      <tbody>
        {all.map((a, i) => (
          <tr key={i} className="border-t">
            <td className="td">{a.teacherType || "-"}{i === 0 && <span className="ml-2 text-xs text-slate-400">(main)</span>}</td>
            <td className="td">{a.className || "-"}</td>
            <td className="td">{a.section || "-"}</td>
            <td className="td">{a.subject || "-"}</td>
            <td className="td">{a.period ? `Period ${a.period}` : <span className="text-slate-400">Not set</span>}</td>
            <td className={`td whitespace-nowrap ${periodTime(schedule, a.period) ? "text-slate-600" : "text-slate-400"}`}>{timeText(a.period, schedule)}</td>
            <td className={`td whitespace-nowrap ${periodTime(schedule, a.period, true) ? "text-slate-600" : "text-slate-400"}`}>{timeText(a.period, schedule, true)}</td>
          </tr>
        ))}
        {!all.length && <tr><td colSpan={7} className="td py-4 text-center text-slate-400">{empty || "No assignments yet. Use the edit icon to add them."}</td></tr>}
      </tbody>
    </table>
  );
}

export default function TeachersPage() {
  const { user } = useSession();
  const isSchool = user.role === "school";
  const myClasses = classTeacherClasses(user);
  const myClassAssignment: any = classTeacherAssignment(user);
  const [rows, setRows] = useState<any[]>([]);
  const [dir, setDir] = useState<Directory>(emptyDirectory);
  const [schedule, setSchedule] = useState<SchoolSchedule>(blankSchedule());
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => {
    api("/api/users?role=teacher").then((d) => setRows(d.items)).catch((e) => toast("error", e.message));
    api("/api/users?view=directory").then(setDir).catch(() => {});
    // period times of the school, so every period can be shown with its time
    api("/api/timetable").then((d) => setSchedule(d.schedule || blankSchedule())).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  // periods already taken: every teacher of the school except the one being edited
  const busyFor = (u?: any) => busySlots([...(isSchool ? [] : [user]), ...dir.items].filter((t) => String(t._id) !== String(u?._id || "")));
  // the class a class teacher adds his subject teachers to (the popup must know it
  // to show which periods are already taken by another teacher of that class)
  const myClass = { className: myClassAssignment?.className || "", section: myClassAssignment?.section || "" };

  async function add() {
    const ctx = { busy: busyFor(), schedule, myClass };
    const v = isSchool ? await schoolTeacherDialog("Add teacher", {}, true, dir, ctx) : await classTeacherDialog(dir, ctx);
    if (!v) return;
    try {
      const d = await api("/api/users", { method: "POST", body: v });
      toast("success", v.existingId ? (d.unchanged ? "This teacher already has that assignment" : "Added to the saved teacher") : "Teacher created");
      load();
    } catch (e: any) { toast("error", e.message); }
  }
  async function edit(u: any) {
    const busy = busyFor(u);
    if (isSchool) {
      const v = await schoolTeacherDialog("Edit teacher", u, false, dir, { busy, schedule });
      if (!v) return;
      try { await api(`/api/users/${u._id}`, { method: "PATCH", body: v }); toast("success", "Teacher updated"); load(); }
      catch (e: any) { toast("error", e.message); }
      return;
    }
    // his class is fixed, so only the subject / period of this class can change
    const seat = myClass;
    const v = await formDialog("Edit teacher", classTeacherFields(schedule, busy, seat),
      { ...u, subject: u.matchedSubject ?? u.subject, period: u.matchedPeriod ?? u.period },
      (values) => {
        const hits = conflictsFor({ ...seat, period: values.period }, busy);
        return hits.length ? conflictText({ ...seat, period: values.period }, hits) : null;
      });
    if (!v) return;
    try { await api(`/api/users/${u._id}`, { method: "PATCH", body: v }); toast("success", "Teacher updated"); load(); }
    catch (e: any) { toast("error", e.message); }
  }
  const heads = isSchool
    ? ["", "Name", "Type", "Class", "Section", "Subject", "Period", "Phone", "Email", "Status", "Actions"]
    : ["", "Name", "Subject", "Period", "Phone", "Email", "Status", "Actions"];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{isSchool ? "Teachers" : "Subject Teachers"}</h1>
          <p className="text-sm text-slate-500">{isSchool ? "Click a teacher to see all his classes, subjects, periods and period times." : `Class ${myClasses.map((c) => c.className + (c.section ? " " + c.section : "")).join(", ") || "-"}. Teachers you add here are subject teachers of your class. Choose a saved teacher's name to add your class to him.`}</p>
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
                  <tr className="cursor-pointer border-t hover:bg-slate-50" onClick={() => setOpen(isOpen ? null : u._id)}>
                    <td className="td text-slate-400">{isOpen ? <FaChevronDown /> : <FaChevronRight />}</td>
                    <td className="td">{u.name}</td>
                    {isSchool && <><td className="td">{u.teacherType || "-"}</td><td className="td">{u.className || "-"}</td><td className="td">{u.section || "-"}</td></>}
                    <td className="td">{(u.matchedSubject ?? u.subject) || "-"}{isSchool && all.length > 1 && <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">+{all.length - 1} more</span>}</td>
                    <td className="td"><PeriodCell period={u.matchedPeriod ?? u.period} schedule={schedule} /></td>
                    <td className="td">{u.phone}</td><td className="td">{u.email}</td>
                    <td className="td"><span className={`rounded px-2 py-1 text-xs capitalize ${badge[u.status]}`}>{u.status}</span></td>
                    <td className="td whitespace-nowrap" onClick={(e) => e.stopPropagation()}><AccountActions u={u} reload={load} onEdit={edit} /></td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50"><td colSpan={heads.length} className="p-3">
                      <AssignmentTable all={all} schedule={schedule}
                        empty={isSchool ? "No assignments yet. Use the edit icon to add them." : "No assignments for this teacher yet."} />
                      {!all.some((a) => a.period) && <p className="px-1 pt-2 text-xs text-amber-700">No period has been set for this teacher yet, so no time can be shown.</p>}
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
            {!rows.length && <tr><td colSpan={heads.length} className="td py-8 text-center text-slate-400">No teachers yet</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Period times come from <b>Set Timetable</b>{periodTime(schedule, 1) ? ` (period 1: ${periodTime(schedule, 1)})` : ""}. A period can be given to only one teacher of a class - a period that another teacher already has is shown as taken and cannot be selected.
      </p>
    </div>
  );
}
