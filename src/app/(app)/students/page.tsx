"use client";
import { useMemo, useState } from "react";
import { FaCertificate, FaCheck, FaTimes } from "react-icons/fa";
import CrudPage from "@/components/crud-page";
import ClassSectionFilter from "@/components/class-section-filter";
import TeacherStudents from "@/components/teacher-students";
import { money } from "@/lib/api";
import { setStudentLogin, leavingCertificate } from "@/lib/student-actions";
import StudentLoginCell from "@/components/student-login-cell";
import { studentFields } from "@/lib/student-fields";
import { nz } from "@/lib/teacher-scope";
import { useSession } from "@/components/session";

// School admin: every student of the school. Teacher: only the classes he teaches (see TeacherStudents).
export default function StudentsPage() {
  const { user } = useSession();
  const [rows, setRows] = useState<any[]>([]);
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const isSchool = user.role === "school";

  const classList = useMemo(() => {
    const out: string[] = [];
    for (const r of rows) if (!out.some((c) => nz(c) === nz(r.className))) out.push(r.className);
    return out.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }, [rows]);
  const classRows = useMemo(() => rows.filter((r) => !className || nz(r.className) === nz(className)), [rows, className]);
  const sections = useMemo(() => [...new Set(classRows.map((r) => String(r.section || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [classRows]);
  const chosen = sections.find((s) => nz(s) === nz(section)) || "";

  if (!isSchool) return <TeacherStudents />;

  return (
    <CrudPage resource="students" title="Student"
      onLoaded={setRows}
      toolbar={<ClassSectionFilter classes={classList} sections={sections} className={className} section={chosen}
        onClass={(v) => { setClassName(v); setSection(""); }} onSection={setSection} />}
      filterRows={() => classRows.filter((r) => !chosen || nz(r.section) === nz(chosen))}
      columns={[
        { key: "rollNo", label: "Roll #" }, { key: "name", label: "Name" }, { key: "fatherName", label: "Father" }, { key: "gender", label: "Gender", render: (r) => r.gender || "-" },
        { key: "className", label: "Class" }, { key: "section", label: "Section", render: (r) => r.section || "-" }, { key: "phone", label: "Phone" },
        { key: "net", label: "Monthly fee", render: (r: any) => <b>{money((r.monthlyFee || 0) - (r.discount || 0))}</b> },
        { key: "previousPending", label: "Previous pending", render: (r: any) => money(r.previousPending) },
        { key: "leftDate", label: "Left on", render: (r) => r.leftDate ? <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">{r.leftDate}</span> : "-" },
        { key: "loginEmail", label: "Student / guardian login", render: (r) => <StudentLoginCell r={r} /> },
      ]}
      fields={studentFields} defaults={{ gender: "Male", monthlyFee: 0, discount: 0, previousPending: 0 }}
      actions={(r, reload) => (<>
        <button className="icon-btn text-purple-600" title="School leaving certificate" onClick={() => leavingCertificate(r, user)}><FaCertificate /></button>
        {r.loginUserId && <>
          <button className="icon-btn text-green-600" title={(r.loginChildCount || 0) > 1 ? `Enable guardian login (all ${r.loginChildCount} children)` : "Enable login"} onClick={() => setStudentLogin(r, "approved", reload)}><FaCheck /></button>
          <button className="icon-btn text-amber-600" title={(r.loginChildCount || 0) > 1 ? `Disable guardian login (all ${r.loginChildCount} children)` : "Disable login"} onClick={() => setStudentLogin(r, "rejected", reload)}><FaTimes /></button>
        </>}
      </>)} />
  );
}
