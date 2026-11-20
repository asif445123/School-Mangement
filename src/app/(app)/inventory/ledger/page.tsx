"use client";
import { useEffect, useMemo, useState } from "react";
import { FaPrint, FaTrash } from "react-icons/fa";
import { api, money, today } from "@/lib/api";
import { confirmDelete, formDialog, toast } from "@/lib/alerts";
import { PAYMENT_MODES, supplierLedger } from "@/lib/inventory-calc";
import { useInventory } from "@/lib/inventory-data";
import { printSupplierLedger } from "@/lib/print";
import { useSession } from "@/components/session";

// Supplier Ledger: opening payable + purchases - payments of one supplier,
// with the "Payment to Supplier" action.
export default function SupplierLedgerPage() {
  const { user } = useSession();
  const { suppliers, invoices, payments, accounts, loading, reload } = useInventory();
  const [supplierId, setSupplierId] = useState("");
  const [shown, setShown] = useState("");

  useEffect(() => { if (!supplierId && suppliers.length) setSupplierId(suppliers[0]._id); }, [suppliers, supplierId]); // eslint-disable-line

  const supplier = suppliers.find((s) => s._id === (shown || supplierId));
  const ledger = useMemo(() => (supplier ? supplierLedger(supplier, invoices, payments) : null), [supplier, invoices, payments]);

  async function pay() {
    if (!supplierId) return toast("info", "Select a supplier first");
    const bankAccounts = accounts.filter((a) => !/receivable|payable/i.test(a.accountType?.name || ""));
    const v = await formDialog("Supplier Payment", [
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "date", label: "Date", type: "date" },
      { name: "mode", label: "Mode", type: "select", options: PAYMENT_MODES },
      { name: "account", label: "Bank", type: "select", choices: [{ value: "", label: "No account (cash)" }, ...bankAccounts.map((a) => ({ value: a._id, label: `${a.code} - ${a.name}` }))] },
      { name: "note", label: "Note" },
    ], { date: today(), mode: "Cash", account: bankAccounts[0]?._id || "" });
    if (!v) return;
    try {
      await api("/api/inventory/supplier-payments", { method: "POST", body: { ...v, supplier: supplierId } });
      toast("success", "Payment saved"); reload();
    } catch (e: any) { toast("error", e.message); }
  }

  async function removePayment(p: any) {
    if (!(await confirmDelete("This payment will be deleted and its expense entry reversed."))) return;
    try { await api(`/api/inventory/supplier-payments/${p._id}`, { method: "DELETE" }); toast("success", "Deleted"); reload(); }
    catch (e: any) { toast("error", e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1 sm:max-w-xs">
          <label className="text-sm text-slate-600">Supplier</label>
          <select className="input mt-1" value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setShown(e.target.value); }}>
            {!suppliers.length && <option value="">No suppliers yet</option>}
            {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <button className="btn" onClick={() => setShown(supplierId)}>Show</button>
        <button className="btn-light" disabled={!ledger} onClick={() => printSupplierLedger(supplier, ledger, user?.schoolInfo)}><FaPrint /> Print</button>
        <button className="btn !bg-emerald-700 hover:!bg-emerald-800" onClick={pay}>+ Payment to Supplier</button>
      </div>

      {!loading && !suppliers.length && <div className="card text-center text-slate-500">Add a supplier first from the Suppliers tab.</div>}

      {ledger && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card"><p className="text-xs uppercase text-slate-500">Purchases (credit)</p><p className="text-lg font-bold">{money(ledger.credited)}</p></div>
            <div className="card"><p className="text-xs uppercase text-slate-500">Payments (debit)</p><p className="text-lg font-bold">{money(ledger.debited)}</p></div>
            <div className="card"><p className="text-xs uppercase text-slate-500">Closing payable</p><p className={`text-lg font-bold ${ledger.balance > 0 ? "text-red-600" : "text-emerald-700"}`}>{money(ledger.balance)}</p></div>
          </div>
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[680px]">
              <thead><tr>{["Date", "Description", "Purchase (Cr)", "Payment (Dr)", "Balance payable", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>
                {ledger.rows.map((r, i) => (
                  <tr key={i} className={`border-t ${i === 0 ? "bg-slate-50" : ""}`}>
                    <td className="td whitespace-nowrap">{r.date || "-"}</td>
                    <td className="td">{r.description}</td>
                    <td className="td">{r.credit ? money(r.credit) : "-"}</td>
                    <td className="td">{r.debit ? money(r.debit) : "-"}</td>
                    <td className="td font-semibold">{money(r.balance)}</td>
                    <td className="td">
                      {r.paymentId
                        ? <button className="icon-btn text-red-600" title="Delete payment" aria-label="Delete payment" onClick={() => removePayment({ _id: r.paymentId })}><FaTrash /></button>
                        : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t bg-slate-50 font-semibold"><td className="td" colSpan={2}>Total</td><td className="td">{money(ledger.credited)}</td><td className="td">{money(ledger.debited)}</td><td className="td">{money(ledger.balance)}</td><td className="td"></td></tr></tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
