"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { today } from "@/lib/api";

type Props = {
  staff: { _id: string; name: string }[];
  banks: { _id: string; title: string; bankName: string }[];
  onSave: (values: Record<string, unknown>) => Promise<void>;
  close: () => void;
};

export default function AdvanceDialog({ staff, banks, onSave, close }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setSaving(true);
    setError("");
    try { await onSave({ ...values, amount: Number(amount), installment: Number(values.installment) }); close(); }
    catch (e) { setError(e.message); setSaving(false); }
  }
  return <dialog ref={dialog} aria-labelledby="advance-title" onCancel={e => { e.preventDefault(); if (!saving) close(); }}
    className="m-auto max-h-[90vh] w-[min(760px,95vw)] rounded-xl bg-white p-0 shadow-xl backdrop:bg-slate-900/50">
    <header className="flex items-center justify-between border-b px-4 py-3"><h2 id="advance-title" className="font-bold">Advance Salary</h2>
      <button type="button" aria-label="Close advance form" disabled={saving} onClick={close} className="px-2 text-xl">×</button></header>
    <form onSubmit={submit}><fieldset disabled={saving} className="grid gap-3 p-4 text-sm font-medium text-slate-600 sm:grid-cols-3">
      <label>Staff *<select className="input mt-1" name="staff" required defaultValue=""><option value="">Select staff</option>{staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></label>
      <label>Date<input className="input mt-1" type="date" name="date" required defaultValue={today()}/></label>
      <label>Amount *<input className="input mt-1" type="number" min="0.01" step="0.01" max="10000000000" required value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <label>Monthly installment (recovery)<input className="input mt-1" name="installment" type="number" min="0.01" max={amount || undefined} step="0.01" required /></label>
      <label>Mode<select className="input mt-1" name="mode" value={mode} onChange={e => setMode(e.target.value)}><option>Cash</option><option>Bank</option></select></label>
      <label>Bank account<select className="input mt-1 disabled:bg-slate-50" key={mode} name="bank" required={mode === "Bank"} disabled={mode !== "Bank"} defaultValue="">
        <option value="">{mode === "Cash" ? "Not applicable" : "Select bank account"}</option>{banks.map(b => <option key={b._id} value={b._id}>{b.bankName} — {b.title}</option>)}</select></label>
      <label className="sm:col-span-2">Note<input className="input mt-1" name="note" maxLength={300}/></label>
      {mode === "Bank" && !banks.length && <p className="text-amber-800 sm:col-span-3">Add an active bank account in Payment accounts, or select Cash.</p>}
      {error && <p role="alert" className="text-red-700 sm:col-span-3">{error}</p>}
    </fieldset><footer className="flex justify-end gap-2 border-t p-3"><button disabled={saving} className="btn">{saving ? "Saving…" : "Save"}</button>
      <button type="button" disabled={saving} className="btn-light" onClick={close}>Close</button></footer></form>
  </dialog>;
}
