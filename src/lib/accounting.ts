import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { typeFlags } from "./account-flags";

export type Row = { id: string; name: string; date: string; amount: number };
export const FEE_INCOME = "fee-income"; // fees received count as income
export const n = (v: number) => Math.round(v || 0).toLocaleString();
export const codeSort = (a: any, b: any) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true });

// Every fee payment as {date, amount} (older chalans without a payment list use their received date)
export function feePayments(fees: any[]) {
  const out: { date: string; amount: number }[] = [];
  for (const f of fees) {
    if (f.payments?.length) f.payments.forEach((p: any) => out.push({ date: p.date, amount: p.amount }));
    else if (f.paid > 0) out.push({ date: f.receivedDate || `${f.month}-01`, amount: f.paid });
  }
  return out.filter((p) => p.date);
}

// Income rows (income accounts + fee income) and expense rows, one per entry / payment
export function splitRows(entries: any[], payments: { date: string; amount: number }[]) {
  const income: Row[] = [], expense: Row[] = [];
  for (const e of entries) {
    if (!e.account) continue;
    const f = typeFlags(e.account.accountType), r = { id: e.account._id, name: e.account.name, date: e.date, amount: e.amount };
    if (f.income) income.push(r);
    if (f.expense) expense.push(r);
  }
  payments.forEach((p) => income.push({ id: FEE_INCOME, name: "Fee income", date: p.date, amount: p.amount }));
  return { income, expense };
}

// accounts x periods table with totals
export function matrix(rows: Row[], accounts: { id: string; name: string }[], periods: string[], keyOf: (d: string) => string) {
  const m = new Map(accounts.map((a) => [a.id, { id: a.id, name: a.name, values: periods.map(() => 0) }]));
  for (const r of rows) {
    const i = periods.indexOf(keyOf(r.date));
    if (i < 0) continue;
    if (!m.has(r.id)) m.set(r.id, { id: r.id, name: r.name, values: periods.map(() => 0) });
    m.get(r.id)!.values[i] += r.amount;
  }
  const list = [...m.values()];
  return { list, totals: periods.map((_, i) => list.reduce((a, x) => a + x.values[i], 0)) };
}

export function useAccounting(enabled: boolean) {
  const [d, setD] = useState<{ accounts: any[]; types: any[]; entries: any[]; payments: any[] }>({ accounts: [], types: [], entries: [], payments: [] });
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const reload = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    let failed = "";
    // Every list loads on its own: one failed request (often the big fees list)
    // must not throw away the accounts / entries that did load, and the failure
    // is reported through `error` instead of silently leaving every figure at 0.
    const jobs = [
      api("/api/accounts").then((a) => setD((p) => ({ ...p, accounts: a.items }))),
      api("/api/accountTypes").then((t) => setD((p) => ({ ...p, types: t.items }))),
      api("/api/entries").then((e) => setD((p) => ({ ...p, entries: e.items }))),
      api("/api/fees").then((f) => setD((p) => ({ ...p, payments: feePayments(f.items) }))),
    ].map((job) => job.catch((e: any) => { failed ||= e?.message || "Request failed"; }));
    Promise.all(jobs).then(() => { setError(failed); setLoading(false); });
  }, [enabled]);
  useEffect(() => { reload(); }, [reload]);
  return { ...d, loading, error, reload };
}

// The dashboard Finance figures for one period: income / expense rows and
// totals (fee payments count as "Fee income"), plus the sums of the entries
// booked on receivable / payable account types inside the same period.
export function financeSummary(entries: any[], payments: { date: string; amount: number }[], from: string, to: string) {
  const rows = splitRows(entries, payments);
  const inPeriod = (date: string) => date >= from && date <= to;
  const income = rows.income.filter((r) => inPeriod(r.date)), expense = rows.expense.filter((r) => inPeriod(r.date));
  let receivable = 0, payable = 0;
  for (const e of entries) {
    if (!inPeriod(e.date)) continue;
    const f = typeFlags(e.account?.accountType);
    if (f.receivable) receivable += e.amount;
    if (f.payable) payable += e.amount;
  }
  const incomeTotal = income.reduce((a, r) => a + r.amount, 0), expenseTotal = expense.reduce((a, r) => a + r.amount, 0);
  return { income, expense, incomeTotal, expenseTotal, net: incomeTotal - expenseTotal, receivable, payable };
}
