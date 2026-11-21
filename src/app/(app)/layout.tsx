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
import DiaryTestsTabs, { diaryTestsRoutes, diaryTestsTabRoutes, seesDiaryTestsTabs } from "@/components/diary-tests-tabs";
import ExpenseTabs, { expenseRoutes, expenseTabRoutes } from "@/components/expense-tabs";
import ResultsTabs, { resultsRoutes, resultsTabOnly } from "@/components/results-tabs";
import StudentReportsTabs, { studentReportsRoutes, studentReportsTabRoutes } from "@/components/student-reports-tabs";
import InventoryTabs, { inventoryRoutes, inventoryTabRoutes } from "@/components/inventory-tabs";
import TeachersTabs, { schoolTimetableTabRoutes, teachersTabRoutes } from "@/components/teachers-tabs";
import FeeManagementTabs, { feeManagementRoutes, feeManagementTabRoutes } from "@/components/fee-management-tabs";

const settingsPages = ["/settings", "/payment-accounts", "/whatsapp-settings"];
const all: [string, string, string[]][] = [
  // The dashboard is the school admin's home page; a class teacher opens the
  // same report for his own classes (Diary S / D / R, tests T / M / R, attendance).
  ["/dashboard", "Dashboard", ["school", "classTeacher"]],
  ["/students", "Enroll Students", ["school", "teacher"]], // a teacher sees only the classes and sections he teaches
  ["/fees", "Fee Management", ["school"]],
  ["/attendance", "Student Attendance", ["school", "classTeacher"]], // a class teacher marks attendance of his own class only
  // G.R. Register remains a tab beside Enroll Students. The old Fee Receivable
  // route stays available for existing bookmarks but is not repeated in the menu.
  ["/gr-register", "GR Register", ["school"]],
  ["/fee-receivable", "Fee Receivable", ["school"]],
  // Diary, Tests and test marks are tabs inside Diary & Tests
  // for schools and class teachers. Other teachers keep their own menu links.
  ["/diary", "Diary & Tests", ["school", "classTeacher"]],
  ["/diary", "Daily Diary", ["teacher"]],
  ["/papers", "Tests", ["school", "teacher"]],
  ["/teachers/marks", "Test Marks Entry", ["school", "teacher"]],
  ["/marks", "Marks Entry", ["school", "teacher"]],
  // Exams and Results are their own navbar items (Exams works like the Tests tab).
  ["/exams", "Exams & Results", ["school", "teacher"]],
  ["/results", "Results", ["school", "teacher"]],
  // Student Promotion is a tab inside Results, so it keeps working as a page
  // but is not repeated in the navbar.
  ["/results/promotion", "Results", ["school"]],
  // Student Reports is its own navbar item, right below Exams & Results: Fee
  // Report, Month Wise Fee Receivable, GR Register, Test Report and Exams
  // Report are its tabs (all moved out of the old Reports page).
  ["/student-reports", "Student Reports", ["school", "teacher"]],
  ["/teachers", "Teachers & Staff", ["classTeacher"]], // first match wins, so this must come before the school's own label
  ["/teachers", "Teachers & time table", ["school"]], // Set Timetable is a tab inside this page
  ["/staff-attendance", "Staff Attendance", ["school"]],
  ["/payroll", "Payroll & Salary", ["school"]],
  ["/timetable", "Set Timetable", ["school"]], // a tab inside Teachers & time table (not in the navbar)
  ["/timetable", "Timetable", ["teacher"]],
  // Account Types, Account Master and Chart of Accounts are tabs inside Enter Expenses,
  // so they keep working as pages but are not repeated in the navbar.
  ["/account-types", "Account Types", ["school"]],
  ["/accounts", "Account Master", ["school"]],
  ["/entries", "Enter Expenses", ["school"]],
  ["/chart-of-accounts", "Chart of Accounts", ["school"]],
  // Accounts Reports holds only the accounting reports now (fee and result
  // reports moved to Student Reports).
  ["/reports", "Accounts Reports", ["school"]],
  // Inventory & Purchases is one page with six tabs (items, requisitions,
  // purchase invoices, stock in / out, suppliers and the supplier ledger).
  ["/inventory", "Inventory & Purchases", ["school"]],
  ["/settings", "Settings", ["school", "teacher", "student", "admin"]],
  ["/payment-accounts", "Payment accounts", ["school"]],
  ["/whatsapp-settings", "WhatsApp settings", ["school"]],
  ["/users", "Schools", ["admin"]],
  ["/my", "My Portal", ["student"]],
];
// Pages that are shown beside Enroll Students (or retained only as a legacy
// direct route) instead of having their own navbar item.
const tabOnly = new Set(["/gr-register", "/fee-receivable"]);
// Pages shown under the Fee Management sidebar item.
const feeTabOnly = new Set(feeManagementTabRoutes);
// Pages shown as tabs inside Diary & Tests instead of their own navbar item
const diaryTestsTabOnly = new Set(diaryTestsTabRoutes);
// Pages that are shown as tabs inside Enter Expenses instead of their own navbar item
const expenseTabOnly = new Set(expenseTabRoutes);
// Pages that are shown as tabs inside Results instead of their own navbar item
const resultsTabOnlySet = new Set(resultsTabOnly);
// Pages that are shown as tabs inside Student Reports instead of their own navbar item
const studentReportsTabOnly = new Set(studentReportsTabRoutes);
// Pages that are shown as tabs inside Inventory & Purchases instead of their own navbar item
const inventoryTabOnly = new Set(inventoryTabRoutes);
// Pages that are shown as tabs inside Teachers & time table (school admin only)
const teachersTabOnly = new Set(schoolTimetableTabRoutes);
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
  // Schools / class teachers use the grouped Diary & Tests navigation.
  const diaryTestsTabs = user ? seesDiaryTestsTabs(user) : false;
  const nav = allowed.filter(([href]) => !settingsPages.slice(1).includes(href) && !tabOnly.has(href) && !feeTabOnly.has(href) && !expenseTabOnly.has(href) && !resultsTabOnlySet.has(href) && !studentReportsTabOnly.has(href) && !inventoryTabOnly.has(href) && !(diaryTestsTabs && diaryTestsTabOnly.has(href)) && !(user?.role === "school" && teachersTabOnly.has(href)));
  // A tab page belongs to its own navbar item (Fee Management, Inventory &
  // Purchases and the other grouped pages keep the group's menu item/heading).
  const menuItem = (path: string) => allowed.find(([href]) =>
    (diaryTestsTabs && href === "/diary" && diaryTestsRoutes.includes(path)) ||
    href === path ||
    (href === "/fees" && feeTabOnly.has(path)) ||
    (href === "/inventory" && inventoryTabOnly.has(path)) ||
    (href === "/student-reports" && studentReportsTabOnly.has(path)) ||
    (href === "/teachers" && user?.role === "school" && teachersTabOnly.has(path)));
  useEffect(() => { // keep each role inside its own pages
    if (user && !menuItem(pathname)) router.replace(landing(user));
  }, [user, pathname]); // eslint-disable-line

  if (!user) return <p className="p-10 text-center text-slate-500">Loading...</p>;

  const schoolTitle = user.schoolInfo?.name || user.schoolName || (user.role === "school" ? user.name : "School Management");
  const currentTitle = menuItem(pathname)?.[1] || "Dashboard";

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
                pathname === href || (href === "/settings" && settingsPages.includes(pathname)) ||
                (href === "/students" && tabOnly.has(pathname)) ||
                (href === "/fees" && feeTabOnly.has(pathname)) ||
                (diaryTestsTabs && href === "/diary" && diaryTestsTabOnly.has(pathname)) ||
                (href === "/entries" && expenseTabOnly.has(pathname)) ||
                (href === "/exams" && resultsTabOnlySet.has(pathname)) ||
                (href === "/student-reports" && studentReportsTabOnly.has(pathname)) ||
                (href === "/inventory" && inventoryTabOnly.has(pathname)) ||
                (href === "/teachers" && user?.role === "school" && teachersTabOnly.has(pathname));
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
            {settingsPages.includes(pathname) && <nav aria-label="Settings sections" className="mb-4 flex flex-wrap gap-1 border-b">
              {allowed.filter(([href]) => settingsPages.includes(href)).map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`rounded-t-lg px-3 py-2 font-medium ${pathname === href ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-white"}`}>
                {href === "/settings" ? (user.role === "school" ? "School Info" : "Account Info") : label}
              </Link>)}
            </nav>}
            {studentDataRoutes.includes(pathname) && <StudentTabs />}
            {feeManagementRoutes.includes(pathname) && <FeeManagementTabs />}
            {diaryTestsRoutes.includes(pathname) && <DiaryTestsTabs />}
            {expenseRoutes.includes(pathname) && <ExpenseTabs />}
            {resultsRoutes.includes(pathname) && <ResultsTabs />}
            {studentReportsRoutes.includes(pathname) && <StudentReportsTabs />}
            {inventoryRoutes.includes(pathname) && <InventoryTabs />}
            {teachersTabRoutes.includes(pathname) && <TeachersTabs />}
            {children}
          </main>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
