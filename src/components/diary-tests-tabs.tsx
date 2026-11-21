"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "./session";
import { classTeacherAssignment } from "@/lib/teacher-scope";

// Diary & Tests groups daily diary, test papers and test marks.
export const diaryTestsTabs: { href: string; label: string }[] = [
  { href: "/diary", label: "Daily Diary" },
  { href: "/papers", label: "Tests" },
  { href: "/teachers/marks", label: "Marks Entry" },
];

export const diaryTestsRoutes = diaryTestsTabs.map((t) => t.href);
// Pages that live inside Diary & Tests for schools / class teachers
// (kept as pages, but not repeated in the navbar)
export const diaryTestsTabRoutes = diaryTestsRoutes.filter((href) => href !== "/diary");

// The tab strip is for the school and for class teachers (they can open the
// teacher list). A plain teacher keeps the plain navbar instead.
export const seesDiaryTestsTabs = (user: any) => user?.role === "school" || !!classTeacherAssignment(user);

export default function DiaryTestsTabs() {
  const { user } = useSession();
  const pathname = usePathname();
  if (!seesDiaryTestsTabs(user)) return null; // a plain teacher keeps the plain navbar
  return (
    <nav aria-label="Diary & Tests sections" className="mb-4 border-b border-slate-200">
      <div role="tablist" className="flex gap-1 overflow-x-auto pb-0">
        {diaryTestsTabs.map((t) => {
          const active = pathname === t.href;
          const label = t.label;
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
