"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "./session";

// Student Data is one page with tabs: the student list, the G.R. Register, the
// Fee Chalan page and the Fee Receivable report (same tab style as Fee Management).
export const studentDataTabs: { href: string; label: string; schoolOnly?: boolean }[] = [
  { href: "/students", label: "Student Data" },
  { href: "/gr-register", label: "GR Register", schoolOnly: true },
  { href: "/fees", label: "Fee Chalan", schoolOnly: true },
  { href: "/fee-receivable", label: "Fee Receivable", schoolOnly: true },
];

export const studentDataRoutes = studentDataTabs.map((t) => t.href);

export default function StudentTabs() {
  const { user } = useSession();
  const pathname = usePathname();
  const isSchool = user.role === "school";
  const shown = studentDataTabs.filter((t) => !t.schoolOnly || isSchool);
  if (shown.length < 2) return null; // a teacher only has the student list, so no tab strip
  return (
    <nav aria-label="Student Data sections" className="mb-4 border-b border-slate-200">
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
