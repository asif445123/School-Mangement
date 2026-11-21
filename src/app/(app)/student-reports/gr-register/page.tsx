"use client";
import GrRegisterReport from "@/components/gr-register-report";

// Student Reports -> GR Register (the register view, moved from Reports).
// Entries are still added on the G.R. Register page under Enroll Students.
export default function StudentReportsGrRegisterPage() {
  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold">GR Register</h1><p className="text-sm text-slate-500">The full admission register. To add an entry, use Enroll Students &rarr; GR Register.</p></div>
      <GrRegisterReport />
    </div>
  );
}
