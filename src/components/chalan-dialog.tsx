"use client";
import { useState } from "react";
import Modal from "./modal";
import { api, money } from "@/lib/api";
import { feeValues } from "@/lib/fee-calculation";
import { toast } from "@/lib/alerts";
export default function ChalanDialog({ fee, students, month, onClose, onSaved }: { fee?: any; students: any[]; month: string; onClose: () => void; onSaved: (item: any, created: boolean) => void }) {
  const [studentId, setStudentId] = useState(fee?.student?._id || students[0]?._id || "");
  const [values, setValues] = useState<any>({ month: fee?.month || month, actualFee: fee?.actualFee ?? students[0]?.monthlyFee ?? 0, discount: fee?.discount ?? students[0]?.discount ?? 0, admissionFee: fee?.admissionFee || 0, annualCharges: fee?.annualCharges || 0 });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  let totals: any = null; try { totals = feeValues(values); } catch {}
  function choose(id: string) { setStudentId(id); const student = students.find((s) => s._id === id); if (student) setValues((v: any) => ({ ...v, actualFee: student.monthlyFee || 0, discount: student.discount || 0 })); }
  async function save(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(""); try { const d = await api(fee ? `/api/fees/${fee._id}` : "/api/fees", { method: fee ? "PUT" : "POST", body: { ...values, student: studentId } }); toast("success", fee ? "Voucher updated. Send the new image if you already shared it." : "Chalan created"); onSaved(d.item, !fee); } catch (e: any) { setError(e.message); } finally { setBusy(false); } }
  const field = (key: string, label: string) => <label className="block text-sm font-medium">{label}<input className="input mt-1" type="number" min="0" max="100000000" step="0.01" required value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} /></label>;
  return <Modal title={fee ? `Edit chalan · ${fee.chalanNo}` : "Create student fee chalan"} onClose={() => { if (!busy) onClose(); }}>
    <form onSubmit={save} className="space-y-4">
      <label className="block text-sm font-medium">Student<select className="input mt-1" value={studentId} onChange={(e) => choose(e.target.value)} disabled={!!fee} required><option value="" disabled>Select student</option>{students.map((s) => <option key={s._id} value={s._id}>{s.name} · Class {s.className}{s.section ? ` ${s.section}` : ""} · Roll {s.rollNo || "—"}</option>)}</select></label>
      <label className="block text-sm font-medium">Chalan month<input className="input mt-1" type="month" value={values.month} onChange={(e) => setValues({ ...values, month: e.target.value })} disabled={!!fee} required /></label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{field("actualFee", "Monthly fee (Rs)")}{field("discount", "Discount (Rs)")}{field("admissionFee", "Admission fee (Rs)")}{field("annualCharges", "Annual charges (Rs)")}</div>
      <p className="text-xs text-slate-500">Admission and annual charges apply only to this voucher. Bulk generation leaves them at zero so annual charges are not repeated every month.</p>
      <div className="flex items-center justify-between rounded-lg bg-blue-50 p-4"><span className="text-sm font-medium">This voucher total</span><b className="text-xl text-blue-800">{totals ? money(totals.amount) : "Check amounts"}</b></div>
      {fee?.whatsapp?.sentCount > 0 && <p className="text-xs text-amber-700">Changing charges marks the previous WhatsApp image as outdated. Send the updated image after saving.</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className="btn-light" onClick={onClose} disabled={busy}>Cancel</button><button className="btn" disabled={busy || !totals}>{busy ? "Saving…" : fee ? "Save changes" : "Create & preview WhatsApp image"}</button></div>
    </form>
  </Modal>;
}
