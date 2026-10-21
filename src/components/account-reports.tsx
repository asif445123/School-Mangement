"use client";
import { useMemo, useState } from "react";
import { currentMonth, today } from "@/lib/api";
import { FEE_INCOME, codeSort, matrix, n, splitRows } from "@/lib/accounting";
import { typeFlags } from "@/lib/account-flags";
import { printElement } from "@/lib/print";
import { useSession } from "./session";

export type Data = { accounts: any[]; types: any[]; entries: any[]; payments: any[] };
const num = (v: number) => (v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const firstOfMonth = () => `${currentMonth()}-01`;
const label = "text-sm font-semibold text-slate-600";

function Filters({ title, onPreview, children }: { title: string; onPreview: () => void; children: React.ReactNode }) {
  const { user } = useSession();
  return (
    <div className="card space-y-4">
      {children}
      <div className="flex gap-2">
        <button className="btn !bg-emerald-700 hover:!bg-emerald-800" onClick={onPreview}>Preview</button>
        <button className="btn-light" onClick={() => printElement(title, document.getElementById("report-area"), user.schoolInfo)}>Print</button>
      </div>
    </div>
  );
}
const Hint = () => <p className="text-sm text-slate-400">Set filters above and click Preview.</p>;
const Th = ({ children, right }: any) => <th className={`th ${right ? "text-right" : ""}`}>{children}</th>;

// ---------- Accounts List ----------
export function AccountList({ data }: { data: Data }) {
  const [type, setType] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const totals = useMemo(() => { const m = new Map<string, number>(); data.entries.forEach((e) => m.set(e.account?._id, (m.get(e.account?._id) || 0) + e.amount)); return m; }, [data.entries]);
  const rows = applied === null ? [] : data.accounts.filter((a) => !applied || a.accountType?._id === applied).sort(codeSort);
  return (
    <div className="space-y-4">
      <Filters title="Accounts List" onPreview={() => setApplied(type)}>
        <div><label className={label}>Type</label>
          <select className="input mt-1" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{data.types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</select></div>
      </Filters>
      {applied === null ? <Hint /> : (
        <div id="report-area" className="card overflow-x-auto p-0">
          <table className="w-full"><thead><tr><Th>Code</Th><Th>Description</Th><Th>Type</Th><Th right>Total amount</Th></tr></thead>
            <tbody>{rows.map((a) => <tr key={a._id} className="border-t"><td className="td font-semibold">{a.code}</td><td className="td">{a.name}</td><td className="td text-slate-500">{a.accountType?.name}</td><td className="td text-right">{num(totals.get(a._id) || 0)}</td></tr>)}
              {!rows.length && <tr><td colSpan={4} className="td py-6 text-center text-slate-400">No accounts</td></tr>}</tbody></table>
        </div>
      )}
    </div>
  );
}

// ---------- Journal Voucher Report ----------
export function JournalReport({ data }: { data: Data }) {
  const [f, setF] = useState({ from: firstOfMonth(), to: today(), mode: "date", compare: false, from2: "", to2: "" });
  const [a, setA] = useState<typeof f | null>(null);
  const build = (from: string, to: string, mode: string) => {
    const m = new Map<string, { amount: number; count: number }>();
    data.entries.forEach((e) => { if (e.date < from || e.date > to) return; const k = mode === "date" ? e.date : e.date.slice(0, 7); const c = m.get(k) || { amount: 0, count: 0 }; c.amount += e.amount; c.count++; m.set(k, c); });
    return [...m.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  };
  const table = (title: string, list: [string, { amount: number; count: number }][]) => (
    <div className="card overflow-x-auto p-0">
      <h3 className="p-4 font-semibold">{title}</h3>
      <table className="w-full"><thead><tr><Th>{a?.mode === "date" ? "Date" : "Month"}</Th><Th right>Entries</Th><Th right>Total amount</Th></tr></thead>
        <tbody>{list.map(([k, v]) => <tr key={k} className="border-t"><td className="td">{k}</td><td className="td text-right">{v.count}</td><td className="td text-right">{num(v.amount)}</td></tr>)}
          <tr className="border-t bg-slate-50 font-semibold"><td className="td">Total</td><td className="td text-right">{list.reduce((s, [, v]) => s + v.count, 0)}</td><td className="td text-right">{num(list.reduce((s, [, v]) => s + v.amount, 0))}</td></tr></tbody></table>
    </div>
  );
  const A = a ? build(a.from, a.to, a.mode) : [], B = a?.compare && a.from2 && a.to2 ? build(a.from2, a.to2, a.mode) : null;
  const ta = A.reduce((s, [, v]) => s + v.amount, 0), tb = (B || []).reduce((s, [, v]) => s + v.amount, 0);
  return (
    <div className="space-y-4">
      <Filters title="Journal Voucher Report" onPreview={() => setA({ ...f })}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={label}>From</label><input type="date" className="input mt-1" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
          <div><label className={label}>To</label><input type="date" className="input mt-1" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex overflow-hidden rounded-lg border">{[["date", "Date wise"], ["month", "Month wise"]].map(([k, l]) => <button key={k} onClick={() => setF({ ...f, mode: k })} className={`px-4 py-2 text-sm ${f.mode === k ? "bg-emerald-700 text-white" : "bg-white text-slate-600"}`}>{l}</button>)}</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.compare} onChange={(e) => setF({ ...f, compare: e.target.checked })} /> Compare with another period</label>
        </div>
        {f.compare && <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={label}>Compare from</label><input type="date" className="input mt-1" value={f.from2} onChange={(e) => setF({ ...f, from2: e.target.value })} /></div>
          <div><label className={label}>Compare to</label><input type="date" className="input mt-1" value={f.to2} onChange={(e) => setF({ ...f, to2: e.target.value })} /></div>
        </div>}
      </Filters>
      {!a ? <Hint /> : (
        <div id="report-area" className="space-y-4">
          {B && <div className="card text-sm">Period 1: <b>{num(ta)}</b> · Period 2: <b>{num(tb)}</b> · Difference: <b>{num(tb - ta)}</b>{ta ? ` (${(((tb - ta) / ta) * 100).toFixed(1)}%)` : ""}</div>}
          <div className={B ? "grid gap-4 md:grid-cols-2" : ""}>{table(B ? `${a.from} to ${a.to}` : "Journal vouchers", A)}{B && table(`${a.from2} to ${a.to2}`, B)}</div>
        </div>
      )}
    </div>
  );
}

// ---------- Accounts Ledger ----------
export function LedgerReport({ data }: { data: Data }) {
  const [f, setF] = useState({ type: "", code: "", toCode: "", from: firstOfMonth(), to: today() });
  const [a, setA] = useState<typeof f | null>(null);
  const inType = (type: string) => data.accounts.filter((x) => !type || x.accountType?._id === type).sort(codeSort);
  const options = inType(f.type);
  const desc = f.code ? options.find((x) => x._id === f.code)?.name || "" : "";
  const blocks = useMemo(() => {
    if (!a) return [];
    const list = inType(a.type);
    let sel = list;
    if (a.code) { const i = list.findIndex((x) => x._id === a.code), j = a.toCode ? list.findIndex((x) => x._id === a.toCode) : i; if (i >= 0) sel = list.slice(Math.min(i, j < 0 ? i : j), Math.max(i, j < 0 ? i : j) + 1); }
    return sel.map((acc) => {
      const all = data.entries.filter((e) => e.account?._id === acc._id);
      const opening = all.filter((e) => e.date < a.from).reduce((s, e) => s + e.amount, 0);
      let run = opening;
      const rows = all.filter((e) => e.date >= a.from && e.date <= a.to).sort((x, y) => x.date.localeCompare(y.date) || (x.jv || 0) - (y.jv || 0)).map((e) => ({ ...e, balance: (run += e.amount) }));
      return { acc, opening, rows, total: run };
    }).filter((b) => b.rows.length || b.opening);
  }, [a, data]); // eslint-disable-line
  return (
    <div className="space-y-4">
      <Filters title="Account Ledger" onPreview={() => setA({ ...f })}>
        <div><label className={label}>Account Type</label>
          <select className="input mt-1" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, code: "", toCode: "" })}><option value="">All types</option>{data.types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</select></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={label}>Account Code</label>
            <select className="input mt-1" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value, toCode: "" })}><option value="">All accounts (in type)</option>{options.map((x) => <option key={x._id} value={x._id}>{x.code} - {x.name}</option>)}</select></div>
          <div><label className={label}>To Code</label>
            <select className="input mt-1" disabled={!f.code} value={f.toCode} onChange={(e) => setF({ ...f, toCode: e.target.value })}><option value="">Same as Account Code</option>{options.map((x) => <option key={x._id} value={x._id}>{x.code} - {x.name}</option>)}</select></div>
        </div>
        <div><label className={label}>Description</label><input className="input mt-1 bg-slate-100" readOnly value={desc} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={label}>From</label><input type="date" className="input mt-1" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
          <div><label className={label}>To</label><input type="date" className="input mt-1" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
        </div>
      </Filters>
      {!a ? <Hint /> : (
        <div id="report-area" className="space-y-4">
          {blocks.map((b) => (
            <div key={b.acc._id} className="card overflow-x-auto p-0">
              <h3 className="p-4 font-semibold">{b.acc.code} - {b.acc.name} <span className="text-sm font-normal text-slate-400">({b.acc.accountType?.name})</span></h3>
              <table className="w-full"><thead><tr><Th>Date</Th><Th>JV</Th><Th>Narration</Th><Th right>Amount</Th><Th right>Balance</Th></tr></thead>
                <tbody>
                  <tr className="border-t bg-slate-50"><td className="td" colSpan={4}>Opening balance</td><td className="td text-right">{num(b.opening)}</td></tr>
                  {b.rows.map((e) => <tr key={e._id} className="border-t"><td className="td whitespace-nowrap">{e.date}</td><td className="td">{e.jv ? `JV ${e.jv}` : "-"}</td><td className="td">{e.narration}</td><td className="td text-right">{num(e.amount)}</td><td className="td text-right">{num(e.balance)}</td></tr>)}
                  <tr className="border-t bg-slate-50 font-semibold"><td className="td" colSpan={4}>Closing balance</td><td className="td text-right">{num(b.total)}</td></tr>
                </tbody></table>
            </div>
          ))}
          {!blocks.length && <p className="text-sm text-slate-400">No entries for the selected accounts and dates.</p>}
        </div>
      )}
    </div>
  );
}

