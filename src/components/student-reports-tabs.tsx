"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "./session";

// Student Reports is one page with tabs: Fee Report, Month Wise Fee
// Receivable, GR Register, Test Report and Exams Report. The last two are
// the old "Result report" tab from Reports, split by paper kind (test papers
// vs exam papers). Same tab style as Enroll Students / Enter Expenses.
export const studentReportsTabs: { href: string; label: string; schoolOnly?: boolean }[] = [
  { href: "/student-reports", label: "Fee Report", schoolOnly: true },
  { href: "/student-reports/month-wise-fee-receivable", label: "Month Wise Fee Receivable", schoolOnly: true },
  { href: "/student-reports/gr-register", label: "GR Register", schoolOnly: true },
  { href: "/student-reports/test-report", label: "Test Report" },
  { href: "/student-reports/exams-report", label: "Exams Report" },
];

export const studentReportsRoutes = studentReportsTabs.map((t) => t.href);
// Pages that live inside Student Reports as tabs (kept as pages, but not
// repeated in the navbar)
export const studentReportsTabRoutes = studentReportsRoutes.filter((href) => href !== "/student-reports");

export default function StudentReportsTabs() {
  const { user } = useSession();
  const pathname = usePathname();
  const isSchool = user.role === "school";
  const shown = studentReportsTabs.filter((t) => !t.schoolOnly || isSchool);
  if (shown.length < 2) return null;
  return (
    <nav aria-label="Student Reports sections" className="mb-4 border-b border-slate-200">
      <div role="tablist" className="flex gap-1 overflow-x-auto pb-0">
        {shown.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              role="tab"
              aria-selected={active}
              className={`-mb-px flex min-h-[40px] items-center whitespace-nowrap rounded-t-lg px-3 py-2 text-[13px] font-medium sm:text-sm ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
