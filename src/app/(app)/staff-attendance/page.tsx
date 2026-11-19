"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaEdit, FaPrint, FaSave, FaTrash } from "react-icons/fa";
import { api, money, today } from "@/lib/api";
import { confirmDelete, toast } from "@/lib/alerts";
import { useSession } from "@/components/session";
import { printElement } from "@/lib/print";
import { isValidDate, isValidMonth } from "@/lib/attendance";
import { dayCode, earlyMinutesOf, lateMinutesOf } from "@/lib/staff-attendance";

type Tab = "daily" | "monthly" | "timing" | "report";
type StaffMark = { status: string; arrivalTime: string; departureTime: string; lateArrival: boolean; earlyDeparture: boolean };

const label = "text-xs font-semibold text-slate-500";
const cellClass: Record<string, string> = {
  Present: "bg-emerald-100 text-emerald-800",
  Absent: "bg-red-100 text-red-700",
  Leave: "bg-amber-100 text-amber-800",
};
const dayName = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { weekday: "short" });
};

// Staff Attendance: Daily Attendance, Monthly Sheet & Deduction, Set School
// Timing and the monthly arrival/departure detail. School admin only.
export default function StaffAttendance() {
  const { user } = useSession();
  const isSchool = user.role === "school";
  const [tab, setTab] = useState<Tab>("daily");
  const [loading, setLoading] = useState(true);

  // ---------- Daily Attendance ----------
  const [date, setDate] = useState(today());
  const [staffs, setStaffs] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, StaffMark>>({});
  const [saving, setSaving] = useState(false);

  const loadDay = useCallback(async () => {
    if (!isValidDate(date)) return;
    try {
      setLoading(true);
      const d = await api(`/api/staff-attendance?mode=day&date=${encodeURIComponent(date)}`);
      const next: Record<string, StaffMark> = {};
      for (const s of d.staffs || []) {
        const r = s.record || {};
        next[String(s._id)] = {
          status: r.status || "Present",
          arrivalTime: r.arrivalTime || "",
          departureTime: r.departureTime || "",
          lateArrival: !!r.lateArrival,
          earlyDeparture: !!r.earlyDeparture,
        };
      }
      setStaffs(d.staffs || []);
      setMarks(next);
    } catch (e: any) { toast("error", e.message); } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { if (isSchool && tab === "daily") loadDay(); }, [isSchool, tab, loadDay]);

  const setAll = (status: string) => setMarks(Object.fromEntries(staffs.map((s) => [String(s._id), { ...marks[String(s._id)], status }])));

  async function saveDaily() {
    if (!staffs.length) return;
    setSaving(true);
    try {
      const rows = staffs.map((s) => {
        const m = marks[String(s._id)] || { status: "Present", arrivalTime: "", departureTime: "", lateArrival: false, earlyDeparture: false };
        return { staff: s._id, ...m };
      });
      const d = await api("/api/staff-attendance", { method: "POST", body: { date, rows } });
      toast("success", `Attendance saved for ${d.saved} staff member${d.saved === 1 ? "" : "s"}`);
      loadDay();
    } catch (e: any) { toast("error", e.message); } finally { setSaving(false); }
  }

  // ---------- Monthly Sheet & Deduction ----------
  const [month, setMonth] = useState(today().slice(0, 7));
  const [monthRows, setMonthRows] = useState<any[]>([]);
  const [monthDays, setMonthDays] = useState(0);

  const loadMonth = useCallback(async () => {
    if (!isValidMonth(month)) return;
    try {
      setLoading(true);
      const d = await api(`/api/staff-attendance?mode=month&month=${encodeURIComponent(month)}`);
      setMonthRows(d.rows || []);
      setMonthDays(d.days || 0);
    } catch (e: any) { toast("error", e.message); } finally { setLoading(false); }
  }, [month]);

  useEffect(() => { if (isSchool && tab === "monthly") loadMonth(); }, [isSchool, tab, loadMonth]);

  const printMonthly = () => printElement(
    `Staff Attendance - ${month}`,
    document.getElementById("monthly-area"),
    user.schoolInfo,
    true,
  );

  // ---------- Set School Timing ----------
  const [timings, setTimings] = useState<any[]>([]);
  const [timingForm, setTimingForm] = useState({ designation: "", arrivalTime: "", departureTime: "" });
  const [editingTiming, setEditingTiming] = useState<string | null>(null);
  const [savingTiming, setSavingTiming] = useState(false);

  const loadTimings = useCallback(async () => {
    try {
      const d = await api("/api/staff-timing");
      setTimings(d.designations || []);
    } catch (e: any) { toast("error", e.message); }
  }, []);

  useEffect(() => { if (isSchool) loadTimings(); }, [isSchool, loadTimings]);

  const designationOptions = useMemo(() => [...new Set(timings.map((t) => t.designation))].sort(), [timings]);

  async function saveTiming() {
    if (!timingForm.designation.trim()) return;
    setSavingTiming(true);
    try {
      await api("/api/staff-timing", { method: "POST", body: timingForm });
      toast("success", `School timing saved for ${timingForm.designation}`);
      setTimingForm({ designation: "", arrivalTime: "", departureTime: "" });
      setEditingTiming(null);
      loadTimings();
    } catch (e: any) { toast("error", e.message); } finally { setSavingTiming(false); }
  }

  async function deleteTiming(id: string, designation: string) {
    if (!(await confirmDelete(`Delete the timing of "${designation}"?`))) return;
    try {
      await api(`/api/staff-timing?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      toast("success", "Timing deleted");
      loadTimings();
      if (editingTiming === id) setEditingTiming(null);
    } catch (e: any) { toast("error", e.message); }
  }

  // ---------- Staff monthly time report ----------
  const [reportStaff, setReportStaff] = useState("");
  const [reportMonth, setReportMonth] = useState(today().slice(0, 7));
  const [reportRecords, setReportRecords] = useState<any[]>([]);
  const [reportTiming, setReportTiming] = useState<any>(null);
  const [reportStaffs, setReportStaffs] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const loadReportStaffs = useCallback(async () => {
    try {
      const d = await api("/api/users?role=teacher");
      setReportStaffs(d.items || []);
    } catch (e: any) { toast("error", e.message); }
  }, []);

  useEffect(() => { if (isSchool) loadReportStaffs(); }, [isSchool, loadReportStaffs]);

  const loadReport = useCallback(async () => {
    if (!reportStaff || !isValidMonth(reportMonth)) { setReportRecords([]); return; }
    try {
      setReportLoading(true);
      const d = await api(`/api/staff-attendance?mode=staff-report&staff=${encodeURIComponent(reportStaff)}&month=${encodeURIComponent(reportMonth)}`);
      setReportRecords(d.records || []);
      setReportTiming(d.timing || null);
    } catch (e: any) { setReportRecords([]); toast("error", e.message); } finally { setReportLoading(false); }
  }, [reportStaff, reportMonth]);

  useEffect(() => { if (isSchool && tab === "report") loadReport(); }, [isSchool, tab, loadReport]);

  const reportStaffOpt = reportStaffs.find((s) => String(s._id) === reportStaff);

  const tabs: { key: Tab; label: string }[] = [
    { key: "daily", label: "Daily Attendance" },
    { key: "monthly", label: "Monthly Sheet & Deduction" },
    { key: "timing", label: "Set School Timing" },
    { key: "report", label: "Staff Time Report" },
  ];

  if (!isSchool)
    return (
      <div className="card p-8 text-center text-slate-500">
        <h1 className="mb-2 text-xl font-bold text-slate-700">Staff Attendance</h1>
        <p>Staff attendance is only available to the school admin.</p>
      </div>
    );

  if (loading)
    return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <nav aria-label="Staff Attendance sections" className="border-b border-slate-200">
        <div role="tablist" className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex min-h-[40px] items-center whitespace-nowrap rounded-t-lg px-3 py-2 text-[13px] font-medium sm:text-sm ${tab === t.key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ===================== Daily Attendance ===================== */}
      {tab === "daily" && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-end gap-3">
            <div>
              <label className={label} htmlFor="sa-date">Date</label>
              <input id="sa-date" type="date" className="input mt-1 w-44" value={date} onChange={(e) => setDate(e.target.value || today())} />
            </div>
            <button className="btn" onClick={loadDay}>Load</button>
            {date !== today() && <button className="btn-light" onClick={() => setDate(today())}>Today</button>}
            <div className="ml-auto flex items-center gap-2">
              <button className="btn-light" onClick={() => setAll("Present")} disabled={!staffs.length || saving}>
                All Present
              </button>
              <button
                className="inline-flex min-h-[36px] items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-green-700 disabled:opacity-60"
                onClick={saveDaily}
                disabled={!staffs.length || saving}
              >
                <FaSave /> {saving ? "Saving..." : ""}
              </button>
            </div>
          </div>

          <div className="card p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr>
                    <th className="th">Name</th>
                    <th className="th">Designation</th>
                    <th className="th">Attendance</th>
                    <th className="th">Arrival</th>
                    <th className="th">Departure</th>
                    <th className="th">Late Arrival</th>
                    <th className="th">Early Departure</th>
                  </tr>
                </thead>
                <tbody>
                  {staffs.map((s) => {
                    const m = marks[String(s._id)] || { status: "Present", arrivalTime: "", departureTime: "", lateArrival: false, earlyDeparture: false };
                    const timing = s.timing;
                    return (
                      <tr key={s._id} className="border-t">
                        <td className="td whitespace-nowrap">{s.name}</td>
                        <td className="td whitespace-nowrap">{s.designation || "Teacher"}</td>
                        <td className="td">
                          <div className="flex flex-wrap gap-x-4 gap-y-1" role="radiogroup" aria-label={`Attendance of ${s.name}`}>
                            {["Present", "Absent", "Leave"].map((st) => (
                              <label key={st} className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-700">
                                <input
                                  type="radio"
                                  name={`att-${s._id}`}
                                  value={st}
                                  checked={m.status === st}
                                  onChange={() => setMarks({ ...marks, [String(s._id)]: { ...m, status: st } })}
                                  className="h-4 w-4 accent-blue-600"
                                />
                                {st}
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="td">
                          <input
                            type="time"
                            className="input w-full text-[12px]"
                            value={m.arrivalTime}
                            onChange={(e) => setMarks({ ...marks, [String(s._id)]: { ...m, arrivalTime: e.target.value, lateArrival: lateMinutesOf(m.arrivalTime, timing?.arrivalTime || "") > 0 ? lateMinutesOf(e.target.value, timing?.arrivalTime || "") > 0 : m.lateArrival } })}
                            placeholder={timing?.arrivalTime ? `scheduled ${timing.arrivalTime}` : "arrival time"}
                          />
                        </td>
                        <td className="td">
                          <input
                            type="time"
                            className="input w-full text-[12px]"
                            value={m.departureTime}
                            onChange={(e) => setMarks({ ...marks, [String(s._id)]: { ...m, departureTime: e.target.value, earlyDeparture: earlyMinutesOf(m.departureTime, timing?.departureTime || "") > 0 ? earlyMinutesOf(e.target.value, timing?.departureTime || "") > 0 : m.earlyDeparture } })}
                            placeholder={timing?.departureTime ? `scheduled ${timing.departureTime}` : "departure time"}
                          />
                        </td>
                        <td className="td">
                          <label className="inline-flex items-center gap-1.5 text-[13px] text-slate-700">
                            <input type="checkbox" checked={m.lateArrival} onChange={() => setMarks({ ...marks, [String(s._id)]: { ...m, lateArrival: !m.lateArrival } })} className="h-4 w-4 accent-blue-600" />
                            Late
                          </label>
                        </td>
                        <td className="td">
                          <label className="inline-flex items-center gap-1.5 text-[13px] text-slate-700">
                            <input type="checkbox" checked={m.earlyDeparture} onChange={() => setMarks({ ...marks, [String(s._id)]: { ...m, earlyDeparture: !m.earlyDeparture } })} className="h-4 w-4 accent-blue-600" />
                            Early
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                  {!staffs.length && <tr><td colSpan={7} className="td py-8 text-center text-slate-400">No staff found</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="px-4 pb-3 text-xs text-slate-500">
              Late arrival / early departure minutes are computed against the current school timing for the staff designation in <b>Set School Timing</b>. In the Monthly Sheet, late/early minutes are deducted per minute (a manually flagged late/early with no recorded minutes deducts 0).
            </p>
          </div>
        </div>
      )}

      {/* ===================== Monthly Sheet & Deduction ===================== */}
      {tab === "monthly" && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-end gap-3">
            <div>
              <label className={label} htmlFor="sa-month">Month</label>
              <input id="sa-month" type="month" className="input mt-1 w-44" value={month} onChange={(e) => setMonth(e.target.value || today().slice(0, 7))} />
            </div>
            <button className="btn" onClick={loadMonth}>Show</button>
            <button className="btn-light" onClick={printMonthly}><FaPrint /> Print</button>
          </div>

          <div className="card p-0">
            <h2 className="p-4 pb-2 text-base font-bold">
              Staff Attendance -{" "}
              {new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1)).toLocaleDateString(
                "en-GB",
                { month: "long", year: "numeric", timeZone: "UTC" },
              )}
            </h2>
            <div id="monthly-area" className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-xs">
                <thead>
                  <tr>
                    <th className="th">Name</th>
                    <th className="th">Designation</th>
                    {Array.from({ length: monthDays }, (_, i) => i + 1).map((d) => (
                      <th key={d} className="th !px-1 text-center">{d}</th>
                    ))}
                    <th className="th text-center">P</th>
                    <th className="th text-center">A</th>
                    <th className="th text-center">L</th>
                    <th className="th text-center">Late</th>
                    <th className="th text-center">Late Min</th>
                    <th className="th text-center">Early</th>
                    <th className="th text-center">Early Min</th>
                    <th className="th text-center">Absent Ded.</th>
                    <th className="th text-center">Late Ded.</th>
                    <th className="th text-center">Early Ded.</th>
                    <th className="th text-center">Ded. Days</th>
                    <th className="th text-center">Deduction</th>
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map((row) => {
                    const byDay = row.byDay || {};
                    return (
                      <tr key={row._id} className="border-t">
                        <td className="td whitespace-nowrap">{row.name}</td>
                        <td className="td whitespace-nowrap">{row.designation || "Teacher"}</td>
                        {Array.from({ length: monthDays }, (_, i) => i + 1).map((d) => {
                          const r = byDay[d];
                          const code = r ? dayCode(r.status, !!r.lateArrival, !!r.earlyDeparture) : "";
                          const title = r
                            ? `${r.status} - ${month}-${String(d).padStart(2, "0")}${
                                r.arrivalTime ? ` · arrived ${r.arrivalTime}` : ""
                              }${r.departureTime ? ` · departed ${r.departureTime}` : ""}${
                                r.lateMinutes ? ` · ${r.lateMinutes} min late` : ""
                              }${r.earlyMinutes ? ` · ${r.earlyMinutes} min early` : ""}`
                            : "";
                          return (
                            <td key={d} className={`td !px-1 text-center ${r ? cellClass[r.status] : ""}`} title={title || ""}>
                              {code}
                            </td>
                          );
                        })}
                        <td className="td text-center">{row.present}</td>
                        <td className="td text-center">{row.absent}</td>
                        <td className="td text-center">{row.leave}</td>
                        <td className="td text-center font-semibold">{row.lateDays}</td>
                        <td className="td text-center">{row.lateMinutes}</td>
                        <td className="td text-center font-semibold">{row.earlyDays}</td>
                        <td className="td text-center">{row.earlyMinutes}</td>
                        <td className="td text-center">{money(row.absentDeduction)}</td>
                        <td className="td text-center">{money(row.lateDeduction)}</td>
                        <td className="td text-center">{money(row.earlyDeduction)}</td>
                        <td className="td text-center font-semibold">{Number(row.dedDays || 0).toFixed(2)}</td>
                        <td className="td text-center font-semibold">{money(row.deduction)}</td>
                      </tr>
                    );
                  })}
                  {!monthRows.length && <tr><td colSpan={monthDays + 15} className="td py-8 text-center text-slate-400">No staff found</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="px-4 pb-3 text-xs text-slate-500">
              * = Late, ^ = Early departure. Deduction = Absent × (monthly salary / 30) + (Late Min + Early Min) × (monthly salary / 30 / school-day minutes). School-day minutes = departure − arrival from Set School Timing (fallback 480 min / 8 hrs if no timing). Late/early minutes are deducted per minute; a manually flagged late/early with no minutes deducts 0. Set a monthly salary on the staff profile.
            </p>
          </div>
        </div>
      )}

      {/* ===================== Set School Timing ===================== */}
      {tab === "timing" && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-end gap-3">
            <div>
              <h2 className="text-base font-bold">Set School Timing</h2>
              <p className="text-xs text-slate-500">Set the expected arrival and departure time for each staff designation.</p>
            </div>
          </div>

          <div className="card p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-4">
              <label className={label} htmlFor="st-designation">Designation</label>
              <input
                id="st-designation"
                list="st-designation-list"
                className="input mt-1 w-full"
                value={timingForm.designation}
                onChange={(e) => setTimingForm({ ...timingForm, designation: e.target.value })}
                placeholder="e.g. Teacher, Staff"
              />
              <datalist id="st-designation-list">{designationOptions.map((d) => <option key={d} value={d} />)}</datalist>
              <p className="text-xs text-slate-500 mt-1">Select an existing designation or type a new one.</p>
            </div>
            <div className="sm:col-span-3">
              <label className={label} htmlFor="st-arrival">Arrival time</label>
              <input id="st-arrival" type="time" className="input mt-1 w-full" value={timingForm.arrivalTime} onChange={(e) => setTimingForm({ ...timingForm, arrivalTime: e.target.value })} />
            </div>
            <div className="sm:col-span-3">
              <label className={label} htmlFor="st-departure">Departure time</label>
              <input id="st-departure" type="time" className="input mt-1 w-full" value={timingForm.departureTime} onChange={(e) => setTimingForm({ ...timingForm, departureTime: e.target.value })} />
            </div>
            <div className="sm:col-span-2 self-end">
              <button className="btn w-full" onClick={saveTiming} disabled={savingTiming}>
                {editingTiming ? "Update timing" : "Add entry"}
              </button>
              {editingTiming && <button className="btn-light w-full mt-2" onClick={() => { setEditingTiming(null); setTimingForm({ designation: "", arrivalTime: "", departureTime: "" }); }}>Cancel</button>}
            </div>
          </div>

          <div className="card p-0">
            <h2 className="p-4 pb-2 text-base font-bold">Staff school timings</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr>
                    <th className="th">Designation</th>
                    <th className="th">Arrival time</th>
                    <th className="th">Departure time</th>
                    <th className="th text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {timings.map((t) => (
                    <tr key={t._id} className="border-t">
                      <td className="td whitespace-nowrap">{t.designation}</td>
                      <td className="td">{t.arrivalTime || "—"}</td>
                      <td className="td">{t.departureTime || "—"}</td>
                      <td className="td whitespace-nowrap text-right">
                        <button className="btn-light !px-2 !py-1 text-[12px] hover:text-blue-600" onClick={() => {
                          setEditingTiming(String(t._id));
                          setTimingForm({ designation: t.designation, arrivalTime: t.arrivalTime || "", departureTime: t.departureTime || "" });
                        }}><FaEdit /></button>
                        <button className="ml-2 btn-light !px-2 !py-1 text-[12px] text-red-600 hover:bg-red-50" onClick={() => deleteTiming(String(t._id), t.designation)}><FaTrash /></button>
                      </td>
                    </tr>
                  ))}
                  {!timings.length && <tr><td colSpan={4} className="td py-8 text-center text-slate-400">No timings set yet. Add an entry above.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="px-4 pb-3 text-xs text-slate-500">
              The "Add entry" option lets you set the school timing for other staff designations. A staff member's late arrival / early departure minutes are computed against his designation's timing.
            </p>
          </div>
        </div>
      )}

      {/* ===================== Staff Time Report ===================== */}
      {tab === "report" && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-end gap-3">
            <div>
              <h2 className="text-base font-bold">Monthly staff arrival &amp; departure times</h2>
              <p className="text-xs text-slate-500">Select a staff member to see day-wise times and minutes. Minutes use the current timing for the staff designation.</p>
            </div>
            <div className="flex items-end gap-2">
              <label className={label} htmlFor="rs-staff">Name</label>
              <select id="rs-staff" className="input mt-1 w-56" value={reportStaff} onChange={(e) => setReportStaff(e.target.value)}>
                <option value="">Select staff</option>
                {reportStaffs.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className={label} htmlFor="rs-month">Month</label>
              <input id="rs-month" type="month" className="input mt-1 w-44" value={reportMonth} onChange={(e) => setReportMonth(e.target.value || today().slice(0, 7))} />
            </div>
            <button className="btn" onClick={loadReport} disabled={!reportStaff || reportLoading}>
              Show
            </button>
          </div>

          <div className="card p-0">
            {reportStaff && (
              <>
                <h2 className="p-4 pb-2 text-base font-bold">
                  {reportStaffOpt?.name || "Staff"} —{" "}
                  {new Date(Date.UTC(Number(reportMonth.slice(0, 4)), Number(reportMonth.slice(5, 7)) - 1, 1)).toLocaleDateString(
                    "en-GB",
                    { month: "long", year: "numeric", timeZone: "UTC" },
                  )}
                </h2>
                {!reportLoading && (!reportTiming?.arrivalTime || !reportTiming?.departureTime) && (
                  <p className="px-4 pb-2 text-xs text-amber-700">Set both arrival and departure times for this staff member’s designation in Set School Timing to calculate minutes from recorded times.</p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr>
                        <th className="th">Date</th>
                        <th className="th">Day</th>
                        <th className="th">Status</th>
                        <th className="th">Arrival</th>
                        <th className="th">Departure</th>
                        <th className="th text-center">Late (min)</th>
                        <th className="th text-center">Early (min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRecords.map((r) => (
                        <tr key={r.date} className="border-t">
                          <td className="td whitespace-nowrap">{r.date}</td>
                          <td className="td whitespace-nowrap">{dayName(r.date)}</td>
                          <td className="td whitespace-nowrap"><span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${cellClass[r.status]}`}>{r.status}</span></td>
                          <td className="td whitespace-nowrap">{r.arrivalTime || "—"}</td>
                          <td className="td whitespace-nowrap">{r.departureTime || "—"}</td>
                          <td className="td text-center">{r.lateMinutes || 0}</td>
                          <td className="td text-center">{r.earlyMinutes || 0}</td>
                        </tr>
                      ))}
                      {!reportRecords.length && <tr><td colSpan={7} className="td py-8 text-center text-slate-400">No attendance days marked this month</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
