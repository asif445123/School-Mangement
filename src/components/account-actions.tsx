"use client";
import { FaCheck, FaKey, FaPen, FaTimes, FaTrash } from "react-icons/fa";
import { api } from "@/lib/api";
import { confirmDelete, formDialog, toast } from "@/lib/alerts";

export const badge: any = { approved: "bg-green-100 text-green-700", pending: "bg-amber-100 text-amber-700", rejected: "bg-red-100 text-red-700" };

// Icon buttons shared by the Teachers, Student Logins and School Approvals pages
export default function AccountActions({ u, reload, onEdit }: { u: any; reload: () => void; onEdit?: (u: any) => void }) {
  const run = async (fn: () => Promise<any>, done: string) => {
    try { await fn(); toast("success", done); reload(); } catch (e: any) { toast("error", e.message); }
  };
  async function resetPassword() {
    const v = await formDialog(`New password for ${u.name}`, [{ name: "password", label: "New password (6+ chars)", type: "password", required: true }]);
    if (v) run(() => api(`/api/users/${u._id}`, { method: "PATCH", body: { password: v.password } }), "Password updated");
  }
  async function remove() {
    if (await confirmDelete(u.role === "school" ? `Delete ${u.schoolName} and ALL its data?` : `Delete ${u.name}?`))
      run(() => api(`/api/users/${u._id}`, { method: "DELETE" }), "Deleted");
  }
  return (
    <>
      {onEdit && <button className="icon-btn text-blue-600" title="Edit" onClick={() => onEdit(u)}><FaPen /></button>}
      <button className="icon-btn text-slate-600" title="Set new password" onClick={resetPassword}><FaKey /></button>
      <button className="icon-btn text-green-600" title="Approve" onClick={() => run(() => api(`/api/users/${u._id}`, { method: "PATCH", body: { status: "approved" } }), "Account approved")}><FaCheck /></button>
      <button className="icon-btn text-amber-600" title="Reject / disable" onClick={() => run(() => api(`/api/users/${u._id}`, { method: "PATCH", body: { status: "rejected" } }), "Account rejected")}><FaTimes /></button>
      <button className="icon-btn text-red-600" title="Delete" onClick={remove}><FaTrash /></button>
    </>
  );
}
