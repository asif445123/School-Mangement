import { nz } from "./teacher-scope";

// Student attendance: one status per student per day (Present / Absent / Leave).
export const attendanceStatuses = ["Present", "Absent", "Leave"] as const;
export type AttendanceStatus = (typeof attendanceStatuses)[number];

const SHORT: Record<string, AttendanceStatus> = { p: "Present", a: "Absent", l: "Leave" };

// Accepts "Present" / "Absent" / "Leave" (any capitals) or the short P / A / L.
// Returns "" for anything else so the caller can reject it.
export function normalizeAttendanceStatus(value: any): AttendanceStatus | "" {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return "";
  if (SHORT[v]) return SHORT[v];
  const full = attendanceStatuses.find((s) => s.toLowerCase() === v);
  return full || "";
}

export const isValidDate = (value: any): boolean => {
  const s = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

export const isValidMonth = (value: any): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ""));

export function daysInMonth(month: string): number {
  const [y, m] = String(month).split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// Attendance % = present out of the days that were actually marked.
export const attendancePct = (present: number, marked: number): number =>
  marked > 0 ? Math.round((present / marked) * 100) : 0;

export type AttendanceRow = { student: any; date: string; status: string; className?: string; section?: string };

// One student's month: which status on which day + P / A / L totals + %.
export function monthlyCounts(records: AttendanceRow[], month: string) {
  const byDay = new Map<number, string>();
  let present = 0,
    absent = 0,
    leave = 0;
  for (const r of records) {
    if (!String(r.date || "").startsWith(month)) continue;
    const day = Number(String(r.date).slice(8, 10));
    if (!day) continue;
    const status = normalizeAttendanceStatus(r.status);
    if (!status) continue;
    byDay.set(day, status);
    if (status === "Present") present++;
    else if (status === "Absent") absent++;
    else leave++;
  }
  const marked = present + absent + leave;
  return { byDay, present, absent, leave, marked, pct: attendancePct(present, marked) };
}

export type ClassSummaryRow = {
  className: string;
  section: string;
  total: number;
  present: number;
  absent: number;
  leave: number;
  marked: number;
  unmarked: number;
  pct: number;
};

// Class-wise summary for one date: one row per class + section of the roster.
export function summarizeDay(students: any[], records: AttendanceRow[]): ClassSummaryRow[] {
  const statusOf = new Map<string, string>();
  for (const r of records) statusOf.set(String(r.student?._id || r.student), normalizeAttendanceStatus(r.status) || String(r.status || ""));

  const groups = new Map<string, ClassSummaryRow>();
  const keyOf = (s: any) => `${nz(s.className)}|${nz(s.section)}`;
  for (const s of students) {
    const key = keyOf(s);
    let row = groups.get(key);
    if (!row) {
      row = { className: String(s.className || ""), section: String(s.section || "").trim(), total: 0, present: 0, absent: 0, leave: 0, marked: 0, unmarked: 0, pct: 0 };
      groups.set(key, row);
    }
    row.total++;
    const status = statusOf.get(String(s._id));
    if (status === "Present") row.present++;
    else if (status === "Absent") row.absent++;
    else if (status === "Leave") row.leave++;
    else row.unmarked++;
  }
  for (const row of groups.values()) {
    row.marked = row.present + row.absent + row.leave;
    row.pct = attendancePct(row.present, row.marked);
  }
  return sortSummary(groups);
}

// Class-wise summary for a whole month: the statuses of every marked day are
// added up per class + section, and `unmarked` counts the students who have no
// attendance at all in that month.
export function summarizeMonth(students: any[], records: AttendanceRow[]): ClassSummaryRow[] {
  const groups = new Map<string, ClassSummaryRow>();
  const keyOf = (s: any) => `${nz(s.className)}|${nz(s.section)}`;
  const rowOf = (s: any) => {
    const key = keyOf(s);
    let row = groups.get(key);
    if (!row) {
      row = { className: String(s.className || ""), section: String(s.section || "").trim(), total: 0, present: 0, absent: 0, leave: 0, marked: 0, unmarked: 0, pct: 0 };
      groups.set(key, row);
    }
    return row;
  };
  const keyById = new Map<string, string>();
  const touched = new Set<string>();
  for (const s of students) {
    const row = rowOf(s);
    row.total++;
    keyById.set(String(s._id), keyOf(s));
  }
  for (const r of records) {
    const key = keyById.get(String(r.student?._id || r.student));
    if (!key) continue; // student no longer on the roster
    const row = groups.get(key);
    if (!row) continue;
    const status = normalizeAttendanceStatus(r.status);
    if (status === "Present") row.present++;
    else if (status === "Absent") row.absent++;
    else if (status === "Leave") row.leave++;
    else continue;
    touched.add(key);
  }
  for (const [key, row] of groups) {
    row.marked = row.present + row.absent + row.leave;
    row.pct = attendancePct(row.present, row.marked);
    // a student counts as marked for the month once any day is recorded
    row.unmarked = touched.has(key) ? 0 : row.total;
  }
  return sortSummary(groups);
}

const sortSummary = (groups: Map<string, ClassSummaryRow>) =>
  [...groups.values()].sort(
    (a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }) || a.section.localeCompare(b.section, undefined, { numeric: true }),
  );
