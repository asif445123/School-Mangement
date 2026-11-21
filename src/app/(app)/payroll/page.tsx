"use client";
import { useEffect, useState } from "react";
import { FaCog, FaCreditCard, FaPrint } from "react-icons/fa";
import { useSession } from "@/components/session";
import { api, currentMonth, money } from "@/lib/api";
import { Swal, toast } from "@/lib/alerts";
import { printPayroll } from "@/lib/print";
import AdvanceDialog from "./advance-dialog";

const endpoint = "/api/payroll";
const post = (body: any) => api(endpoint, { method: "POST", body });
const fmt = (n: number) => n.toLocaleString();
const smallButton = "rounded border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50";
const adjustments = ["bonus", "overtime", "other"] as const;

export default function PayrollPage() {
  const { user } = useSession();
  const [month, setMonth] = useState(currentMonth);
  const [tab, setTab] = useState("Monthly Salary");
  if (user?.role !== "school") return <p>School admin access required.</p>;
  return <><nav aria-label="Payroll sections" className="mb-4 flex border-b border-slate-200">
    {["Monthly Salary", "Advance Salary"].map(t => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)} className={`rounded-t-lg px-4 py-2 text-sm font-semibold ${tab === t ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-200"}`}>{t}</button>)}
  </nav><PayrollSheet key={month} {...{ month, setMonth, tab }} school={{ name: user.schoolInfo?.name || user.schoolName || user.name, logo: user.logo }} /></>;
}

function PayrollSheet({ month, setMonth, tab, school }) {
  const [data, setData] = useState<any>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, select] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  function change(staff: string, values?: Record<string, string>) {
    setEdits(previous => {
      const next = { ...previous };
      if (values) next[staff] = values;
      else delete next[staff];
      return next;
    });
  }
  const unsaved = Object.keys(edits).length > 0;
  const url = `${endpoint}?month=${month}`;
  async function load() {
    const next = await api(url);
    setData(next);
    setEdits(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => next.rows.some(r => r.staff === id && !r.paidOn))));
    select([]);
  }
  useEffect(() => { load().catch(e => setError(e.message)); }, [url]);
  async function act(work: () => Promise<any>, message: string) {
    setBusy(true); setError("");
    try { await work(); await load(); toast("success", message); }
    catch (e) { setError(e.message); await load().catch(() => setData(null)); }
    finally { setBusy(false); }
  }
  const rows: any[] = data?.rows || [];
  const drafts = rows.filter(r => !r.paidOn && r.net >= 0);
  const chosen = drafts.filter(r => selected.includes(r.staff));
  async function pay() {
    const result = await Swal.fire({ title: "Mark selected salaries as paid?", text: `${chosen.length} salary payment(s) · ${money(chosen.reduce((n,r) => n+r.net,0))}. Paid rows cannot be edited.`, showCancelButton: true, confirmButtonText: "Pay selected" });
    if (result.isConfirmed) await act(async () => {
      for (const r of chosen) await post({ action: "pay", month, staff: r.staff, version: r.version });
    }, "Selected salaries marked as paid");
  }
  const print = (items, voucher = false) => printPayroll(items, month, school, voucher);
  return <fieldset disabled={busy} className="min-w-0 space-y-3">
    {error && <div role="alert" className="rounded bg-red-50 p-3 text-red-800">{error} <button className={smallButton} onClick={() => act(async () => {}, "Reloaded")}>Reload</button></div>}
    {tab === "Monthly Salary" ? <>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium text-slate-600">Month<input type="month" disabled={unsaved} value={month} className="input mt-1 block" onChange={e => e.target.value && setMonth(e.target.value)} /></label>
        <button className="btn" disabled={!data || unsaved} onClick={() => act(() => post({ action:"process", month }), "Salaries refreshed")}><FaCog/>Process / Refresh Salaries</button>
        <button className="btn bg-emerald-700 hover:bg-emerald-800" disabled={!chosen.length || unsaved} onClick={pay}><FaCreditCard/>Pay Selected</button>
        <button className="btn-light" disabled={!rows.length || unsaved} onClick={() => print(rows)}><FaPrint/>Pay Slips (All)</button>
      </div>
      <p className="text-sm text-slate-600">Total Net Payable: <strong>{money(rows.reduce((n,r) => n + r.net, 0))}</strong></p>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white"><table className="w-full whitespace-nowrap text-sm"><thead><tr className="bg-slate-50 text-left text-xs">
        <th className="p-2"><input aria-label="Select all draft salaries" type="checkbox" checked={drafts.length > 0 && chosen.length === drafts.length} onChange={e => select(e.target.checked ? drafts.map(r => r.staff) : [])}/></th>
        {["Staff", "Basic", "Allowances", "Bonus", "Overtime", "Att. Ded.", "Advance", "Other Ded.", "Net", "Status", ""].map(h => <th key={h} className="px-2 py-3">{h}</th>)}</tr></thead><tbody>
        {rows.map(r => <SalaryRow key={`${r.staff}-${r.version}`} row={r} edits={edits[r.staff]} change={values => change(r.staff, values)} selected={selected.includes(r.staff)} toggle={() => select(selected.includes(r.staff) ? selected.filter(id => id !== r.staff) : [...selected,r.staff])} print={print}
          save={values => act(async () => { await post({ action:"adjust", month, staff:r.staff, version:r.version, ...values }); change(r.staff); }, "Adjustments saved")} />)}
        {!rows.length && <tr><td colSpan={12} className="p-6 text-center text-slate-500">{!data ? error || "Loading payroll…" : data.staff.length ? "Process salaries to prepare this month’s payroll." : "Add active staff in Teachers &amp; time table to prepare payroll."}</td></tr>}
      </tbody></table></div>
      <p className="text-xs text-slate-500">Processing uses staff salaries, fixed allowances and attendance. Advance installments are recovered when you pay. Save any bonus, overtime or other deduction before payment.</p>
    </> : <><div className="flex items-center justify-between"><h2 className="font-bold">Advance Salary</h2><button className="btn" disabled={!data?.staff.length} onClick={() => setAdvanceOpen(true)}>+ New Advance</button></div>
      <div className="table-scroll"><table className="w-full bg-white"><thead><tr>{["Date","Staff","Amount","Monthly Installment","Recovered","Balance","Note"].map(h => <th key={h} className="th">{h}</th>)}</tr></thead><tbody>
        {data?.advances.map(a => <tr key={a._id} className="border-b">{[a.date,a.name,fmt(a.amount),fmt(a.installment),fmt(a.recovered),fmt(a.balance),a.note].map((v,i) => <td className={`td ${i === 5 ? "font-bold" : ""}`} key={i}>{v}</td>)}</tr>)}
        {!data?.advances.length && <tr><td colSpan={7} className="p-6 text-center text-slate-500">{!data ? error || "Loading advances…" : "No salary advances recorded."}</td></tr>}
      </tbody></table></div></>}
    {advanceOpen && data && <AdvanceDialog staff={data.staff} banks={data.banks} close={() => setAdvanceOpen(false)} onSave={async values => {
      await post({ action: "advance", ...values });
      toast("success", "Advance saved");
      await load().catch(e => setError(`Advance saved, but the list could not be refreshed: ${e.message}`));
    }}/>}
  </fieldset>;
}

