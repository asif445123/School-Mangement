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

const feeStatus = (f: any) => (f.amount - f.paid <= 0 ? "paid" : f.paid > 0 ? "partial" : "unpaid");

export default function StudentLedgerDialog({
  student,
  schoolInfo,
  onClose,
}: {
  student: any;
  schoolInfo?: any;
  onClose: () => void;
}) {
  const [fees, setFees] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api(`/api/fees?student=${encodeURIComponent(student._id)}`),
      api("/api/payment-accounts"),
    ])
      .then(([f, a]) => {
        if (!active) return;
        const sorted = [...(f.items || [])].sort((x: any, y: any) => String(y.month || "").localeCompare(String(x.month || "")));
        setFees(sorted);
        setAccounts((a.items || []).filter((x: any) => x.active));
      })
      .catch((e: any) => {
        if (active) toast("error", e.message || "Could not load student ledger");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [student._id]);

  const { total, paid, balance } = useMemo(() => {
    const totalAmount = fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const paidAmount = fees.reduce((sum, f) => sum + (Number(f.paid) || 0), 0);
    return { total: totalAmount, paid: paidAmount, balance: totalAmount - paidAmount };
  }, [fees]);

  const subtitle = [
    student.rollNo ? `Roll # ${student.rollNo}` : "",
    studentClassSection(student) !== "-" ? `Class ${studentClassSection(student)}` : "",
    student.fatherName ? `Father: ${student.fatherName}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Modal title={`Student Ledger - ${student.name}`} onClose={onClose} extraWide>
      <div className="space-y-4">
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}

        <section className="space-y-3">
          <h3 className="font-semibold text-slate-800">Fee chalan summary</h3>
          <div className="grid gap-4 sm:grid-cols-3">
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

          <button type="button" className="btn-light" onClick={() => setShowDetail((v) => !v)}>
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
                    ].map((h) => (
                      <th key={h} className="th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fees.map((f: any) => {
                    const bal = (Number(f.amount) || 0) - (Number(f.paid) || 0);
                    const st = feeStatus(f);
                    return (
                      <tr key={f._id} className="border-t">
                        <td className="td whitespace-nowrap">{f.month === "0000-00" ? "Previous pending" : f.month}</td>
                        <td className="td whitespace-nowrap">{f.chalanNo}</td>
                        <td className="td whitespace-nowrap">{money(f.admissionFee)}</td>
                        <td className="td whitespace-nowrap">{money(f.annualCharges)}</td>
                        <td className="td whitespace-nowrap">{money(f.amount)}</td>
                        <td className="td whitespace-nowrap">{money(f.paid)}</td>
                        <td className="td whitespace-nowrap">{money(bal)}</td>
                        <td className="td">
                          <span className={`whitespace-nowrap rounded px-2 py-1 text-xs ${badge[st]}`}>
                            {st === "paid" ? "Received" : st === "partial" ? "Part received" : "Pending"}
                          </span>
                        </td>
                        <td className="td whitespace-nowrap">
                          <button
                            type="button"
                            className="icon-btn text-slate-700"
                            title="Print voucher"
                            onClick={() => printChalan({ ...f, student: f.student?._id ? f.student : student }, schoolInfo, accounts)}
                          >
                            <FaPrint />
                          </button>
                          <a
                            className="icon-btn text-green-700"
                            title="Download voucher image"
                            href={`/api/fees/${f._id}/image?download=1`}
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
    </Modal>
  );
}
