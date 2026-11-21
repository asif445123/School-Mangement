"use client";
import ResultReport from "@/components/result-report";

// Student Reports -> Test Report (half of the old Result report tab).
export default function TestReportPage() {
  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold">Test Report</h1><p className="text-sm text-slate-500">Result of one test paper: position, percentage and grade of every student.</p></div>
      <ResultReport type="test" />
    </div>
  );
}
