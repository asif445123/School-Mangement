"use client";
import { useCallback, useEffect, useState } from "react";
import { FaDownload, FaMoneyBillWave, FaPen, FaPlus, FaPrint, FaTrash, FaWhatsapp } from "react-icons/fa";
import { api, currentMonth, money, today } from "@/lib/api";
import { confirmDelete, formDialog, toast } from "@/lib/alerts";
import { printChalan } from "@/lib/print";
import { useSession } from "@/components/session";
import ChalanDialog from "@/components/chalan-dialog";
import WhatsAppChalanDialog from "@/components/whatsapp-chalan-dialog";
import WhatsAppStatus from "@/components/whatsapp-status";

const badge: any = { paid: "bg-green-100 text-green-700", partial: "bg-amber-100 text-amber-700", unpaid: "bg-red-100 text-red-700" };
const head = ["Chalan #", "Student", "Class", "Monthly / discount", "Admission fee", "Annual charges", "Voucher total", "Previous pending", "Total payable", "Received", "Balance", "Status", "WhatsApp", "Last payment", "Actions"];
export default function FeesPage() {
  const { user } = useSession();
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<any[]>([]), [students, setStudents] = useState<any[]>([]), [accounts, setAccounts] = useState<any[]>([]);
  const [configured, setConfigured] = useState(false), [countryCode, setCountryCode] = useState("92"), [loading, setLoading] = useState(true), [generating, setGenerating] = useState(false);
  const [editor, setEditor] = useState<any>(null), [sending, setSending] = useState<any>(null), [q, setQ] = useState("");
  const load = useCallback(async () => { setLoading(true); try { const d = await api(`/api/fees?month=${encodeURIComponent(month)}`); setRows(d.items); return d.items as any[]; } catch (e: any) { toast("error", e.message); return []; } finally { setLoading(false); } }, [month]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { Promise.all([api("/api/students"), api("/api/payment-accounts"), api("/api/settings/whatsapp")]).then(([s, a, w]) => { setStudents(s.items); setAccounts(a.items.filter((x: any) => x.active)); setConfigured(w.settings.enabled && w.settings.hasAccessToken); setCountryCode(w.settings.countryCallingCode || "92"); }).catch((e) => toast("error", e.message)); }, []);
  useEffect(() => { const refresh = () => api("/api/payment-accounts").then((d) => setAccounts(d.items.filter((a: any) => a.active))).catch((e) => toast("error", e.message)); window.addEventListener("payment-accounts-changed", refresh); return () => window.removeEventListener("payment-accounts-changed", refresh); }, []);
  async function generate() { setGenerating(true); try { const d = await api("/api/fees/generate", { method: "POST", body: { month } }); toast("success", `${d.created} chalan(s) created. Add admission / annual charges with Edit where needed.`); await load(); } catch (e: any) { toast("error", e.message); } finally { setGenerating(false); } }
  async function receive(f: any) {
    const prev = f.previous || 0, balance = prev + f.amount - f.paid;
    if (balance <= 0) return toast("info", "Already fully paid");
    const v = await formDialog(`Receive fee - ${f.student?.name} (Balance ${money(balance)})`, [
      { name: "amount", label: "Amount received (Rs)", type: "number", required: true, hint: `Previous pending ${money(prev)} + this voucher ${money(f.amount - f.paid)}. Older pending chalans are cleared first.` },
      { name: "date", label: "Receiving date", type: "date", required: true },
      { name: "receivedBy", label: "Received by", required: true },
      { name: "narration", label: "Narration (optional)", type: "textarea" },
    ], { amount: balance, date: today(), receivedBy: user.name });
    if (!v) return;
    if (!(v.amount > 0) || v.amount > balance) return toast("error", `Amount must be between 1 and ${balance}`);
    try { await api("/api/fees/receive", { method: "POST", body: { fee: f._id, ...v } }); toast("success", "Fee received"); load(); } catch (e: any) { toast("error", e.message); }
  }
  async function remove(f: any) { if (!(await confirmDelete())) return; try { await api(`/api/fees/${f._id}`, { method: "DELETE" }); toast("success", "Deleted"); load(); } catch (e: any) { toast("error", e.message); } }
  const shown = rows.filter((f) => `${f.chalanNo} ${f.student?.name} ${f.student?.className} ${f.student?.rollNo}`.toLowerCase().includes(q.toLowerCase()));
  const updateRow = (item: any) => setRows((old) => old.map((f) => f._id === item._id ? { ...f, ...item, student: f.student } : f));
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">Fee Chalan & Receiving</h1><p className="mt-1 text-sm text-slate-500">Create, print and share fee vouchers with families.</p></div><div className="flex flex-wrap gap-2"><input aria-label="Chalan month" type="month" className="input w-full sm:w-44" value={month} onChange={(e) => setMonth(e.target.value)} /><button className="btn-light" disabled={generating || !month} onClick={generate}>{generating ? "Generating…" : "Generate monthly chalans"}</button><button className="btn" onClick={() => setEditor({})} disabled={!students.length}><FaPlus />Create chalan</button></div></div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-100 bg-green-50 p-3 text-sm text-green-900"><span>Send the voucher image once or as many times as needed. Each voucher keeps its own send count and status.</span><button className="shrink-0 font-semibold underline" onClick={async () => { try { const w = await api("/api/settings/whatsapp"); setConfigured(w.settings.enabled && w.settings.hasAccessToken); if (!w.settings.enabled) { window.location.href = "/whatsapp-settings"; } else toast("success", "WhatsApp is connected"); } catch (e: any) { toast("error", e.message); } }}>WhatsApp settings</button></div>
    <input className="input sm:max-w-sm" placeholder="Search student, class, roll or chalan…" value={q} onChange={(e) => setQ(e.target.value)} />
    <div className="card overflow-x-auto p-0"><table className="w-full min-w-[1900px]"><thead><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead><tbody>
      {shown.map((f) => { const prev = f.previous || 0, balance = Math.max(0, prev + f.amount - f.paid), total = prev + f.amount; const st = balance <= 0 ? "paid" : f.paid > 0 || balance < total ? "partial" : "unpaid"; const last = (f.payments || []).at(-1); return <tr key={f._id} className="border-t hover:bg-slate-50/60">
        <td className="td whitespace-nowrap">{f.chalanNo}</td><td className="td min-w-36 font-medium">{f.student?.name}</td><td className="td">{f.student?.className}{f.student?.section ? ` ${f.student.section}` : ""}</td><td className="td whitespace-nowrap">{money(f.actualFee)}<span className="block text-xs text-slate-500">Discount {money(f.discount)}</span></td><td className="td">{money(f.admissionFee)}</td><td className="td">{money(f.annualCharges)}</td><td className="td font-semibold">{money(f.amount)}</td><td className="td">{money(prev)}</td><td className="td">{money(total)}</td><td className="td">{money(f.paid)}</td><td className="td font-semibold">{money(balance)}</td><td className="td"><span className={`whitespace-nowrap rounded px-2 py-1 text-xs ${badge[st]}`}>{({ paid: "Received", partial: "Part received", unpaid: "Pending" } as any)[st]}</span></td><td className="td"><WhatsAppStatus fee={f} /></td><td className="td min-w-40 text-xs">{last ? <>{last.date}<br />{last.receivedBy}<br />{last.narration}</> : "—"}</td>
        <td className="td whitespace-nowrap"><button className="icon-btn text-green-700" title="Preview / send WhatsApp image" aria-label={`WhatsApp ${f.student?.name}`} onClick={() => setSending(f)}><FaWhatsapp /></button><button className="icon-btn text-blue-600" title="Edit admission fee, annual charges and fees" onClick={() => setEditor(f)}><FaPen /></button><button className="icon-btn text-green-600" title="Receive fee" onClick={() => receive(f)}><FaMoneyBillWave /></button><button className="icon-btn text-slate-600" title="Print chalan" onClick={() => printChalan(f, user.schoolInfo, accounts)}><FaPrint /></button><a className="icon-btn text-slate-600" title="Download chalan image" href={`/api/fees/${f._id}/image?download=1`}><FaDownload /></a><button className="icon-btn text-red-600" title="Delete" onClick={() => remove(f)}><FaTrash /></button></td>
      </tr>; })}
      {!shown.length && <tr><td colSpan={head.length} className="td py-8 text-center text-slate-400">{loading ? "Loading chalans…" : "No chalans found. Create one student voucher or generate monthly chalans."}</td></tr>}
    </tbody></table></div>
    {editor && <ChalanDialog fee={editor._id ? editor : undefined} students={students} month={month} onClose={() => setEditor(null)} onSaved={async (item, created) => { setEditor(null); const fresh = await load(); const row = fresh.find((f) => f._id === item._id) || { ...item, student: students.find((s) => s._id === item.student) }; if (created) setSending(row); }} />}
    {sending && <WhatsAppChalanDialog fee={sending} configured={configured} countryCode={countryCode} onClose={() => setSending(null)} onChanged={updateRow} />}
  </div>;
}
