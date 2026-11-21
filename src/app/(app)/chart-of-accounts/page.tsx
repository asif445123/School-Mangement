"use client";
import ChartOfAccounts from "@/components/chart-of-accounts";

// Enter Expenses -> Chart of Accounts: accounts grouped by account type.
export default function ChartOfAccountsPage() {
  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold">Chart of Accounts</h1><p className="text-sm text-slate-500">Every account grouped under its account type, with the total amount entered against it.</p></div>
      <ChartOfAccounts />
    </div>
  );
}
