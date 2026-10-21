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
  const reload = useCallback(() => {
    if (!enabled) return;
    Promise.all([api("/api/accounts"), api("/api/accountTypes"), api("/api/entries"), api("/api/fees")])
      .then(([a, t, e, f]) => { setD({ accounts: a.items, types: t.items, entries: e.items, payments: feePayments(f.items) }); setLoading(false); })
      .catch(() => setLoading(false));
  }, [enabled]);
  useEffect(() => { reload(); }, [reload]);
  return { ...d, loading, reload };
}
