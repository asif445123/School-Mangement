"use client";
import { useEffect, useMemo, useState } from "react";
import { api, currentMonth, money, today } from "@/lib/api";
import { useSession } from "@/components/session";
import { typeFlags } from "@/lib/account-flags";
import { Row, splitRows, useAccounting } from "@/lib/accounting";

const colors = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#0891b2", "#f59e0b", "#ec4899", "#475569", "#84cc16", "#14b8a6", "#f43f5e", "#8b5cf6"];
type Item = { id: string; name: string; amount: number };

// Sum entries per account for one kind (income / expense), biggest first
function toItems(rows: Row[]): Item[] {
  const map = new Map<string, Item>();
  for (const r of rows) {
    const cur = map.get(r.id) || { id: r.id, name: r.name, amount: 0 };
    cur.amount += r.amount; map.set(r.id, cur);
  }
  return [...map.values()].sort((x, y) => y.amount - x.amount);
}

function Pie({ items, total }: { items: Item[]; total: number }) {
  let angle = -Math.PI / 2;
  const r = 100, cx = 110, cy = 110;
  return (
    <svg viewBox="0 0 220 220" className="h-56 w-56 shrink-0">
      {items.map((it, i) => {
        const frac = it.amount / total, a0 = angle, a1 = angle + frac * 2 * Math.PI;
        angle = a1;
        if (frac >= 0.9999) return <circle key={it.id} cx={cx} cy={cy} r={r} fill={colors[i % colors.length]} />;
        const p = (a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
        return <path key={it.id} d={`M ${cx} ${cy} L ${p(a0)} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${p(a1)} Z`} fill={colors[i % colors.length]} stroke="#fff" strokeWidth="1" />;
      })}
    </svg>
  );
}

function Breakdown({ title, items, total }: { title: string; items: Item[]; total: number }) {
  const pct = (n: number) => (total ? ((n / total) * 100).toFixed(2) : "0.00") + "%";
  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold">{title} breakdown</h3>
        {items.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((it, i) => (
              <div key={it.id} className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200" style={{ borderTop: `3px solid ${colors[i % colors.length]}` }}>
                <p className="flex items-center gap-2 text-xs text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />{it.name}</p>
                <p className="mt-1 font-bold">{money(it.amount)}</p><p className="text-xs text-slate-400">{pct(it.amount)}</p>
              </div>
            ))}
            <div className="rounded-lg bg-slate-100 p-3 ring-1 ring-slate-200" style={{ borderTop: "3px solid #334155" }}>
              <p className="text-xs text-slate-600">Total {title}</p><p className="mt-1 font-bold">{money(total)}</p><p className="text-xs text-slate-400">100.00%</p>
            </div>
          </div>
        ) : <p className="py-6 text-center text-sm text-slate-400">No {title.toLowerCase()} entries in this period</p>}
      </div>
      {items.length > 0 && (
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold">{title} breakdown chart</h3>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Pie items={items} total={total} />
            <ul className="space-y-1 text-sm">
              {items.map((it, i) => (
                <li key={it.id} className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: colors[i % colors.length] }} />{String(i + 1).padStart(2, "0")} {it.name} <span className="text-slate-400">{pct(it.amount)}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useSession();
  const isSchool = user.role === "school";
  const [counts, setCounts] = useState({ students: 0, diary: 0, papers: 0 });
  const { entries, payments } = useAccounting(isSchool);
  const [from, setFrom] = useState(`${currentMonth()}-01`);
  const [to, setTo] = useState(today());

  useEffect(() => {
    if (!isSchool) return;
    Promise.all([api("/api/students"), api(`/api/diary?date=${today()}`), api("/api/papers")]).then(([st, di, pa]) =>
      setCounts({ students: st.items.length, diary: di.items.length, papers: pa.items.length }));
  }, [isSchool]);

  const t = useMemo(() => {
    const inRange = entries.filter((e) => e.date >= from && e.date <= to);
    const sum = (f: (e: any) => boolean) => inRange.filter(f).reduce((a, e) => a + e.amount, 0);
    const rows = splitRows(entries, payments); // income rows include fees received ("Fee income")
    const income = toItems(rows.income.filter((r) => r.date >= from && r.date <= to)), expense = toItems(rows.expense.filter((r) => r.date >= from && r.date <= to));
    return {
      income, expense,
      incomeTotal: income.reduce((a, i) => a + i.amount, 0), expenseTotal: expense.reduce((a, i) => a + i.amount, 0),
      receivable: sum((e) => typeFlags(e.account?.accountType).receivable), payable: sum((e) => typeFlags(e.account?.accountType).payable),
    };
  }, [entries, payments, from, to]);

  if (!isSchool) return null;
  const net = t.incomeTotal - t.expenseTotal;
  const cards: [string, number, string][] = [["Income", t.incomeTotal, "text-green-700"], ["Expense", t.expenseTotal, "text-red-600"], ["Net (income - expense)", net, net >= 0 ? "text-blue-700" : "text-red-600"], ["Receivable", t.receivable, "text-slate-800"], ["Payable", t.payable, "text-slate-800"]];

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">Welcome, {user.name}</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Academic</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[["Students", counts.students], ["Diary entries today", counts.diary], ["Papers created", counts.papers]].map(([label, value]) => (
            <div key={label} className="card"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Income</h2>
        <div className="card flex flex-wrap items-end gap-4">
          <div><label className="text-xs font-semibold text-slate-500">From</label><input type="date" className="input mt-1 w-44" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-slate-500">To</label><input type="date" className="input mt-1 w-44" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {cards.map(([label, value, color]) => (<div key={label} className="card"><p className="text-xs uppercase text-slate-500">{label}</p><p className={`mt-1 text-lg font-bold ${color}`}>{money(value)}</p></div>))}
        </div>
        <Breakdown title="Expense" items={t.expense} total={t.expenseTotal} />
        <Breakdown title="Income" items={t.income} total={t.incomeTotal} />
      </section>
    </div>
  );
}
