"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, currentMonth, money, today } from "@/lib/api";
import { useSession } from "@/components/session";
import { Row, financeSummary, useAccounting } from "@/lib/accounting";
import Modal from "@/components/modal";
import FeeReport from "@/components/fee-report";
import { BarChart, DonutChart, Legend } from "@/components/charts";

const colors = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#0891b2", "#f59e0b", "#ec4899", "#475569", "#84cc16", "#14b8a6", "#f43f5e", "#8b5cf6"];
type Item = { id: string; name: string; amount: number };

// Sum entries per account for one kind (income / expense), biggest first
function toItems(rows: Row[]): Item[] {
  const map = new Map<string, Item>();
  for (const r of rows) {
    const cur = map.get(r.id) || { id: r.id, name: r.name, amount: 0 };
    cur.amount += r.amount; map.set(r.id, cur);
  }
  return [...map.values()].sort((x, y) => y.amount - x.amount);
}

function Pie({ items, total }: { items: Item[]; total: number }) {
  let angle = -Math.PI / 2;
  const r = 100, cx = 110, cy = 110;
  return (
    <svg viewBox="0 0 220 220" className="h-48 w-48 shrink-0 sm:h-56 sm:w-56">
      {items.map((it, i) => {
        const frac = it.amount / total, a0 = angle, a1 = angle + frac * 2 * Math.PI;
        angle = a1;
        if (frac >= 0.9999) return <circle key={it.id} cx={cx} cy={cy} r={r} fill={colors[i % colors.length]} />;
        const p = (a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
        return <path key={it.id} d={`M ${cx} ${cy} L ${p(a0)} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${p(a1)} Z`} fill={colors[i % colors.length]} stroke="#fff" strokeWidth="1" />;
      })}
    </svg>
  );
}

function Breakdown({ title, items, total }: { title: string; items: Item[]; total: number }) {
  const pct = (n: number) => (total ? ((n / total) * 100).toFixed(2) : "0.00") + "%";
  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold">{title} breakdown</h3>
        {items.length ? (
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((it, i) => (
              <div key={it.id} className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200" style={{ borderTop: `3px solid ${colors[i % colors.length]}` }}>
                <p className="flex items-center gap-2 text-xs text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />{it.name}</p>
                <p className="mt-1 font-bold">{money(it.amount)}</p><p className="text-xs text-slate-400">{pct(it.amount)}</p>
              </div>
            ))}
            <div className="rounded-lg bg-slate-100 p-3 ring-1 ring-slate-200" style={{ borderTop: "3px solid #334155" }}>
              <p className="text-xs text-slate-600">Total {title}</p><p className="mt-1 font-bold">{money(total)}</p><p className="text-xs text-slate-400">100.00%</p>
            </div>
          </div>
        ) : <p className="py-6 text-center text-sm text-slate-400">No {title.toLowerCase()} entries in this period</p>}
      </div>
      {items.length > 0 && (
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold">{title} breakdown chart</h3>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Pie items={items} total={total} />
            <ul className="space-y-1 text-sm">
              {items.map((it, i) => (
                <li key={it.id} className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: colors[i % colors.length] }} />{String(i + 1).padStart(2, "0")} {it.name} <span className="text-slate-400">{pct(it.amount)}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- the day cards */

type Metric = [string, number, string]; // short letter, value, meaning

// "S 15 - D 10 - R 5" - one bold line; the R part opens the detail when asked.
function MetricCard({
  title, subtitle, metrics, onClick, active, footer, tone = "#16a34a",
}: {
  title: string; subtitle?: string; metrics: Metric[]; onClick?: () => void; active?: boolean; footer?: React.ReactNode; tone?: string;
}) {
  const body = (
    <>
      <p className="text-[13px] text-slate-500">{title}</p>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[22px] font-extrabold leading-none tracking-[0.06em] text-slate-900 sm:text-[26px]">
        {metrics.map(([letter, value, meaning], i) => (
          <span key={letter} className="whitespace-nowrap">
            <span title={meaning}>{letter} {value}</span>
            {i < metrics.length - 1 && <span className="mx-1.5 text-slate-300">-</span>}
          </span>
        ))}
      </p>
      {subtitle && <p className="mt-2 text-xs text-slate-400">{subtitle}</p>}
      {footer}
    </>
  );
  const style = { borderLeft: `5px solid ${tone}` } as React.CSSProperties;
  if (!onClick) return <div className="card" style={style}>{body}</div>;
  return (
    <button type="button" onClick={onClick} title={`${title} - click for the detail`}
      className={`card w-full text-left transition hover:bg-slate-50 hover:shadow ${active ? "ring-2 ring-blue-300" : ""}`} style={style}>
      {body}
    </button>
  );
}

function AttendanceCard({ title, totals, tone, onClick }: { title: string; totals: any; tone: string; onClick?: () => void }) {
  const hasGaps = totals.unmarked > 0;
  return (
    <MetricCard
      title={title} tone={tone}
      metrics={[["P", totals.present, "Present"], ["A", totals.absent, "Absent"], ["L", totals.leave, "Leave"]]}
      subtitle={`${totals.marked} of ${totals.total} marked · ${totals.unmarked} unmarked · ${totals.pct}% present`}
      footer={hasGaps && onClick ? <span className="mt-2 inline-block text-xs font-semibold text-blue-600 underline">See class teachers with unmarked attendance</span> : undefined}
      onClick={hasGaps ? onClick : undefined}
      active={hasGaps && Boolean(onClick)}
    />
  );
}

/* ------------------------------------------------------------------- page */

export default function DashboardPage() {
  const { user } = useSession();
  const isSchool = user.role === "school";
  const [date, setDate] = useState(today());
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [testsOpen, setTestsOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const acc = useAccounting(isSchool);
  const [from, setFrom] = useState(`${currentMonth()}-01`);
  const [to, setTo] = useState(today());

  const load = useCallback(() => {
    setError("");
    api(`/api/dashboard?date=${date}`).then(setData).catch((e: any) => { setData(null); setError(e.message); });
  }, [date]);
  useEffect(() => { load(); }, [load]);

  const t = useMemo(() => {
    const s = financeSummary(acc.entries, acc.payments, from, to); // income rows include fees received ("Fee income")
    return { ...s, income: toItems(s.income), expense: toItems(s.expense) };
  }, [acc.entries, acc.payments, from, to]);
  // Records exist but none of them falls inside the chosen period
  const emptyPeriod = !acc.loading && !acc.error && !t.incomeTotal && !t.expenseTotal && !t.receivable && !t.payable && (acc.entries.length > 0 || acc.payments.length > 0);

  const net = t.incomeTotal - t.expenseTotal;
  const cards: [string, number, string][] = [["Income", t.incomeTotal, "text-green-700"], ["Expense", t.expenseTotal, "text-red-600"], ["Net (income - expense)", net, net >= 0 ? "text-blue-700" : "text-red-600"], ["Receivable", t.receivable, "text-slate-800"], ["Payable", t.payable, "text-slate-800"]];
  const diary = data?.diary, tests = data?.tests, att = data?.attendance, strength = data?.strength;
  const dayLabel = date === today() ? "Today" : date;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Welcome, {user.name}</h1>
          <p className="text-sm text-slate-500">
            {isSchool ? "Diary, tests, attendance and strength of" : "Diary, tests and attendance of your class on"} {date === today() ? "today" : date}.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div><label className="text-xs font-semibold text-slate-500">Date</label>
            <input type="date" className="input mt-1 w-44" value={date} onChange={(e) => setDate(e.target.value || today())} />
          </div>
          {date !== today() && <button className="btn-light" onClick={() => setDate(today())}>Today</button>}
        </div>
      </div>

      {error && <div className="card text-sm text-red-600">{error}</div>}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Academic</h2>
        <div className="grid gap-3 min-[480px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <MetricCard
            title={`Diary - ${dayLabel}`} tone="#16a34a"
            metrics={[["S", diary?.total ?? 0, "S = total subjects"], ["D", diary?.submitted ?? 0, "D = diary submitted"], ["R", diary?.remaining ?? 0, "R = diary remaining"]]}
            subtitle="S = total subjects · D = diary submitted · R = diary remaining"
            footer={
              (diary?.remaining ?? 0) > 0
                ? <span className="mt-2 inline-block text-xs font-semibold text-blue-600 underline">Click to see which teachers did not submit</span>
                : diary ? <span className="mt-2 inline-block text-xs font-semibold text-green-600">All diaries submitted</span> : null
            }
            onClick={() => setDiaryOpen(true)} active={diaryOpen}
          />
          <MetricCard
            title={`Tests - ${dayLabel}`} tone="#2563eb"
            metrics={[["T", tests?.created ?? 0, "T = tests created"], ["M", tests?.totalMarks ?? 0, "M = total marks"], ["R", tests?.remainingMarks ?? 0, "R = marks remaining"]]}
            subtitle="T = tests created · M = total marks · R = marks remaining"
            footer={
              tests ? <span className="mt-2 inline-block text-xs font-semibold text-blue-600 underline">Click for the test report</span> : null
            }
            onClick={() => setTestsOpen(true)} active={testsOpen}
          />
          <AttendanceCard title={`Students Today - ${dayLabel}`} totals={att?.students || { present: 0, absent: 0, leave: 0, marked: 0, total: 0, unmarked: 0, pct: 0 }} tone="#16a34a" onClick={() => setAttendanceOpen(true)} />
          {isSchool && <AttendanceCard title={`Staff Today - ${dayLabel}`} totals={att?.staff || { present: 0, absent: 0, leave: 0, marked: 0, total: 0, unmarked: 0, pct: 0 }} tone="#16a34a" />}
        </div>
      </section>

      {isSchool && <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Fee Report</h2>
          <p className="text-sm text-slate-500">Monthly collection and pending fees.</p>
        </div>
        <FeeReport compact />
      </section>}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Report of {dayLabel}</h2>
        <div className="grid gap-3 min-[480px]:grid-cols-3 sm:gap-4">
          {(isSchool
            ? [
                ["Total teachers", strength?.teachers ?? 0, "Teacher accounts"],
                ["Other staff", strength?.otherStaff ?? 0, "Staff accounts"],
                ["Students", strength?.students ?? 0, "Active students"],
              ]
            : [
                ["Students", strength?.students ?? 0, "Active students of your class"],
                ["My class", (strength?.classes || []).map((c: any) => `${c.className}${c.section ? " " + c.section : ""}`).join(", ") || "-", "Class and section you are class teacher of"],
                ["My students here", att?.students?.total ?? 0, "Students on today's attendance list"],
              ]
          ).map(([label, value, hint]) => (
            <div key={String(label)} className="card">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-bold sm:text-2xl">{value}</p>
              <p className="mt-1 text-xs text-slate-400">{hint}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold">Students by Class</h3>
            {strength?.classes?.length ? <BarChart bars={strength.classes.map((c: any) => ({ label: `Class ${String(c.className).replace(/^(class\s*)/i, "")}`, value: c.total }))} />
              : <p className="py-8 text-center text-sm text-slate-400">No students yet</p>}
          </div>
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold">Student Attendance - {dayLabel}</h3>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <DonutChart
                centerValue={`${att?.students?.pct ?? 0}%`} centerLabel="present"
                slices={[
                  { label: "Present", value: att?.students?.present ?? 0, color: "#16a34a" },
                  { label: "Absent", value: att?.students?.absent ?? 0, color: "#dc2626" },
                  { label: "Leave", value: att?.students?.leave ?? 0, color: "#f59e0b" },
                ]}
              />
              <div className="space-y-2">
                <Legend slices={[
                  { label: "Present", value: att?.students?.present ?? 0, color: "#16a34a" },
                  { label: "Absent", value: att?.students?.absent ?? 0, color: "#dc2626" },
                  { label: "Leave", value: att?.students?.leave ?? 0, color: "#f59e0b" },
                ]} />
                <p className="text-xs text-slate-400">{att?.students?.unmarked ?? 0} students not marked</p>
                {(att?.students?.unmarked ?? 0) > 0 && (
                  <button type="button" className="text-left text-xs font-semibold text-blue-600 underline" onClick={() => setAttendanceOpen(true)}>
                    Which class teachers have not completed attendance?
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold">Diary Report - {dayLabel}</h3>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <DonutChart
                size={190} centerValue={`${diary?.submitted ?? 0}/${diary?.total ?? 0}`} centerLabel="diaries"
                slices={[
                  { label: "Diary submitted", value: diary?.submitted ?? 0, color: "#16a34a" },
                  { label: "Diary remaining", value: diary?.remaining ?? 0, color: "#f59e0b" },
                ]}
              />
              <div className="space-y-2">
                <Legend slices={[
                  { label: "Diary submitted (D)", value: diary?.submitted ?? 0, color: "#16a34a" },
                  { label: "Diary remaining (R)", value: diary?.remaining ?? 0, color: "#f59e0b" },
                ]} />
                <button type="button" className="text-xs font-semibold text-blue-600 underline" onClick={() => setDiaryOpen(true)}>Which teachers did not submit?</button>
              </div>
            </div>
          </div>
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold">Test Report - {dayLabel}</h3>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <DonutChart
                size={190} centerValue={`${tests?.enteredMarks ?? 0}/${tests?.totalMarks ?? 0}`} centerLabel="marks entered"
                slices={[
                  { label: "Marks entered", value: tests?.enteredMarks ?? 0, color: "#2563eb" },
                  { label: "Marks remaining", value: tests?.remainingMarks ?? 0, color: "#dc2626" },
                ]}
              />
              <div className="space-y-2">
                <Legend slices={[
                  { label: "Marks entered (M - R)", value: tests?.enteredMarks ?? 0, color: "#2563eb" },
                  { label: "Marks remaining (R)", value: tests?.remainingMarks ?? 0, color: "#dc2626" },
                ]} />
                <button type="button" className="text-xs font-semibold text-blue-600 underline" onClick={() => setTestsOpen(true)}>Open the test report</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isSchool && <section className="space-y-4">
        <h2 className="text-lg font-semibold">Finance</h2>
        <div className="card flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1 sm:flex-none"><label className="text-xs font-semibold text-slate-500">From</label><input type="date" className="input mt-1 w-full sm:w-44" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="min-w-0 flex-1 sm:flex-none"><label className="text-xs font-semibold text-slate-500">To</label><input type="date" className="input mt-1 w-full sm:w-44" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        {acc.error && (
          <div className="card flex flex-wrap items-center justify-between gap-3 text-sm ring-1 ring-red-200">
            <p className="text-red-600">Some finance data could not be loaded: {acc.error}. The figures below may be incomplete.</p>
            <button type="button" className="btn-light" onClick={acc.reload}>Retry</button>
          </div>
        )}
        {acc.loading && !acc.entries.length && !acc.payments.length ? (
          <div className="card py-6 text-center text-sm text-slate-400">Loading finance…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-5">
              {cards.map(([label, value, color]) => (<div key={label} className="card"><p className="text-xs uppercase text-slate-500">{label}</p><p className={`mt-1 text-lg font-bold ${color}`}>{money(value)}</p></div>))}
            </div>
            {emptyPeriod && <p className="card py-4 text-center text-sm text-slate-400">No income, expense or fee receipts were recorded between {from} and {to}. Records exist outside this period - widen the From / To dates to see them.</p>}
            <Breakdown title="Expense" items={t.expense} total={t.expenseTotal} />
            <Breakdown title="Income" items={t.income} total={t.incomeTotal} />
          </>
        )}
      </section>}

      {diaryOpen && (
        <Modal title={`Diary report - ${date}`} onClose={() => setDiaryOpen(false)} extraWide>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[["S · Total subjects", diary?.total ?? 0], ["D · Submitted", diary?.submitted ?? 0], ["R · Remaining", diary?.remaining ?? 0]].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold">{value as number}</p></div>
              ))}
            </div>
            <p className="text-sm text-slate-500">Teachers whose diary is still missing on {date}. One row per subject they teach.</p>
            <div className="table-scroll overflow-x-auto rounded-lg ring-1 ring-slate-200">
              <table className="w-full">
                <thead><tr><th className="th">#</th><th className="th">Teacher</th><th className="th">Class</th><th className="th">Section</th><th className="th">Subject</th><th className="th">Diary</th></tr></thead>
                <tbody>
                  {diary?.rows?.length ? diary.rows.map((r: any, i: number) => (
                    <tr key={`${r.teacherId}-${r.className}-${r.section}-${r.subject}-${i}`} className="border-t">
                      <td className="td text-slate-400">{i + 1}</td>
                      <td className="td font-medium">{r.teacher || "-"}</td>
                      <td className="td">{r.className}</td>
                      <td className="td">{r.section || "-"}</td>
                      <td className="td">{r.subject}</td>
                      <td className="td"><span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">Not submitted</span></td>
                    </tr>
                  )) : <tr><td colSpan={6} className="td py-8 text-center text-slate-500">{diary?.total ? "Every teacher submitted the diary of this date." : "No subject teachers are assigned yet, so there is no diary to expect."}</td></tr>}
                </tbody>
              </table>
            </div>
            {!!diary?.byTeacher?.length && (
              <div className="table-scroll overflow-x-auto rounded-lg ring-1 ring-slate-200">
                <table className="w-full">
                  <thead><tr><th className="th">Teacher</th><th className="th text-center">Subjects (S)</th><th className="th text-center">Submitted (D)</th><th className="th text-center">Remaining (R)</th></tr></thead>
                  <tbody>
                    {diary.byTeacher.map((g: any) => (
                      <tr key={g.teacher} className="border-t">
                        <td className="td font-medium">{g.teacher || "-"}</td>
                        <td className="td text-center">{g.total}</td>
                        <td className="td text-center text-green-700">{g.submitted}</td>
                        <td className={`td text-center font-semibold ${g.remaining ? "text-red-600" : "text-slate-400"}`}>{g.remaining}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {testsOpen && (
        <Modal title={`Test report - ${date}`} onClose={() => setTestsOpen(false)} extraWide>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[["T · Tests created", tests?.created ?? 0], ["M · Total marks", tests?.totalMarks ?? 0], ["R · Marks remaining", tests?.remainingMarks ?? 0]].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold">{value as number}</p></div>
              ))}
            </div>
            <p className="text-sm text-slate-500">Tests created on {date}. Marks entered = the tests that already have marks, R = the marks still to be entered.</p>
            <div className="table-scroll overflow-x-auto rounded-lg ring-1 ring-slate-200">
              <table className="w-full">
                <thead><tr><th className="th">Class</th><th className="th">Section</th><th className="th">Subject</th><th className="th text-center">Tests</th><th className="th text-center">Marks entered</th><th className="th text-center">Total marks (M)</th><th className="th text-center">Remaining (R)</th></tr></thead>
                <tbody>
                  {tests?.rows?.length ? tests.rows.map((r: any, i: number) => (
                    <tr key={`${r.className}-${r.section}-${r.subject}-${i}`} className="border-t">
                      <td className="td font-medium">{r.className}</td>
                      <td className="td">{r.section || "-"}</td>
                      <td className="td">{r.subject}</td>
                      <td className="td text-center">{r.tests} <span className="text-xs text-slate-400">({r.entered} marked)</span></td>
                      <td className="td text-center">{r.enteredMarks}</td>
                      <td className="td text-center">{r.totalMarks}</td>
                      <td className={`td text-center font-semibold ${r.remainingMarks ? "text-red-600" : "text-slate-400"}`}>{r.remainingMarks}</td>
                    </tr>
                  )) : <tr><td colSpan={7} className="td py-8 text-center text-slate-500">No tests were created on this date.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {attendanceOpen && (
        <Modal title={`Attendance follow-up - ${date}`} onClose={() => setAttendanceOpen(false)} extraWide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
              {[
                ["Students not marked", att?.students?.unmarked ?? 0],
                ["Classes to follow up", att?.gaps?.length ?? 0],
                ["Attendance marked", `${att?.students?.marked ?? 0} / ${att?.students?.total ?? 0}`],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500">Classes below still have students without an attendance entry for {date}. Teacher names are the assigned class teachers; the attendance register does not record which staff account clicked Save.</p>
            <div className="table-scroll overflow-x-auto rounded-lg ring-1 ring-slate-200">
              <table className="w-full min-w-[620px]">
                <thead><tr><th className="th">#</th><th className="th">Class</th><th className="th">Section</th><th className="th">Assigned class teacher(s)</th><th className="th text-center">Marked</th><th className="th text-center">Not marked</th></tr></thead>
                <tbody>
                  {att?.gaps?.length ? att.gaps.map((row: any, i: number) => (
                    <tr key={`${row.className}-${row.section}`} className="border-t">
                      <td className="td text-slate-400">{i + 1}</td>
                      <td className="td font-medium">{row.className || "-"}</td>
                      <td className="td">{row.section || "-"}</td>
                      <td className="td">{row.teachers?.length ? row.teachers.map((teacher: any) => teacher.name).join(", ") : <span className="text-slate-400">No class teacher assigned</span>}</td>
                      <td className="td text-center">{row.marked} / {row.total}</td>
                      <td className="td text-center font-semibold text-red-600">{row.unmarked}</td>
                    </tr>
                  )) : <tr><td colSpan={6} className="td py-8 text-center text-slate-500">All students in your attendance scope are marked for this date.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
