"use client";
import { useCallback, useEffect, useState } from "react";
import { FaPen, FaPlus, FaTrash, FaUniversity } from "react-icons/fa";
import { api } from "@/lib/api";
import { confirmDelete, toast } from "@/lib/alerts";
import { accountTypeLabel } from "@/lib/payment-accounts";
import { editPaymentAccount } from "@/components/payment-account-dialog";
export default function PaymentAccountsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); api("/api/payment-accounts").then((d) => setRows(d.items)).catch((e) => toast("error", e.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  async function remove(row: any) { if (await confirmDelete("This account will no longer appear on fee vouchers. Existing accounting entries are not affected.")) { try { await api(`/api/payment-accounts/${row._id}`, { method: "DELETE" }); load(); } catch (e: any) { toast("error", e.message); } } }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">School payment accounts</h1><p className="mt-1 text-sm text-slate-500">Bank, JazzCash, Easypaisa and Raast details printed on every fee chalan image and voucher.</p></div><button className="btn" onClick={async () => { if (await editPaymentAccount()) load(); }}><FaPlus /> Add account</button></div>
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">These are payment destinations, not accounting ledger accounts. Only active accounts are shown to families. Ask families to verify the account title before paying.</div>
    {loading ? <p className="text-slate-500">Loading accounts…</p> : !rows.length ? <div className="card py-12 text-center text-slate-500"><FaUniversity className="mx-auto mb-3 text-3xl" /><p>No payment accounts yet.</p><button className="btn mt-4" onClick={async () => { if (await editPaymentAccount()) load(); }}>Add your first account</button></div> : <div className="grid gap-4 md:grid-cols-2">{rows.map((row) => <div key={row._id} className="card space-y-2"><div className="flex items-center justify-between gap-2"><h2 className="font-semibold">{accountTypeLabel(row.type)}</h2><span className={`rounded-full px-2 py-1 text-xs ${row.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{row.active ? "Shown on voucher" : "Hidden"}</span></div><p className="text-lg font-bold">{row.title}</p><p className="break-all font-mono">{row.accountNumber}</p>{row.bankName && <p className="text-sm">{row.bankName}</p>}{row.iban && <p className="break-all text-xs text-slate-500">IBAN: {row.iban}</p>}{row.branch && <p className="text-xs text-slate-500">Branch: {row.branch}</p>}{row.instructions && <p className="text-sm text-slate-500">{row.instructions}</p>}<div className="flex justify-end border-t pt-2"><button className="icon-btn text-blue-600" aria-label={`Edit ${row.title}`} onClick={async () => { if (await editPaymentAccount(row)) load(); }}><FaPen /></button><button className="icon-btn text-red-600" aria-label={`Delete ${row.title}`} onClick={() => remove(row)}><FaTrash /></button></div></div>)}</div>}
  </div>;
}
