"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FaTimes } from "react-icons/fa";
import { api } from "@/lib/api";
import { classTeacherAssignment } from "@/lib/teacher-scope";
import Header from "@/components/header";
import { NavIcon } from "@/components/nav-icons";
import { SessionContext } from "@/components/session";
import StudentTabs, { studentDataRoutes } from "@/components/student-tabs";
import TeacherTabs, { teacherDataRoutes, teacherTabRoutes, seesTeacherDataTabs } from "@/components/teacher-tabs";
import ExpenseTabs, { expenseRoutes, expenseTabRoutes } from "@/components/expense-tabs";

const all: [string, string, string[]][] = [
  ["/dashboard", "Dashboard", ["school"]],
  ["/students", "Student Data", ["school", "teacher"]], // a teacher sees only the classes and sections he teaches
  ["/attendance", "Student Attendance", ["school", "classTeacher"]], // a class teacher marks attendance of his own class only
  // G.R. Register, Fee Chalan and Fee Receivable are tabs inside Student Data,
  // so they keep working as pages but are not repeated in the navbar.
  ["/gr-register", "GR Register", ["school"]],
  ["/fees", "Fee Chalan", ["school"]],
  ["/fee-receivable", "Fee Receivable", ["school"]],
  // Daily Diary, Papers, Marks and the timetable are tabs inside Teacher Data,
  // so they keep working as pages but are not repeated in the navbar.
  ["/diary", "Daily Diary", ["school", "teacher"]],
  ["/papers", "Papers", ["school", "teacher"]],
  ["/marks", "Marks", ["school", "teacher"]],
  ["/teachers", "Teacher Data", ["classTeacher"]], // first match wins, so this must come before the school's own label
  ["/teachers", "Teacher Data", ["school"]],
  ["/staff-attendance", "Staff Attendance", ["school"]],
  ["/timetable", "Set Timetable", ["school"]],
  ["/timetable", "Timetable", ["teacher"]],
  // Account Types and Account Master are tabs inside Enter Expenses,
  // so they keep working as pages but are not repeated in the navbar.
  ["/account-types", "Account Types", ["school"]],
  ["/accounts", "Account Master", ["school"]],
  ["/entries", "Enter Expenses", ["school"]],
  ["/reports", "Reports", ["school"]],
  ["/payment-accounts", "Payment accounts", ["school"]],
  ["/whatsapp-settings", "WhatsApp settings", ["school"]],
  ["/users", "Schools", ["admin"]],
  ["/my", "My Portal", ["student"]],
];
// Pages that are shown as tabs inside Student Data instead of their own navbar item
const tabOnly = new Set(["/gr-register", "/fees", "/fee-receivable"]);
// Pages that are shown as tabs inside Teacher Data instead of their own navbar item
const teacherTabOnly = new Set(teacherTabRoutes);
// Pages that are shown as tabs inside Enter Expenses instead of their own navbar item
const expenseTabOnly = new Set(expenseTabRoutes);
const home: any = { admin: "/users", school: "/dashboard", teacher: "/students", student: "/my" };
// Where a role starts: every teacher now lands on Students, which opens on his own class.
const landing = (u: any) => home[u?.role];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { api("/api/auth/me").then((d) => setUser(d.user)).catch(() => router.replace("/login")); }, [router]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const keys = user ? [user.role, ...(classTeacherAssignment(user) ? ["classTeacher"] : [])] : [];
  const allowed = user ? all.filter(([, , roles]) => roles.some((r) => keys.includes(r)))
    .filter(([href], index, rows) => rows.findIndex(([other]) => other === href) === index) : [];
  // school / class teachers see Daily Diary, Papers, Marks and the timetable as
  // tabs inside Teacher Data, so those navbar items are replaced by the tab strip
  const teacherTabs = user ? seesTeacherDataTabs(user) : false;
  const nav = allowed.filter(([href]) => !tabOnly.has(href) && !expenseTabOnly.has(href) && !(teacherTabs && teacherTabOnly.has(href)));
  useEffect(() => { // keep each role inside its own pages
    if (user && !allowed.some(([href]) => href === pathname)) router.replace(landing(user));
  }, [user, pathname]); // eslint-disable-line

  if (!user) return <p className="p-10 text-center text-slate-500">Loading...</p>;

  const schoolTitle = user.schoolInfo?.name || user.schoolName || (user.role === "school" ? user.name : "School Management");
  const currentTitle = allowed.find(([href]) => href === pathname)?.[1] || "Dashboard";

  return (
    <SessionContext.Provider value={{ user, setUser }}>
      <div className="flex min-h-screen bg-slate-100">
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/50 md:hidden print:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-60 max-w-[82vw] flex-col bg-[#0f172a] text-slate-100 transition-transform duration-200 print:hidden md:sticky md:top-0 md:z-20 md:h-screen md:w-56 md:shrink-0 md:translate-x-0 ${
            mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              {user.schoolInfo?.logo && (
                <img src={user.schoolInfo.logo} alt="" className="h-8 w-8 shrink-0 rounded bg-white object-contain p-0.5" />
              )}
              <span className="break-words text-[15px] font-bold leading-snug text-white">{schoolTitle}</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            >
              <FaTimes />
            </button>
          </div>

          <nav aria-label="Main menu" className="flex-1 space-y-0.5 overflow-y-auto py-2 [scrollbar-width:thin]">
            {nav.map(([href, label]) => {
              const active =
                pathname === href ||
                (href === "/students" && tabOnly.has(pathname)) ||
                (href === "/teachers" && teacherTabOnly.has(pathname)) ||
                (href === "/entries" && expenseTabOnly.has(pathname));
              return (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex min-h-[40px] items-center gap-3 px-4 py-2.5 text-[13.5px] transition-colors ${
                    active
                      ? "bg-blue-600 font-semibold text-white"
                      : "font-medium text-slate-200 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <NavIcon href={href} />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <Header title={currentTitle} onOpenMenu={() => setMobileOpen(true)} />
          <main className="w-full flex-1 px-2.5 py-3 pb-24 sm:px-3.5 sm:py-3.5 sm:pb-10">
            {studentDataRoutes.includes(pathname) && <StudentTabs />}
            {teacherDataRoutes.includes(pathname) && <TeacherTabs />}
            {expenseRoutes.includes(pathname) && <ExpenseTabs />}
            {children}
          </main>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
