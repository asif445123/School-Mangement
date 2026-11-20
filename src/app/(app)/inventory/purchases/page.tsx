"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaPlus, FaPrint, FaTrash } from "react-icons/fa";
import { api, money, today } from "@/lib/api";
import { confirmDelete, toast } from "@/lib/alerts";
import { PAYMENT_MODES, nextInvoiceNo, stockOf } from "@/lib/inventory-calc";
import { accountLabel, useInventory } from "@/lib/inventory-data";
import { printPurchaseInvoice } from "@/lib/print";
import { useSession } from "@/components/session";

const emptyRow = () => ({ item: "", qty: "", rate: "" });

// Purchase Invoice: buy store items. The purchase raises the stock, the paid
// amount posts an expense and the rest becomes the supplier's payable.
export default function PurchaseInvoicePage() {
  const { user } = useSession();
  const { items, suppliers, invoices, moves, accounts, loading, reload } = useInventory();
  const [date, setDate] = useState(today());
  const [supplier, setSupplier] = useState("");
  const [rows, setRows] = useState([emptyRow()]);
  const [paid, setPaid] = useState("0");
  const [mode, setMode] = useState("Cash");
  const [account, setAccount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const touched = useRef<Record<number, boolean>>({});

  // Cash accounts are suggested for a cash purchase, bank accounts otherwise.
  const suggested = useMemo(() => {
    const list = accounts.filter((a) => !/receivable|payable/i.test(a.accountType?.name || ""));
    const cashFirst = [...list].sort((a, b) => (/cash/i.test(a.name) ? -1 : 0) - (/cash/i.test(b.name) ? -1 : 0));
    return cashFirst;
  }, [accounts]);
  useEffect(() => { if (!account && suggested.length) setAccount(suggested[0]._id); }, [suggested, account]); // eslint-disable-line

  const total = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0);
  const stockOfItem = (id: string) => {
    const item = items.find((i) => i._id === id);
    return item ? stockOf(item, moves.filter((m) => String(m.item?._id || m.item) === id)) : 0;
  };

  const setRow = (i: number, key: string, value: string) => setRows((list) => list.map((r, j) => {
    if (j !== i) return r;
    if (key === "item") {
      const item = items.find((x) => x._id === value);
      return { ...r, item: value, rate: touched.current[i] ? r.rate : item ? String(item.rate ?? "") : "" };
    }
    if (key === "rate") touched.current[i] = true;
    return { ...r, [key]: value };
  }));

  async function save() {
    const filled = rows.filter((r) => r.item || r.qty || r.rate);
    if (!filled.length) return toast("error", "Add at least one item");
    if (filled.some((r) => !r.item)) return toast("error", "Select an item on every row");
    if (filled.some((r) => !(Number(r.qty) > 0))) return toast("error", "Enter a quantity for every item");
    setBusy(true);
    try {
      await api("/api/inventory/purchase-invoices", {
        method: "POST",
        body: {
          date, supplier: supplier || null, rows: filled.map((r) => ({ item: r.item, qty: Number(r.qty), rate: Number(r.rate) || 0 })),
          paid: Number(paid) || 0, mode, account: account || null, note,
        },
      });
      toast("success", "Purchase saved");
      setRows([emptyRow()]); setPaid("0"); setNote(""); setSupplier(""); touched.current = {};
      reload();
    } catch (e: any) { toast("error", e.message); }
    finally { setBusy(false); }
  }

  async function remove(inv: any) {
    if (!(await confirmDelete(`Invoice ${inv.invoiceNo} will be deleted. Its stock and expense entry will be reversed.`))) return;
    try { await api(`/api/inventory/purchase-invoices/${inv._id}`, { method: "DELETE" }); toast("success", "Deleted"); reload(); }
    catch (e: any) { toast("error", e.message); }
  }

  // next auto number = the highest existing one, whatever the date order
  const lastNo = invoices.map((i) => String(i.invoiceNo)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Purchase Invoice</h1>

      <div className="card space-y-4">
        <h2 className="font-semibold">New Purchase Invoice</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="text-sm text-slate-600">Date</label><input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="text-sm text-slate-600">Invoice No (auto)</label><input className="input mt-1 bg-slate-50" value="" readOnly placeholder={nextInvoiceNo(lastNo)} /></div>
          <div><label className="text-sm text-slate-600">Supplier</label>
            <select className="input mt-1" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              <option value="">Cash Purchase</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px]">
            <thead><tr>{["Item", "Qty", "Rate", "Amount", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="td">
                    <select className="input" value={r.item} onChange={(e) => setRow(i, "item", e.target.value)}>
                      <option value="">Select item...</option>
                      {items.map((it) => <option key={it._id} value={it._id}>{it.name} (stock {stockOfItem(it._id)})</option>)}
                    </select>
                  </td>
                  <td className="td"><input type="number" min={0} className="input w-24" placeholder="Qty" value={r.qty} onChange={(e) => setRow(i, "qty", e.target.value)} /></td>
                  <td className="td"><input type="number" min={0} className="input w-28 bg-emerald-50" placeholder="Rate" value={r.rate} onChange={(e) => setRow(i, "rate", e.target.value)} /></td>
                  <td className="td whitespace-nowrap text-right font-semibold">{((Number(r.qty) || 0) * (Number(r.rate) || 0)).toLocaleString()}</td>
                  <td className="td">
                    {rows.length > 1 && <button className="icon-btn text-red-600" title="Remove row" aria-label="Remove row" onClick={() => setRows(rows.filter((_, j) => j !== i))}><FaTrash /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button className="btn-light !min-h-[34px] !px-3 text-sm" onClick={() => setRows([...rows, emptyRow()])}><FaPlus /> Add Item</button>
          <p className="text-sm font-semibold">Total: <span className="text-base">{money(total)}</span></p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="text-sm text-slate-600">Paid Now</label><input type="number" min={0} className="input mt-1" value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
          <div><label className="text-sm text-slate-600">Mode</label>
            <select className="input mt-1" value={mode} onChange={(e) => setMode(e.target.value)}>{PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}</select>
          </div>
          <div><label className="text-sm text-slate-600">Bank</label>
            <select className="input mt-1" value={account} onChange={(e) => setAccount(e.target.value)}>
              <option value="">No account (cash)</option>
              {suggested.map((a) => <option key={a._id} value={a._id}>{accountLabel(a)}</option>)}
            </select>
          </div>
          <div><label className="text-sm text-slate-600">Note</label><input className="input mt-1" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>

        <p className="text-sm text-slate-500">Jo raqam &quot;Paid Now&quot; se kam hogi woh Supplier ke ledger mein udhaar (payable) ban jaye gi. Accounting entry khud post hogi.</p>
        <button className="btn !bg-emerald-700 hover:!bg-emerald-800" disabled={busy} onClick={save}>💾 Save Purchase</button>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold">Purchase History</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[720px]">
            <thead><tr>{["Invoice", "Date", "Supplier", "Total", "Paid", "Due", "Actions"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {invoices.map((inv) => {
                const due = (Number(inv.total) || 0) - (Number(inv.paid) || 0);
                return (
                  <tr key={inv._id} className="border-t">
                    <td className="td font-semibold">{inv.invoiceNo}</td>
                    <td className="td whitespace-nowrap">{inv.date}</td>
                    <td className="td">{inv.supplierName}</td>
                    <td className="td">{money(inv.total)}</td>
                    <td className="td">{money(inv.paid)}</td>
                    <td className={`td font-semibold ${due > 0 ? "text-red-600" : ""}`}>{money(due)}</td>
                    <td className="td whitespace-nowrap">
                      <button className="btn-light !min-h-[30px] !px-2.5 text-xs" onClick={() => printPurchaseInvoice(inv, user?.schoolInfo)}><FaPrint /> Print</button>
                      <button className="icon-btn text-red-600" title="Delete" aria-label={`Delete ${inv.invoiceNo}`} onClick={() => remove(inv)}><FaTrash /></button>
                    </td>
                  </tr>
                );
              })}
              {!invoices.length && <tr><td colSpan={7} className="td py-8 text-center text-slate-400">{loading ? "Loading..." : "No purchases yet"}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