function SalaryRow({ row:r, selected, toggle, save, print, edits, change }) {
  const edit = edits || r;
  const dirty = !!edits;
  function setValue(key: string, value: string) {
    const next = Object.fromEntries(adjustments.map(k => [k, k === key ? value : edit[k]]));
    change(adjustments.some(k => Number(next[k]) !== r[k]) ? next : undefined);
  }
  const input = (k: typeof adjustments[number]) => r.paidOn ? fmt(r[k]) : <input type="number" min="0" step="0.01" aria-label={`${k} for ${r.name}`} value={edit[k]} onChange={e => setValue(k,e.target.value)} className="w-20 rounded border border-slate-300 p-1.5"/>;
  return <tr className="border-t border-slate-200 [&>td]:px-2 [&>td]:py-2">
    <td><input type="checkbox" aria-label={`Select ${r.name}`} checked={selected} disabled={!!r.paidOn || r.net < 0} onChange={toggle}/></td>
    <td>{r.name}<small className="block text-slate-500">{r.designation}</small></td><td>{fmt(r.basic)}</td><td>{fmt(r.allowances)}</td><td>{input("bonus")}</td><td>{input("overtime")}</td>
    <td>{fmt(r.attendance)}<small className="block text-[10px] text-slate-500">A:{r.absent} L:{r.leave} Late:{r.late} Early:{r.early}</small></td><td>{fmt(r.advance)}</td><td>{input("other")}</td><td className="font-bold">{fmt(r.net)}</td>
    <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.paidOn ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{r.paidOn ? "Paid" : "Draft"}</span></td>
    <td className="space-x-1">{dirty && <><button className={smallButton} onClick={() => save({bonus:Number(edit.bonus), overtime:Number(edit.overtime), other:Number(edit.other)})}>Save</button><button className={smallButton} onClick={() => change(undefined)}>Cancel</button></>}<button className={smallButton} disabled={dirty} onClick={() => print([r])}>Slip</button>{r.paidOn && <button className={smallButton} onClick={() => print([r],true)}>Voucher</button>}</td>
  </tr>;
}
