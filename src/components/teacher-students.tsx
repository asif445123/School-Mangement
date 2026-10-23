"use client";
import { useCallback, useMemo, useState } from "react";
import { FaCertificate } from "react-icons/fa";
import CrudPage from "@/components/crud-page";
import ClassSectionFilter from "@/components/class-section-filter";
import { useSession } from "@/components/session";
import { leavingCertificate, loginBadge } from "@/lib/student-actions";
import { teacherStudentFields } from "@/lib/student-fields";
import { assignmentsOf, nz, splitList } from "@/lib/teacher-scope";
import { scopeClasses, studentScopes } from "@/lib/student-scope";

const byRoll = (a: any, b: any) => (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0) || String(a.name).localeCompare(String(b.name));

// Teacher portal Students page: he picks a class, then a section, and sees only
// the students he teaches. In the class he is class teacher of he can add and edit;
// in a class where he only teaches a subject the list is read-only.
export default function TeacherStudents() {
  const { user } = useSession();
  const scopes = useMemo(() => studentScopes(user), [user]);
  const [rows, setRows] = useState<any[]>([]);
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const onLoaded = useCallback((items: any[]) => setRows(items), []);

  // his assigned classes are always offered, even before a single student is added to them
  const classList = useMemo(() => {
    const out = scopeClasses(user);
    for (const r of rows) if (!out.some((c) => nz(c) === nz(r.className))) out.push(r.className);
    return out.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }, [user, rows]);

  // open on his own class (the one he is class teacher of) the first time
  const ownClass = classList.find((c) => scopes.some((s) => s.own && nz(s.className) === nz(c))) || classList[0] || "";
  const current = classList.find((c) => nz(c) === nz(className)) || ownClass;

  const classRows = useMemo(() => rows.filter((r) => nz(r.className) === nz(current)), [rows, current]);
  const sections = useMemo(() => [...new Set(classRows.map((r) => String(r.section || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [classRows]);
  const chosen = sections.find((s) => nz(s) === nz(section)) || ""; // "" = every section of the class

  const shown = useMemo(() => classRows.filter((r) => !chosen || nz(r.section) === nz(chosen)).sort(byRoll), [classRows, chosen]);

  // what he teaches in the selected class
  const subjects = useMemo(() => [...new Set(assignmentsOf(user)
    .filter((a) => splitList(a.className).some((c) => nz(c) === nz(current)))
    .flatMap((a) => splitList(a.subject)))], [user, current]);

  // a new student goes into the class + section he is class teacher of
  const ownScopes = scopes.filter((s) => s.own && nz(s.className) === nz(current));
  const addTarget = (() => {
    if (!ownScopes.length) return null;
    if (!chosen) { const s = ownScopes.find((x) => !x.section) || ownScopes[0]; return { className: s.className, section: s.section }; }
    const ok = ownScopes.find((s) => !s.section || nz(s.section) === nz(chosen));
    return ok ? { className: ok.className, section: chosen } : null;
  })();
  const classTeacherHere = !!addTarget;
  const where = `Class ${current}${chosen ? ` ${chosen}` : ""}`;

  const columns = [
    { key: "rollNo", label: "Roll #" },
    { key: "name", label: "Name" },
    { key: "fatherName", label: "Father" },
    { key: "gender", label: "Gender", render: (r: any) => r.gender || "-" },
    { key: "section", label: "Section", render: (r: any) => r.section || "-" },
    { key: "phone", label: "Phone", render: (r: any) => r.phone || "-" },
    { key: "leftDate", label: "Left on", render: (r: any) => r.leftDate ? <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">{r.leftDate}</span> : "-" },
    { key: "loginEmail", label: "Student login", render: (r: any) => r.loginEmail ? <span>{r.loginEmail} <span className={`ml-1 rounded px-2 py-0.5 text-xs capitalize ${loginBadge[r.loginStatus]}`}>{r.loginStatus}</span></span> : "-" },
  ];
  const fields = teacherStudentFields;

  if (!classList.length) return (
    <div className="card p-8 text-center text-slate-500">
      <h1 className="mb-2 text-xl font-bold text-slate-700">Students</h1>
      No class has been assigned to you yet. Ask your school admin to set your class and subject.
    </div>
  );

  return (
    <div className="space-y-3">
      <CrudPage resource="students" title="Student"
        toolbar={<ClassSectionFilter classes={classList} sections={sections} className={current} section={chosen}
          onClass={(v) => { setClassName(v); setSection(""); }} onSection={setSection} allClasses="Select class" />}
        onLoaded={onLoaded}
        filterRows={() => shown}
        columns={columns}
        fields={fields}
        defaults={{ gender: "Male" }}
        extra={addTarget || {}}
        canAdd={!!addTarget}
        canEdit={(r) => !!r.own}
        actions={(r) => (r.own
          ? <button className="icon-btn text-purple-600" title="School leaving certificate" onClick={() => leavingCertificate(r, user)}><FaCertificate /></button>
          : null)} />
      <p className="px-1 text-xs text-slate-500">
        {classTeacherHere && chosen && <>You are the class teacher of <b>{where}</b> - you can add and edit these students.</>}
        {classTeacherHere && !chosen && <>You are the class teacher of <b>Class {current}</b>{ownScopes[0]?.section ? ` ${ownScopes[0].section}` : ""} - you can add students there and edit them. Students of another section are read-only.</>}
        {!classTeacherHere && <>You teach <b>{subjects.join(", ") || "a subject"}</b> in <b>{where}</b> - this list is read-only.</>}
        {" "}Students of other classes are never shown.
      </p>
    </div>
  );
}
