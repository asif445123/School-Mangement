"use client";
import CrudPage from "@/components/crud-page";
import { typeFlags } from "@/lib/account-flags";

const mark = (on: boolean) => (on ? <span className="font-bold text-green-600">✔</span> : <span className="text-slate-300">-</span>);

export default function AccountTypesPage() {
  return (
    <CrudPage resource="accountTypes" title="Account type"
      columns={[
        { key: "name", label: "Account type" },
        { key: "receivable", label: "Account receivable", render: (r) => mark(typeFlags(r).receivable) },
        { key: "payable", label: "Account payable", render: (r) => mark(typeFlags(r).payable) },
        { key: "income", label: "Counts as income", render: (r) => mark(typeFlags(r).income) },
        { key: "expense", label: "Counts as expense", render: (r) => mark(typeFlags(r).expense) },
      ]}
      fields={[
        { name: "name", label: "Account type name", required: true },
        { name: "isReceivable", label: "Account Receivable", type: "checkbox" },
        { name: "isPayable", label: "Account Payable", type: "checkbox", hint: "Shows accounts of this type in the receivable / payable list." },
        { name: "isIncome", label: "Counts as Income on Dashboard", type: "checkbox" },
        { name: "isExpense", label: "Counts as Expense on Dashboard", type: "checkbox", hint: "Only accounts of a type checked here add to the dashboard income / expense." },
      ]}
      defaults={{ isReceivable: false, isPayable: false, isIncome: false, isExpense: false }}
      formValues={(r) => { const f = typeFlags(r); return { ...r, isReceivable: f.receivable, isPayable: f.payable, isIncome: f.income, isExpense: f.expense }; }} />
  );
}
