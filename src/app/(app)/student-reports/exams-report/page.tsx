"use client";
import ResultReport from "@/components/result-report";

// Student Reports -> Exams Report (half of the old Result report tab).
export default function ExamsReportPage() {
  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold">Exams Report</h1><p className="text-sm text-slate-500">Result of one exam paper: position, percentage and grade of every student.</p></div>
      <ResultReport type="exam" />
    </div>
  );
}
