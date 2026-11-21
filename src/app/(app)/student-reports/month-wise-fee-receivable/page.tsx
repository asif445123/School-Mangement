"use client";
import FeeMonthReport from "@/components/fee-month-report";

// Student Reports -> Month Wise Fee Receivable (moved from Reports).
export default function MonthWiseFeeReceivablePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Month Wise Fee Receivable</h1>
      <FeeMonthReport />
    </div>
  );
}