// ---------- Accounts Receivable / Payable ----------
export function RecvPayReport({ data }: { data: Data }) {
  const [f, setF] = useState({ asOf: today(), kind: "all" });
  const [a, setA] = useState<typeof f | null>(null);
  const list = (kind: "receivable" | "payable") => {
    if (!a) return [];
    return data.accounts.filter((x) => typeFlags(x.accountType)[kind]).sort(codeSort)
      .map((x) => ({ ...x, balance: data.entries.filter((e) => e.account?._id === x._id && e.date <= a.asOf).reduce((s, e) => s + e.amount, 0) })).filter((x) => x.balance !== 0);
  };
  const table = (title: string, rows: any[]) => (
    <div className="card overflow-x-auto p-0">
      <h3 className="p-4 font-semibold text-slate-600">{title}</h3>
      <table className="w-full"><thead><tr><Th>Code</Th><Th>Description</Th><Th right>Balance</Th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r._id} className="border-t"><td className="td font-semibold">{r.code}</td><td className="td">{r.name}</td><td className="td text-right">{num(r.balance)}</td></tr>)}
          <tr className="border-t bg-slate-50 font-semibold"><td className="td">Total</td><td className="td"></td><td className="td text-right">{num(rows.reduce((s, r) => s + r.balance, 0))}</td></tr></tbody></table>
    </div>
  );
  return (
    <div className="space-y-4">
      <Filters title="Accounts Receivable / Payable" onPreview={() => setA({ ...f })}>
        <div><label className={label}>As of date</label><input type="date" className="input mt-1 w-56" value={f.asOf} onChange={(e) => setF({ ...f, asOf: e.target.value })} /></div>
        <div className="flex gap-4 text-sm">{[["receivable", "Receivable"], ["payable", "Payable"], ["all", "All"]].map(([k, l]) => <label key={k} className="flex items-center gap-2"><input type="radio" checked={f.kind === k} onChange={() => setF({ ...f, kind: k })} /> {l}</label>)}</div>
      </Filters>
      {!a ? <Hint /> : (
        <div id="report-area" className={`grid gap-4 ${a.kind === "all" ? "md:grid-cols-2" : ""}`}>
          {a.kind !== "payable" && table("Receivable", list("receivable"))}
          {a.kind !== "receivable" && table("Payable", list("payable"))}
        </div>
      )}
    </div>
  );
}

