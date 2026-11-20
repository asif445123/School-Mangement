"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "./session";

// Results is one page with tabs: the Result & Card report and the Student
// Promotion tool (school admin only - promoting changes a student's class).
export const resultsTabs: { href: string; label: string; schoolOnly?: boolean }[] = [
  { href: "/results", label: "Result & Card" },
  { href: "/results/promotion", label: "Student Promotion", schoolOnly: true },
];

export const resultsRoutes = resultsTabs.map((t) => t.href);
// Pages that live inside Results as tabs (kept as pages, but not repeated in the navbar)
export const resultsTabOnly = resultsRoutes.filter((href) => href !== "/results");

export default function ResultsTabs() {
  const { user } = useSession();
  const pathname = usePathname();
  const shown = resultsTabs.filter((t) => !t.schoolOnly || user.role === "school");
  if (shown.length < 2) return null; // a teacher only has Result & Card, so no tab strip
  return (
    <nav aria-label="Results sections" className="mb-4 border-b border-slate-200">
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
