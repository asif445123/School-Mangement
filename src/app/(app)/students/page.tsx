"use client";
import { FaCertificate, FaCheck, FaTimes } from "react-icons/fa";
import CrudPage from "@/components/crud-page";
import { api, money, today } from "@/lib/api";
import { formDialog, toast } from "@/lib/alerts";
import { printCertificate } from "@/lib/print";
import { studentFields } from "@/lib/student-fields";
import { useSession } from "@/components/session";

const badge: any = { approved: "bg-green-100 text-green-700", pending: "bg-amber-100 text-amber-700", rejected: "bg-red-100 text-red-700" };

export default function StudentsPage() {
  const { user } = useSession();
  async function setLogin(r: any, status: string, reload: () => void) {
    try { await api(`/api/users/${r.loginUserId}`, { method: "PATCH", body: { status } }); toast("success", `Login ${status}`); reload(); }
    catch (e: any) { toast("error", e.message); }
  }
  async function certificate(r: any) {
    const v = await formDialog(`Leaving certificate - ${r.name}`, [
      { name: "regNo", label: "Reg. No." },
      { name: "dob", label: "Date of birth", type: "date" },
      { name: "admissionDate", label: "Date of admission", type: "date" },
      { name: "leavingDate", label: "Date of leaving", type: "date", required: true },
      { name: "attendFrom", label: "Attendance of year - from", type: "date" },
      { name: "attendTo", label: "Attendance of year - to", type: "date" },
      { name: "result", label: "Result", type: "select", options: ["Passed", "Failed"] },
      { name: "duesPaid", label: "Dues of school", type: "select", options: ["Paid all dues", "Dues pending"] },
      { name: "issueDate", label: "Date of issue", type: "date", required: true },
    ], { regNo: r.rollNo, dob: r.dob, admissionDate: r.admissionDate, leavingDate: r.leftDate || today(), result: "Passed", duesPaid: "Paid all dues", issueDate: today() });
    if (v) printCertificate(r, v, user.schoolInfo);
  }
  const isSchool = user.role === "school";
  const feeKeys = ["monthlyFee", "discount", "previousPending"];
  return (
    <CrudPage resource="students" title="Student"
      columns={[
        { key: "rollNo", label: "Roll #" }, { key: "name", label: "Name" }, { key: "fatherName", label: "Father" }, { key: "gender", label: "Gender", render: (r) => r.gender || "-" }, { key: "className", label: "Class" }, { key: "phone", label: "Phone" },
        ...(isSchool ? [{ key: "net", label: "Monthly fee", render: (r: any) => <b>{money((r.monthlyFee || 0) - (r.discount || 0))}</b> }, { key: "previousPending", label: "Previous pending", render: (r: any) => money(r.previousPending) }] : []),
        { key: "leftDate", label: "Left on", render: (r) => r.leftDate ? <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">{r.leftDate}</span> : "-" },
        { key: "loginEmail", label: "Student login", render: (r) => r.loginEmail ? <span>{r.loginEmail} <span className={`ml-1 rounded px-2 py-0.5 text-xs capitalize ${badge[r.loginStatus]}`}>{r.loginStatus}</span></span> : "-" },
      ]}
      fields={isSchool ? studentFields : studentFields.filter((f) => !feeKeys.includes(f.name))} defaults={{ gender: "Male", monthlyFee: 0, discount: 0, previousPending: 0 }}
      actions={user.role === "school" ? (r, reload) => (<>
        <button className="icon-btn text-purple-600" title="School leaving certificate" onClick={() => certificate(r)}><FaCertificate /></button>
        {r.loginUserId && <>
          <button className="icon-btn text-green-600" title="Enable login" onClick={() => setLogin(r, "approved", reload)}><FaCheck /></button>
          <button className="icon-btn text-amber-600" title="Disable login" onClick={() => setLogin(r, "rejected", reload)}><FaTimes /></button>
        </>}
      </>) : undefined} />
  );
}