// ---------- Month / Year wise (and comparison) ----------
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function delta(v: number, p?: number) {
  if (p === undefined || (!v && !p)) return null;
  if (!p) return { text: `+${n(v)}`, up: true };
  const pct = Math.round(((v - p) / p) * 100);
  return { text: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}
function Cell({ v, p, compare, bar, max, zero }: any) {
  const d = compare ? delta(v, p) : null;
  return (
    <td className="td whitespace-nowrap text-right">
      {bar && <span className="mr-2 inline-block h-2 rounded bg-slate-300 align-middle" style={{ width: `${max ? (v / max) * 48 : 0}px` }} />}
      {v ? n(v) : zero}
      {d && <div className={`text-xs ${d.up ? "text-green-600" : "text-red-600"}`}>{d.text}</div>}
    </td>
  );
}
function PeriodTable({ title, m, labels, compare, bars }: any) {
  return (
    <div className="card overflow-x-auto p-0">
      <h2 className="p-4 font-semibold">{title}</h2>
      <table className="w-full">
        <thead><tr><Th>Account</Th>{labels.map((l: string) => <Th key={l} right>{l}</Th>)}</tr></thead>
        <tbody>
          {m.list.map((r: any) => { const max = Math.max(...r.values, 0); return (
            <tr key={r.id} className="border-t"><td className="td whitespace-nowrap">{r.name}</td>{r.values.map((v: number, i: number) => <Cell key={i} v={v} p={r.values[i - 1]} compare={compare} bar={bars} max={max} zero="—" />)}</tr>); })}
          <tr className="border-t bg-slate-50 font-semibold"><td className="td">Total</td>{m.totals.map((v: number, i: number) => <Cell key={i} v={v} p={m.totals[i - 1]} compare={compare} zero="0" />)}</tr>
        </tbody>
      </table>
    </div>
  );
}
export function PeriodReport({ data, mode, compare, title }: { data: Data; mode: "month" | "year"; compare: boolean; title: string }) {
  const { user } = useSession();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear), [fromY, setFromY] = useState(thisYear - 3), [toY, setToY] = useState(thisYear);
  const { income, expense } = useMemo(() => splitRows(data.entries, data.payments), [data.entries, data.payments]);
  const periods = mode === "month" ? Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`) : Array.from({ length: Math.max(0, Math.min(10, toY - fromY + 1)) }, (_, i) => String(fromY + i));
  const labels = mode === "month" ? MONTHS : periods;
  const keyOf = (d: string) => d.slice(0, mode === "month" ? 7 : 4);
  const incList = [...data.accounts.filter((x) => typeFlags(x.accountType).income).map((x) => ({ id: x._id, name: x.name })), { id: FEE_INCOME, name: "Fee income" }];
  const expList = data.accounts.filter((x) => typeFlags(x.accountType).expense).map((x) => ({ id: x._id, name: x.name }));
  const inc = matrix(income, incList, periods, keyOf), exp = matrix(expense, expList, periods, keyOf);
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-4">
        {mode === "month"
          ? <div><label className={label}>Year</label><input type="number" className="input mt-1 w-32" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
          : <><div><label className={label}>From year</label><input type="number" className="input mt-1 w-32" value={fromY} onChange={(e) => setFromY(Number(e.target.value))} /></div>
              <div><label className={label}>To year</label><input type="number" className="input mt-1 w-32" value={toY} onChange={(e) => setToY(Number(e.target.value))} /></div></>}
        <button className="btn-light" onClick={() => printElement(title, document.getElementById("report-area"), user.schoolInfo)}>Print</button>
      </div>
      <div id="report-area" className="space-y-4">
        <PeriodTable title="Income" m={inc} labels={labels} compare={compare} bars={mode === "year" && !compare} />
        <PeriodTable title="Expenses" m={exp} labels={labels} compare={compare} bars={mode === "year" && !compare} />
      </div>
    </div>
  );
}
