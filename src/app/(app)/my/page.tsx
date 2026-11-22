"use client";
import Link from "next/link";
import { gradeOf, money, today } from "@/lib/api";
import { usePortal } from "@/components/my-portal-data";
import { examStats, StatCard, totalsOf, totalsStatus } from "@/components/my-portal";
import { childClassLine, childTitle, portalPath, portalSections } from "@/lib/portal-routes";

// What each sidebar section holds, shown on its quick-link card.
const sectionNote: Record<string, string> = {
  fees: "All fee chalans, balance due, print & download voucher",
  diary: "Class homework / notes, day by day",
  tests: "Test papers with marks obtained",
  exams: "First / Mid / Final term papers with grade",
};

// The portal overview. A child sees his own summary + links; a guardian with
// several children sees the family fee summary and one card per child. Each
// link opens ONLY its own page (/my/<childId>/fees, ...) with no other tabs
// on the page - the fee page lists all chalans of that child.
export default function MyPortalPage() {
  const { data, bundles, guardianName } = usePortal();
  const multi = bundles.length > 1;

  if (!bundles.length) return <p className="p-6 text-center text-slate-500">Your student record was not found. Please contact the school office.</p>;

  const child = bundles[0];
  const family = data.family || bundles.reduce(
    (a: any, b: any) => { const t = totalsOf(b.fees); return { total: a.total + t.total, paid: a.paid + t.paid, balance: a.balance + t.balance }; },
    { total: 0, paid: 0, balance: 0 },
  );
  const summary = multi ? family : totalsOf(child.fees);

  return (
    <div className="space-y-5">
      <div className="card text-center">
        <h1 className="text-lg font-bold sm:text-xl">{multi ? "Guardian Portal" : childTitle(child.student)}</h1>
        <p className="text-sm text-slate-600">
          {multi ? `${guardianName} · ${bundles.length} children in this school · one login for the whole family` : childClassLine(child.student)}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">{multi ? "Family fee summary (all children)" : "Fee summary"}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Total amount" value={money(summary.total)} />
          <StatCard label="Paid amount" value={money(summary.paid)} tone="text-green-700" />
          <StatCard label="Balance" value={money(summary.balance)} tone={summary.balance > 0 ? "text-red-600" : "text-green-700"} />
        </div>
      </section>

      {multi && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[600px]">
            <thead><tr>{["Child", "Class", "Total", "Paid", "Balance", "Status"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {bundles.map((b: any) => {
                const t = totalsOf(b.fees);
                const st = totalsStatus(t);
                return (
                  <tr key={b.student._id} className="border-t">
                    <td className="td font-semibold">
                      <Link className="text-blue-700 hover:underline" href={portalPath(b.student._id, "fees")}>{b.student.name}</Link>
                    </td>
                    <td className="td">{childClassLine(b.student)}</td>
                    <td className="td">{money(t.total)}</td><td className="td">{money(t.paid)}</td>
                    <td className="td font-semibold">{money(t.balance)}</td>
                    <td className="td">
                      <span className={`rounded px-2 py-1 text-xs ${st === "paid" ? "bg-green-100 text-green-700" : st === "partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {st === "paid" ? "Received" : st === "partial" ? "Part received" : "Pending"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">{multi ? "Children" : "Your reports"}</h2>
        <div className={`grid gap-4 ${multi ? "sm:grid-cols-2" : ""}`}>
          {bundles.map((b: any) => {
            const t = totalsOf(b.fees);
            const ex = examStats(b);
            const diaryToday = b.diary.filter((x: any) => x.date === today()).length;
            const testsToday = b.papers.filter((p: any) => p.date === today() && p.type === "test").length;
            return (
              <div key={b.student._id} className="card space-y-3">
                <div>
                  <p className="font-semibold">{b.student.name}</p>
                  <p className="text-sm text-slate-600">{childClassLine(b.student)}</p>
                </div>
                <div className="grid gap-1 text-sm">
                  <p>
                    Fee chalans: <b>{b.fees.length}</b> · Balance: <b className={t.balance > 0 ? "text-red-600" : "text-green-700"}>{money(t.balance)}</b>
                  </p>
                  <p>Diary today: <b>{diaryToday ? `${diaryToday} ${diaryToday === 1 ? "entry" : "entries"}` : "none yet"}</b></p>
                  <p>Tests today: <b>{testsToday || "none"}</b></p>
                  <p>Exam marks overall: <b>{ex.pct === null ? "no marks yet" : `${ex.pct.toFixed(1)}% (${gradeOf(ex.pct)})`}</b></p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {portalSections.map((s) => (
                    <Link
                      key={s.key}
                      href={portalPath(b.student._id, s.key)}
                      title={sectionNote[s.key]}
                      className="flex min-h-[42px] items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <span className="truncate">{s.label}</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          {multi
            ? "Every child has his own Fee Chalan, Daily Diary, Tests and Exams page - each link opens only its own page, with no other tabs on it."
            : "Fee Chalan, Daily Diary, Tests and Exams each open on their own page with no other tabs on it."}
        </p>
      </section>
    </div>
  );
}
