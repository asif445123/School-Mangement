"use client";
import FeeMonthReport from "@/components/fee-month-report";

// Month wise fee receivable detail (also available as a tab inside Reports)
export default function FeeReceivablePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Month Wise Fee Receivable</h1>
      <FeeMonthReport />
    </div>
  );
}
