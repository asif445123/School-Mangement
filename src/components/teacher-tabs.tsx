"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "./session";
import { classTeacherAssignment } from "@/lib/teacher-scope";

// Teacher Data is one page with tabs: the teacher list, Daily Diary, Papers,
// Marks and the timetable (same tab style as Student Data / Fee Management).
export const teacherDataTabs: { href: string; label: string; teacherLabel?: string }[] = [
  { href: "/teachers", label: "Teacher Data" },
  { href: "/diary", label: "Daily Diary" },
  { href: "/papers", label: "Papers" },
  { href: "/marks", label: "Marks" },
  { href: "/timetable", label: "Set Timetable", teacherLabel: "Timetable" },
];

export const teacherDataRoutes = teacherDataTabs.map((t) => t.href);
// Pages that live inside Teacher Data as tabs for the school / class teachers
// (kept as pages, but not repeated in the navbar)
export const teacherTabRoutes = teacherDataRoutes.filter((href) => href !== "/teachers");

// The tab strip is for the school and for class teachers (they can open the
// teacher list). A plain teacher keeps the plain navbar instead.
export const seesTeacherDataTabs = (user: any) => user?.role === "school" || !!classTeacherAssignment(user);

export default function TeacherTabs() {
  const { user } = useSession();
  const pathname = usePathname();
  if (!seesTeacherDataTabs(user)) return null; // a plain teacher keeps the plain navbar
  const isSchool = user.role === "school";
  return (
    <nav aria-label="Teacher Data sections" className="mb-4 border-b border-slate-200">
      <div role="tablist" className="flex gap-1 overflow-x-auto pb-0">
        {teacherDataTabs.map((t) => {
          const active = pathname === t.href;
          const label = !isSchool && t.teacherLabel ? t.teacherLabel : t.label;
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
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
