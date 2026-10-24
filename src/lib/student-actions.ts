import { api, today } from "./api";
import { formDialog, toast } from "./alerts";
import { printCertificate } from "./print";

export const loginBadge: Record<string, string> = { approved: "bg-green-100 text-green-700", pending: "bg-amber-100 text-amber-700", rejected: "bg-red-100 text-red-700" };

// Approve / disable the login the school (or the class teacher) created for a
// student. A guardian login is shared by all his / her children, so say so.
export async function setStudentLogin(r: any, status: string, reload: () => void) {
  const shared = (r.loginChildCount || 0) > 1 ? ` (guardian login of ${r.loginChildCount} children)` : "";
  try { await api(`/api/users/${r.loginUserId}`, { method: "PATCH", body: { status } }); toast("success", `Login ${status}${shared}`); reload(); }
  catch (e: any) { toast("error", e.message); }
}

// School leaving certificate, printed from the student's record
export async function leavingCertificate(r: any, user: any) {
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
  if (v) printCertificate(r, v, user?.schoolInfo);
}
