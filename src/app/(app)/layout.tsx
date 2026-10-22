"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { classTeacherAssignment } from "@/lib/teacher-scope";
import Header from "@/components/header";
import { SessionContext } from "@/components/session";

const all: [string, string, string[]][] = [
  ["/dashboard", "Dashboard", ["school"]],
  ["/students", "Students", ["school", "teacher"]],
  ["/gr-register", "GR Register", ["school"]],
  ["/fees", "Fee Chalan", ["school"]],
  ["/fee-receivable", "Fee Receivable", ["school"]],
  ["/diary", "Daily Diary", ["school", "teacher"]],
  ["/papers", "Papers", ["school", "teacher"]],
  ["/marks", "Marks", ["school", "teacher"]],
  ["/teachers", "Teachers", ["school"]],
  ["/teachers", "Subject Teachers", ["classTeacher"]],
  ["/timetable", "Set Timetable", ["school"]],
  ["/timetable", "Timetable", ["teacher"]],
  ["/account-types", "Account Types", ["school"]],
  ["/accounts", "Account Master", ["school"]],
  ["/entries", "Entries", ["school"]],
  ["/reports", "Reports", ["school"]],
  ["/users", "Schools", ["admin"]],
  ["/my", "My Portal", ["student"]],
];
const home: any = { admin: "/users", school: "/dashboard", teacher: "/students", student: "/my" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  useEffect(() => { api("/api/auth/me").then((d) => setUser(d.user)).catch(() => router.replace("/login")); }, [router]);

  const keys = user ? [user.role, ...(classTeacherAssignment(user) ? ["classTeacher"] : [])] : [];
  const nav = user ? all.filter(([, , roles]) => roles.some((r) => keys.includes(r)))
    .filter(([href], index, rows) => rows.findIndex(([other]) => other === href) === index) : [];
  useEffect(() => { // keep each role inside its own pages
    if (user && !nav.some(([href]) => href === pathname)) router.replace(home[user.role]);
  }, [user, pathname]); // eslint-disable-line

  if (!user) return <p className="p-10 text-center text-slate-500">Loading...</p>;
  return (
    <SessionContext.Provider value={{ user, setUser }}>
      <Header />
      <nav className="flex gap-1 overflow-x-auto bg-white px-3 py-2 shadow-sm">
        {nav.map(([href, label]) => (
          <Link key={label} href={href} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${pathname === href ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</Link>
        ))}
      </nav>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </SessionContext.Provider>
  );
}
