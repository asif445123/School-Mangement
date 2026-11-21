"use client";
import { useMemo, useState } from "react";
import { money } from "@/lib/api";
import { codeSort, n, useAccounting } from "@/lib/accounting";
import { typeFlags } from "@/lib/account-flags";
import { printElement } from "@/lib/print";
import { useSession } from "./session";

// Chart of Accounts: every account grouped under its account type, with the
// total amount entered against it. This is the read-only tree view of the
// Account Master (same tab style as Enter Expenses).
export default function ChartOfAccounts() {
  const { user } = useSession();
  const acc = useAccounting(true);
  const [q, setQ] = useState("");

  const totals = useMemo(() => {
    const m = new Map<string, number>();
    acc.entries.forEach((e) => m.set(e.account?._id, (m.get(e.account?._id) || 0) + (e.amount || 0)));
    return m;
  }, [acc.entries]);

  const term = q.trim().toLowerCase();
  const groups = useMemo(() => {
    const byType = new Map<string, { type: any; accounts: any[] }>();
    for (const t of acc.types) byType.set(t._id, { type: t, accounts: [] });
    for (const a of acc.accounts) {
      const key = a.accountType?._id || "";
      if (!byType.has(key)) byType.set(key, { type: a.accountType || { name: "Untyped" }, accounts: [] });
      byType.get(key)!.accounts.push(a);
    }
    return [...byType.values()]
      .map((g) => ({
        ...g,
        accounts: g.accounts
          .filter((a) => !term || `${a.code} ${a.name}`.toLowerCase().includes(term) || String(g.type?.name || "").toLowerCase().includes(term))
          .sort(codeSort),
      }))
      .filter((g) => g.accounts.length)
      .sort((a, b) => String(a.type?.name || "").localeCompare(String(b.type?.name || "")));
  }, [acc.accounts, acc.types, term]);

  const grandTotal = groups.reduce((s, g) => s + g.accounts.reduce((a, x) => a + (totals.get(x._id) || 0), 0), 0);
  const flags = (t: any) => {
    const f = typeFlags(t);
    return [f.income && "Income", f.expense && "Expense", f.receivable && "Receivable", f.payable && "Payable"].filter(Boolean).join(" / ") || "-";
  };

  if (acc.loading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="space-y-4">
      {acc.error && <div className="card flex flex-wrap items-center justify-between gap-3 text-sm ring-1 ring-red-200"><p className="text-red-600">Some accounting data could not be loaded: {acc.error}. The list below may be incomplete.</p><button type="button" className="btn-light" onClick={acc.reload}>Retry</button></div>}
      <div className="card flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1 sm:flex-none">
          <label className="text-xs font-semibold text-slate-500">Search</label>
          <input className="input mt-1 w-full sm:w-64" placeholder="Search code or account name..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p className="text-sm text-slate-500">{acc.types.length} type(s) · {acc.accounts.length} account(s) · Total {money(grandTotal)}</p>
        <button className="btn-light" onClick={() => printElement("Chart of Accounts", document.getElementById("report-area"), user.schoolInfo)}>Print</button>
      </div>

      {!acc.accounts.length && (
        <div className="card p-8 text-center text-slate-500">No accounts yet. Create an account type, then add accounts in Account Master.</div>
      )}

      <div id="report-area" className="space-y-4">
        {groups.map((g) => {
          const subtotal = g.accounts.reduce((a, x) => a + (totals.get(x._id) || 0), 0);
          return (
            <div key={g.type?._id || g.type?.name} className="card overflow-x-auto p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                <h2 className="font-semibold">{g.type?.name || "Untyped"} <span className="text-sm font-normal text-slate-400">({flags(g.type)})</span></h2>
                <p className="text-sm text-slate-500">{g.accounts.length} account(s) · Subtotal <b>{money(subtotal)}</b></p>
              </div>
              <table className="w-full min-w-[600px]">
                <thead><tr>{["Code", "Account name", "Counts as", "Account", "Total amount"].map((h) => <th key={h} className={`th ${h === "Total amount" ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
                <tbody>
                  {g.accounts.map((a) => (
                    <tr key={a._id} className="border-t">
                      <td className="td font-semibold">{a.code}</td>
                      <td className="td">{a.name}</td>
                      <td className="td">{[typeFlags(a.accountType).income && "Income", typeFlags(a.accountType).expense && "Expense"].filter(Boolean).join(" / ") || "-"}</td>
                      <td className="td">{[typeFlags(a.accountType).receivable && "Receivable", typeFlags(a.accountType).payable && "Payable"].filter(Boolean).join(" / ") || "-"}</td>
                      <td className="td text-right">{n(totals.get(a._id) || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {!groups.length && acc.accounts.length > 0 && <p className="text-sm text-slate-400">No accounts match your search.</p>}
      </div>
    </div>
  );
}
