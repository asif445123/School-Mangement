"use client";
import { useState } from "react";
import { useAccounting } from "@/lib/accounting";
import { useSession } from "@/components/session";
import { AccountList, JournalReport, LedgerReport, PeriodReport, RecvPayReport } from "@/components/account-reports";

// Accounts Reports holds the accounting reports only. Fee and result reports
// moved to Student Reports (its own navbar item, below Exams & Results).
const accountTabs: [string, string][] = [
  ["list", "Account List"],
  ["jv", "Journal Voucher"],
  ["ledger", "Account Ledger"],
  ["recpay", "Receivable / Payable"],
  ["month", "Month Wise"],
  ["monthCmp", "Month Comparison"],
  ["year", "Year Wise"],
  ["yearCmp", "Year Comparison"],
];

export default function AccountsReportsPage() {
  const { user } = useSession();
  const isSchool = user.role === "school";
  const acc = useAccounting(isSchool);
  const [tab, setTab] = useState("list");
  const data = { accounts: acc.accounts, types: acc.types, entries: acc.entries, payments: acc.payments };

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold">Accounts Reports</h1><p className="text-sm text-slate-500">Account, journal voucher, ledger and income / expense reports (scroll the tabs sideways for more).</p></div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {accountTabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${tab === id ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{label}</button>)}
      </div>

      {acc.loading ? <p className="text-slate-500">Loading...</p> : (
        <>
          {tab === "list" && <AccountList data={data} />}
          {tab === "jv" && <JournalReport data={data} />}
          {tab === "ledger" && <LedgerReport data={data} />}
          {tab === "recpay" && <RecvPayReport data={data} />}
          {tab === "month" && <PeriodReport data={data} mode="month" compare={false} title="Month Wise Report" />}
          {tab === "monthCmp" && <PeriodReport data={data} mode="month" compare title="Month Wise Comparison" />}
          {tab === "year" && <PeriodReport data={data} mode="year" compare={false} title="Year Wise Report" />}
          {tab === "yearCmp" && <PeriodReport data={data} mode="year" compare title="Year Wise Comparison" />}
        </>
      )}
    </div>
  );
}
