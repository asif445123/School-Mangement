"use client";
import { useEffect, useMemo, useState } from "react";
import { FaDownload, FaPrint } from "react-icons/fa";
import Modal from "@/components/modal";
import { api, money } from "@/lib/api";
import { toast } from "@/lib/alerts";
import { printChalan } from "@/lib/print";
import { studentClassSection } from "@/lib/student-details";

const badge: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  unpaid: "bg-red-100 text-red-700",
};

const feeStatus = (fee: any) => {
  const amount = Number(fee.amount) || 0;
  const paid = Number(fee.paid) || 0;
  return amount - paid <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
};

export function useStudentFeeLedger(studentId?: string) {
  const [fees, setFees] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedStudentId, setLoadedStudentId] = useState("");

  useEffect(() => {
    let active = true;
    if (!studentId) {
      setFees([]);
      setAccounts([]);
      setLoadedStudentId("");
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    Promise.all([
      api(`/api/fees?student=${encodeURIComponent(studentId)}`),
      api("/api/payment-accounts"),
    ])
      .then(([feeData, accountData]) => {
        if (!active) return;
        const sorted = [...(feeData.items || [])]
          .sort((a: any, b: any) => String(b.month || "").localeCompare(String(a.month || "")));
        setFees(sorted);
        setAccounts((accountData.items || []).filter((account: any) => account.active));
        setLoadedStudentId(studentId);
      })
      .catch((error: any) => {
        if (!active) return;
        setFees([]);
        setAccounts([]);
        setLoadedStudentId(studentId);
        toast("error", error.message || "Could not load student ledger");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [studentId]);

  const current = !!studentId && loadedStudentId === studentId;
  return {
    fees: current ? fees : [],
    accounts: current ? accounts : [],
    loading: !!studentId && (loading || !current),
  };
}

export function studentLedgerTotals(fees: any[]) {
  const total = fees.reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0);
  const paid = fees.reduce((sum, fee) => sum + (Number(fee.paid) || 0), 0);
  return { total, paid, balance: Math.max(0, total - paid) };
}

export function StudentFeeLedgerDetails({
  student,
  schoolInfo,
  fees,
  accounts,
  loading,
}: {
  student: any;
  schoolInfo?: any;
  fees: any[];
  accounts: any[];
  loading: boolean;
}) {
  const [showDetail, setShowDetail] = useState(true);
  const { total, paid, balance } = useMemo(() => studentLedgerTotals(fees), [fees]);

  const subtitle = [
    student.rollNo ? `Admission / Roll # ${student.rollNo}` : "",
    studentClassSection(student) !== "-" ? `Class ${studentClassSection(student)}` : "",
    student.fatherName ? `Father: ${student.fatherName}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-4">
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-800">Fee chalan summary</h2>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            ["Total amount", total, "text-slate-800"],
            ["Paid amount", paid, "text-green-700"],
            ["Balance", balance, balance > 0 ? "text-red-600" : "text-green-700"],
          ].map(([label, value, color]) => (
            <div key={label as string} className="card">
              <p className="text-sm text-slate-500">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{money(value as number)}</p>
            </div>
          ))}
        </div>

        <button type="button" className="btn-light" onClick={() => setShowDetail((value) => !value)}>
          {showDetail ? "Hide detail" : "Show detail"}
        </button>

        {showDetail && (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  {[
                    "Month",
                    "Chalan #",
                    "Admission",
                    "Annual charges",
                    "Amount",
                    "Paid",
                    "Balance",
                    "Status",
                    "Voucher",
                  ].map((heading) => <th key={heading} className="th">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {fees.map((fee: any) => {
                  const feeBalance = Math.max(0, (Number(fee.amount) || 0) - (Number(fee.paid) || 0));
                  const status = feeStatus(fee);
                  return (
                    <tr key={fee._id} className="border-t">
                      <td className="td whitespace-nowrap">{fee.month === "0000-00" ? "Previous pending" : fee.month}</td>
                      <td className="td whitespace-nowrap">{fee.chalanNo}</td>
                      <td className="td whitespace-nowrap">{money(fee.admissionFee)}</td>
                      <td className="td whitespace-nowrap">{money(fee.annualCharges)}</td>
                      <td className="td whitespace-nowrap">{money(fee.amount)}</td>
                      <td className="td whitespace-nowrap">{money(fee.paid)}</td>
                      <td className="td whitespace-nowrap">{money(feeBalance)}</td>
                      <td className="td">
                        <span className={`whitespace-nowrap rounded px-2 py-1 text-xs ${badge[status]}`}>
                          {status === "paid" ? "Received" : status === "partial" ? "Part received" : "Pending"}
                        </span>
                      </td>
                      <td className="td whitespace-nowrap">
                        <button
                          type="button"
                          className="icon-btn text-slate-700"
                          title="Print voucher"
                          aria-label={`Print voucher ${fee.chalanNo}`}
                          onClick={() => printChalan({ ...fee, student: fee.student?._id ? fee.student : student }, schoolInfo, accounts)}
                        >
                          <FaPrint />
                        </button>
                        <a
                          className="icon-btn text-green-700"
                          title="Download voucher image"
                          aria-label={`Download voucher ${fee.chalanNo}`}
                          href={`/api/fees/${fee._id}/image?download=1`}
                        >
                          <FaDownload />
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {!fees.length && (
                  <tr>
                    <td colSpan={9} className="td py-6 text-center text-slate-400">
                      {loading ? "Loading fee chalans…" : "No chalans yet"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function StudentLedgerDialog({
  student,
  schoolInfo,
  onClose,
}: {
  student: any;
  schoolInfo?: any;
  onClose: () => void;
}) {
  const ledger = useStudentFeeLedger(student._id);

  return (
    <Modal title={`Student Ledger - ${student.name}`} onClose={onClose} extraWide>
      <StudentFeeLedgerDetails student={student} schoolInfo={schoolInfo} {...ledger} />
    </Modal>
  );
}
