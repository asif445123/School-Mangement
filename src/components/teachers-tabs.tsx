"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "./session";

// Teachers & time table is one menu item for the school admin with two tabs:
// the teacher / staff list and the Set Timetable page (same tab style as the other tab strips).
export const teachersTabs: { href: string; label: string }[] = [
  { href: "/teachers", label: "Teachers & Staff" },
  { href: "/timetable", label: "Set Timetable" },
];

export const teachersTabRoutes = teachersTabs.map((t) => t.href);
// Set Timetable lives inside Teachers & time table as a tab, so it is not repeated in the navbar for the school
export const schoolTimetableTabRoutes = ["/timetable"];

export default function TeachersTabs() {
  const { user } = useSession();
  const pathname = usePathname();
  if (user.role !== "school") return null;
  return (
    <nav aria-label="Teachers and time table sections" className="mb-4 border-b border-slate-200">
      <div role="tablist" className="flex gap-1 overflow-x-auto pb-0">
        {teachersTabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              role="tab"
              aria-selected={active}
              className={`-mb-px flex min-h-[40px] items-center whitespace-nowrap rounded-t-lg px-3 py-2 text-[13px] font-medium sm:text-sm ${
                active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
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
