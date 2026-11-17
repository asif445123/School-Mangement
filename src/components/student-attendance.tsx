"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaPrint, FaSave, FaWhatsapp } from "react-icons/fa";
import { api, today } from "@/lib/api";
import { toast } from "@/lib/alerts";
import { useSession } from "./session";
import { printElement } from "@/lib/print";
import { studentWhatsApp, whatsappDisplay } from "@/lib/phone";
import { studentClassSection } from "@/lib/student-details";
import { attendanceStatuses, daysInMonth, monthlyCounts } from "@/lib/attendance";

type Tab = "mark" | "monthly" | "absent" | "summary";
type ClassOpt = { className: string; sections: string[] };

const label = "text-xs font-semibold text-slate-500";
const monthShort = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
};
const cellClass: Record<string, string> = {
  Present: "bg-emerald-100 text-emerald-800",
  Absent: "bg-red-100 text-red-700",
  Leave: "bg-amber-100 text-amber-800",
};
const shortOf: Record<string, string> = { Present: "P", Absent: "A", Leave: "L" };

// Student Attendance: Mark Attendance, Monthly Report and Absent List (the
// three screens of the attendance register), plus the class-wise summary
// which only the school admin sees.
export default function StudentAttendance() {
  const { user } = useSession();
  const isSchool = user.role === "school";
  const [tab, setTab] = useState<Tab>("mark");
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [absentClass, setAbsentClass] = useState(""); // "" = All classes

  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [absent, setAbsent] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [summaryByMonth, setSummaryByMonth] = useState(false); // class-wise summary for a month instead of a day
  const [saving, setSaving] = useState(false);

  const loadClasses = useCallback(async () => {
    try {
      const d = await api("/api/attendance?mode=classes");
      setClasses(d.classes || []);
    } catch (e: any) {
      toast("error", e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadClasses(); }, [loadClasses]);

  // open on the first class (a class teacher's own class) once the list arrives
  useEffect(() => {
    if (!className && classes.length) {
      setClassName(classes[0].className);
      setSection(classes[0].sections[0] || "");
    }
  }, [classes, className]);

  const classOpt = classes.find((c) => c.className === className);
  const sections = classOpt?.sections || [];
  const chosenSection = sections.find((s) => s === section) || "";

  const loadDay = useCallback(async () => {
    if (!className) return;
    try {
      const d = await api(`/api/attendance?mode=day&date=${date}&className=${encodeURIComponent(className)}&section=${encodeURIComponent(chosenSection)}`);
      setStudents(d.students || []);
      setRecords(d.records || []);
      const saved = Object.fromEntries((d.records || []).map((r: any) => [String(r.student), r.status]));
      setMarks(Object.fromEntries((d.students || []).map((s: any) => [String(s._id), saved[String(s._id)] || "Present"])));
    } catch (e: any) {
      toast("error", e.message);
    }
  }, [date, className, chosenSection]);

  const loadMonth = useCallback(async () => {
    if (!className) return;
    try {
      const d = await api(`/api/attendance?mode=month&month=${month}&className=${encodeURIComponent(className)}&section=${encodeURIComponent(chosenSection)}`);
      setStudents(d.students || []);
      setRecords(d.records || []);
    } catch (e: any) {
      toast("error", e.message);
    }
  }, [month, className, chosenSection]);

  const loadAbsent = useCallback(async () => {
    try {
      const d = await api(`/api/attendance?mode=absent&date=${date}&className=${encodeURIComponent(absentClass)}`);
      setAbsent(d.students || []);
    } catch (e: any) {
      toast("error", e.message);
    }
  }, [date, absentClass]);

  const loadSummary = useCallback(async () => {
    try {
      const d = await api(
        summaryByMonth ? `/api/attendance?mode=summary&month=${month}` : `/api/attendance?mode=summary&date=${date}`,
      );
      setSummary(d);
    } catch (e: any) {
      toast("error", e.message);
    }
  }, [date, month, summaryByMonth]);

  useEffect(() => { if (tab === "mark") loadDay(); }, [tab, loadDay]);
  useEffect(() => { if (tab === "monthly") loadMonth(); }, [tab, loadMonth]);
  useEffect(() => { if (tab === "absent") loadAbsent(); }, [tab, loadAbsent]);
  useEffect(() => { if (tab === "summary" && isSchool) loadSummary(); }, [tab, loadSummary, isSchool]);

  const setAll = (status: string) => setMarks(Object.fromEntries(students.map((s) => [String(s._id), status])));
  const markedCount = students.filter((s) => records.some((r) => String(r.student) === String(s._id))).length;

  async function save() {
    if (!students.length) return;
    setSaving(true);
    try {
      const rows = students.map((s) => ({ student: s._id, status: marks[String(s._id)] || "Present" }));
      const d = await api("/api/attendance", { method: "POST", body: { date, className, section: chosenSection, rows } });
      toast("success", `Attendance saved for ${d.saved} student${d.saved === 1 ? "" : "s"}`);
      loadDay();
    } catch (e: any) {
      toast("error", e.message);
    } finally {
      setSaving(false);
    }
  }

  const monthRows = useMemo(
    () => students.map((s) => ({ s, ...monthlyCounts(records.filter((r) => String(r.student) === String(s._id)), month) })),
    [students, records, month],
  );
  const dayCount = daysInMonth(month);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);
  const classTitle = `Class ${className}${chosenSection ? ` - ${chosenSection}` : ""}`;
  const summaryHeading = summaryByMonth ? monthShort(month) : date;

  const tabs: { key: Tab; label: string }[] = [
    { key: "mark", label: "Mark Attendance" },
    { key: "monthly", label: "Monthly Report" },
    { key: "absent", label: "Absent List" },
    ...(isSchool ? [{ key: "summary" as Tab, label: "Class Summary" }] : []),
  ];

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (!classes.length)
    return (
      <div className="card p-8 text-center text-slate-500">
        <h1 className="mb-2 text-xl font-bold text-slate-700">Student Attendance</h1>
        {isSchool ? "Add students first — attendance is marked class by class." : "No class has been assigned to you as class teacher yet. Ask your school admin to set your class."}
      </div>
    );

  return (
    <div className="space-y-4">
      <nav aria-label="Student Attendance sections" className="border-b border-slate-200">
        <div role="tablist" className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex min-h-[40px] items-center whitespace-nowrap rounded-t-lg px-3 py-2 text-[13px] font-medium sm:text-sm ${
                tab === t.key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {tab === "mark" && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-end gap-3">
            <div>
              <label className={label} htmlFor="att-date">Date</label>
              <input id="att-date" type="date" className="input mt-1 w-44" value={date} onChange={(e) => setDate(e.target.value || today())} />
            </div>
            <div>
              <label className={label} htmlFor="att-class">Class</label>
              <select id="att-class" className="input mt-1 w-36" value={className} onChange={(e) => { setClassName(e.target.value); setSection(""); }}>
                {classes.map((c) => <option key={c.className} value={c.className}>{c.className}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="att-section">Section</label>
              <select id="att-section" className="input mt-1 w-28" value={chosenSection} onChange={(e) => setSection(e.target.value)} disabled={!sections.length}>
                <option value="">{sections.length ? "All" : "No section"}</option>
                {sections.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button className="btn" onClick={loadDay}>Load</button>
            {date !== today() && <button className="btn-light" onClick={() => setDate(today())}>Today</button>}
          </div>

          <div className="card p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-2">
              <h2 className="text-base font-bold">{classTitle} ({students.length} student{students.length === 1 ? "" : "s"})</h2>
              <div className="flex flex-wrap gap-2">
                <button className="btn-light !min-h-[36px] !px-3 !py-1.5 !text-[13px]" onClick={() => setAll("Present")}>All Present</button>
                <button className="btn-light !min-h-[36px] !px-3 !py-1.5 !text-[13px]" onClick={() => setAll("Absent")}>All Absent</button>
                <button className="inline-flex min-h-[36px] items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-green-700 disabled:opacity-60" onClick={save} disabled={!students.length || saving}>
                  <FaSave /> {saving ? "Saving..." : "Save Attendance"}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th className="th w-10">#</th>
                    <th className="th">Adm</th>
                    <th className="th">Name</th>
                    <th className="th">Father</th>
                    <th className="th">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s._id} className="border-t">
                      <td className="td">{i + 1}</td>
                      <td className="td whitespace-nowrap">{s.rollNo || "-"}</td>
                      <td className="td whitespace-nowrap">{s.name}</td>
                      <td className="td whitespace-nowrap">{s.fatherName || "-"}</td>
                      <td className="td">
                        <div className="flex flex-wrap gap-x-4 gap-y-1" role="radiogroup" aria-label={`Attendance of ${s.name}`}>
                          {attendanceStatuses.map((st) => (
                            <label key={st} className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-700">
                              <input
                                type="radio"
                                name={`att-${s._id}`}
                                value={st}
                                checked={(marks[String(s._id)] || "Present") === st}
                                onChange={() => setMarks((m) => ({ ...m, [String(s._id)]: st }))}
                                className="h-4 w-4 accent-blue-600"
                              />
                              {st}
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!students.length && <tr><td colSpan={5} className="td py-8 text-center text-slate-400">No students in this class</td></tr>}
                </tbody>
              </table>
            </div>
            {students.length > 0 && (
              <p className="px-4 pb-3 text-xs text-slate-500">
                {markedCount} of {students.length} already marked for {date}. Saving updates the whole class for this date.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "monthly" && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-end gap-3">
            <div>
              <label className={label} htmlFor="att-month">Month</label>
              <input id="att-month" type="month" className="input mt-1 w-44" value={month} onChange={(e) => setMonth(e.target.value || today().slice(0, 7))} />
            </div>
            <div>
              <label className={label} htmlFor="att-mclass">Class</label>
              <select id="att-mclass" className="input mt-1 w-36" value={className} onChange={(e) => { setClassName(e.target.value); setSection(""); }}>
                {classes.map((c) => <option key={c.className} value={c.className}>{c.className}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="att-msection">Section</label>
              <select id="att-msection" className="input mt-1 w-28" value={chosenSection} onChange={(e) => setSection(e.target.value)} disabled={!sections.length}>
                <option value="">{sections.length ? "All" : "No section"}</option>
                {sections.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button className="btn" onClick={loadMonth}>Show</button>
            <button className="btn-light" onClick={() => printElement(`${classTitle} | ${monthShort(month)}`, document.getElementById("monthly-area"), user.schoolInfo, true)}><FaPrint /> Print</button>
          </div>

          <div className="card p-0">
            <h2 className="p-4 pb-2 text-base font-bold">{classTitle} | {monthShort(month)}</h2>
            <div id="monthly-area" className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr>
                    <th className="th">Name</th>
                    {days.map((d) => <th key={d} className="th !px-1 text-center">{d}</th>)}
                    <th className="th text-center">P</th>
                    <th className="th text-center">A</th>
                    <th className="th text-center">L</th>
                    <th className="th text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map(({ s, byDay, present, absent: a, leave: l, pct }) => (
                    <tr key={s._id} className="border-t">
                      <td className="td whitespace-nowrap">{s.name}</td>
                      {days.map((d) => {
                        const st = byDay.get(d);
                        return (
                          <td key={d} className={`td !px-1 text-center ${st ? cellClass[st] : ""}`} title={st ? `${st} - ${month}-${String(d).padStart(2, "0")}` : ""}>
                            {st ? shortOf[st] : ""}
                          </td>
                        );
                      })}
                      <td className="td text-center">{present}</td>
                      <td className="td text-center">{a}</td>
                      <td className="td text-center">{l}</td>
                      <td className="td text-center font-semibold">{pct}%</td>
                    </tr>
                  ))}
                  {!monthRows.length && <tr><td colSpan={dayCount + 5} className="td py-8 text-center text-slate-400">No students in this class</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "absent" && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-end gap-3">
            <div>
              <label className={label} htmlFor="abs-date">Date</label>
              <input id="abs-date" type="date" className="input mt-1 w-44" value={date} onChange={(e) => setDate(e.target.value || today())} />
            </div>
            <div>
              <label className={label} htmlFor="abs-class">Class</label>
              <select id="abs-class" className="input mt-1 w-36" value={absentClass} onChange={(e) => setAbsentClass(e.target.value)}>
                <option value="">All</option>
                {classes.map((c) => <option key={c.className} value={c.className}>{c.className}</option>)}
              </select>
            </div>
            <button className="btn" onClick={loadAbsent}>Show</button>
            <button className="btn-light" onClick={() => printElement(`Absent Students - ${date}`, document.getElementById("absent-area"), user.schoolInfo)}><FaPrint /> Print</button>
          </div>

          <div className="card p-0">
            <h2 className="p-4 pb-2 text-base font-bold">Absent Students - {date} ({absent.length})</h2>
            <div id="absent-area" className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th className="th">Adm</th>
                    <th className="th">Name</th>
                    <th className="th">Father</th>
                    <th className="th">Class</th>
                    <th className="th">Phone</th>
                    <th className="th"></th>
                  </tr>
                </thead>
                <tbody>
                  {absent.map((s) => {
                    const wa = studentWhatsApp(s);
                    const msg = `Dear parent, ${s.name} (${studentClassSection(s)}) was absent on ${date}. Please inform the school office.`;
                    return (
                      <tr key={s._id} className="border-t">
                        <td className="td whitespace-nowrap">{s.rollNo || "-"}</td>
                        <td className="td whitespace-nowrap">{s.name}</td>
                        <td className="td whitespace-nowrap">{s.fatherName || "-"}</td>
                        <td className="td whitespace-nowrap">{studentClassSection(s)}</td>
                        <td className="td whitespace-nowrap">{whatsappDisplay(s)}</td>
                        <td className="td whitespace-nowrap">
                          {wa.number ? (
                            <a
                              href={`https://wa.me/${wa.number}?text=${encodeURIComponent(msg)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1 text-[13px] font-medium text-white hover:bg-green-700"
                            >
                              <FaWhatsapp /> WhatsApp
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">No number</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!absent.length && <tr><td colSpan={6} className="td py-8 text-center text-slate-400">No absent students on this date</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "summary" && isSchool && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-end gap-3">
            <div>
              <label className={label} htmlFor="sum-period">Period</label>
              <select id="sum-period" className="input mt-1 w-32" value={summaryByMonth ? "month" : "day"} onChange={(e) => setSummaryByMonth(e.target.value === "month")}>
                <option value="day">Day</option>
                <option value="month">Month</option>
              </select>
            </div>
            {summaryByMonth ? (
              <div>
                <label className={label} htmlFor="sum-month">Month</label>
                <input id="sum-month" type="month" className="input mt-1 w-44" value={month} onChange={(e) => setMonth(e.target.value || today().slice(0, 7))} />
              </div>
            ) : (
              <div>
                <label className={label} htmlFor="sum-date">Date</label>
                <input id="sum-date" type="date" className="input mt-1 w-44" value={date} onChange={(e) => setDate(e.target.value || today())} />
              </div>
            )}
            <button className="btn" onClick={loadSummary}>Show</button>
            <button className="btn-light" onClick={() => printElement(`Class Wise Attendance Summary - ${summaryHeading}`, document.getElementById("summary-area"), user.schoolInfo)}><FaPrint /> Print</button>
            {!summaryByMonth && date !== today() && <button className="btn-light" onClick={() => setDate(today())}>Today</button>}
          </div>

          {summary && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ["Students", summary.totals.total],
                  ["Present", summary.totals.present],
                  ["Absent", summary.totals.absent],
                  ["Leave", summary.totals.leave],
                  ["Marked", summary.totals.marked],
                  ["Attendance", `${summary.pct}%`],
                ].map(([k, v]) => (
                  <div key={k} className="card !p-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</p>
                    <p className="mt-1 text-xl font-bold text-slate-800">{v}</p>
                  </div>
                ))}
              </div>

              <div className="card p-0">
                <h2 className="p-4 pb-2 text-base font-bold">Class Wise Attendance Summary - {summaryHeading}</h2>
                <div id="summary-area" className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr>
                        <th className="th">Class</th>
                        <th className="th">Section</th>
                        <th className="th text-center">Students</th>
                        <th className="th text-center">Present</th>
                        <th className="th text-center">Absent</th>
                        <th className="th text-center">Leave</th>
                        <th className="th text-center">Marked</th>
                        <th className="th text-center">Not marked</th>
                        <th className="th text-center">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(summary.rows || []).map((r: any) => (
                        <tr key={`${r.className}|${r.section}`} className="border-t">
                          <td className="td font-semibold">{r.className}</td>
                          <td className="td">{r.section || "-"}</td>
                          <td className="td text-center">{r.total}</td>
                          <td className="td text-center text-emerald-700">{r.present}</td>
                          <td className="td text-center text-red-600">{r.absent}</td>
                          <td className="td text-center text-amber-700">{r.leave}</td>
                          <td className="td text-center">{r.marked}</td>
                          <td className="td text-center">{r.unmarked}</td>
                          <td className="td text-center font-semibold">{r.marked ? `${r.pct}%` : "-"}</td>
                        </tr>
                      ))}
                      {!(summary.rows || []).length && <tr><td colSpan={9} className="td py-8 text-center text-slate-400">No classes found</td></tr>}
                      {(summary.rows || []).length > 1 && (
                        <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                          <td className="td" colSpan={2}>Total</td>
                          <td className="td text-center">{summary.totals.total}</td>
                          <td className="td text-center">{summary.totals.present}</td>
                          <td className="td text-center">{summary.totals.absent}</td>
                          <td className="td text-center">{summary.totals.leave}</td>
                          <td className="td text-center">{summary.totals.marked}</td>
                          <td className="td text-center">{summary.totals.unmarked}</td>
                          <td className="td text-center">{summary.totals.marked ? `${summary.pct}%` : "-"}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
