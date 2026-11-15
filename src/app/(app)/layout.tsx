"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { classTeacherAssignment } from "@/lib/teacher-scope";
import Header from "@/components/header";
import { SessionContext } from "@/components/session";
import StudentTabs, { studentDataRoutes } from "@/components/student-tabs";
import TeacherTabs, { teacherDataRoutes, teacherTabRoutes, seesTeacherDataTabs } from "@/components/teacher-tabs";

const all: [string, string, string[]][] = [
  ["/dashboard", "Dashboard", ["school"]],
  ["/students", "Student Data", ["school", "teacher"]], // a teacher sees only the classes and sections he teaches
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
  ["/timetable", "Set Timetable", ["school"]],
  ["/timetable", "Timetable", ["teacher"]],
  ["/account-types", "Account Types", ["school"]],
  ["/accounts", "Account Master", ["school"]],
  ["/entries", "Entries", ["school"]],
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
const home: any = { admin: "/users", school: "/dashboard", teacher: "/students", student: "/my" };
// Where a role starts: every teacher now lands on Students, which opens on his own class.
const landing = (u: any) => home[u?.role];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  useEffect(() => { api("/api/auth/me").then((d) => setUser(d.user)).catch(() => router.replace("/login")); }, [router]);

  const keys = user ? [user.role, ...(classTeacherAssignment(user) ? ["classTeacher"] : [])] : [];
  const allowed = user ? all.filter(([, , roles]) => roles.some((r) => keys.includes(r)))
    .filter(([href], index, rows) => rows.findIndex(([other]) => other === href) === index) : [];
  // school / class teachers see Daily Diary, Papers, Marks and the timetable as
  // tabs inside Teacher Data, so those navbar items are replaced by the tab strip
  const teacherTabs = user ? seesTeacherDataTabs(user) : false;
  const nav = allowed.filter(([href]) => !tabOnly.has(href) && !(teacherTabs && teacherTabOnly.has(href)));
  useEffect(() => { // keep each role inside its own pages
    if (user && !allowed.some(([href]) => href === pathname)) router.replace(landing(user));
  }, [user, pathname]); // eslint-disable-line

  if (!user) return <p className="p-10 text-center text-slate-500">Loading...</p>;
  return (
    <SessionContext.Provider value={{ user, setUser }}>
      <Header />
      <nav aria-label="Main menu" className="flex gap-1 overflow-x-auto bg-white px-2 py-2 shadow-sm [-ms-overflow-style:none] [scrollbar-width:thin] sm:px-3">
        {nav.map(([href, label]) => (
          <Link key={label} href={href} className={`flex min-h-[38px] items-center whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium sm:text-sm ${pathname === href || (href === "/students" && tabOnly.has(pathname)) || (href === "/teachers" && teacherTabOnly.has(pathname)) ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</Link>
        ))}
      </nav>
      <main className="mx-auto w-full max-w-6xl px-3 py-4 pb-24 sm:px-4 sm:pb-10">
        {studentDataRoutes.includes(pathname) && <StudentTabs />}
        {teacherDataRoutes.includes(pathname) && <TeacherTabs />}
        {children}
      </main>
    </SessionContext.Provider>
  );
}
