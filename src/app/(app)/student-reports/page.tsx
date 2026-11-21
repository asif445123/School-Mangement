"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FeeReport from "@/components/fee-report";
import { useSession } from "@/components/session";

// Student Reports -> Fee Report (moved from Reports). A teacher has no fee
// access, so he is sent to the Test Report instead.
export default function StudentReportsPage() {
  const { user } = useSession();
  const router = useRouter();
  useEffect(() => { if (user.role === "teacher") router.replace("/student-reports/test-report"); }, [user, router]);
  if (user.role !== "school") return <p className="text-slate-500">Loading...</p>;
  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold">Fee Report</h1><p className="text-sm text-slate-500">Fees received and pending for the selected month.</p></div>
      <FeeReport />
    </div>
  );
}
