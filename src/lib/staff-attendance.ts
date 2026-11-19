export const attendanceStatuses = ["Present", "Absent", "Leave"] as const;
export type StaffAttendanceStatus = (typeof attendanceStatuses)[number];
export const shortOf: Record<StaffAttendanceStatus, string> = { Present: "P", Absent: "A", Leave: "L" };

// "HH:mm" -> minutes since midnight
export const hhmmToMinutes = (value: string): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value));
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return -1;
  return Number(m[1]) * 60 + Number(m[2]);
};

// Minutes the staff member arrived after the scheduled arrival time (0 if on
// time or earlier, or when either time was not recorded).
export const lateMinutesOf = (actualArrival: string, scheduledArrival: string): number => {
  const a = hhmmToMinutes(actualArrival), s = hhmmToMinutes(scheduledArrival);
  if (a < 0 || s < 0) return 0;
  return Math.max(0, a - s);
};

// Minutes the staff member left before the scheduled departure time (0 if on
// time or later, or when either time was not recorded).
export const earlyMinutesOf = (actualDeparture: string, scheduledDeparture: string): number => {
  const a = hhmmToMinutes(actualDeparture), s = hhmmToMinutes(scheduledDeparture);
  if (a < 0 || s < 0) return 0;
  return Math.max(0, s - a);
};

// Default rule: 3 late arrivals / early departures count as 1 deductible day.
export const deductionDays = (absent: number, lateDays: number, earlyDays: number): number =>
  absent + Math.floor((lateDays + earlyDays) / 3);

export const deductionAmount = (dedDays: number, monthlySalary: number): number =>
  Math.round((dedDays * (Number(monthlySalary) || 0)) / 30 * 100) / 100;

export const dayCode = (status: StaffAttendanceStatus, late: boolean, early: boolean): string =>
  shortOf[status] + (late ? "*" : "") + (early ? "^" : "");

// The UI displays Teacher for an empty designation; timing lookup must do the same.
export const timingKey = (designation: unknown): string => String(designation || "").trim().toLowerCase() || "teacher";

type Timing = { arrivalTime?: string; departureTime?: string } | null | undefined;
type AttendanceRecord = { arrivalTime?: string; departureTime?: string; lateArrival?: boolean; earlyDeparture?: boolean; lateMinutes?: number; earlyMinutes?: number };

// Use the current designation timing when one is available, including for records
// entered before timing was configured. Preserve manually marked flags and saved
// minutes when there is no matching schedule or actual time.
export function withTiming<T extends AttendanceRecord>(record: T, timing: Timing) {
  const lateMinutes = record.arrivalTime && timing?.arrivalTime
    ? lateMinutesOf(record.arrivalTime, timing.arrivalTime) : Number(record.lateMinutes || 0);
  const earlyMinutes = record.departureTime && timing?.departureTime
    ? earlyMinutesOf(record.departureTime, timing.departureTime) : Number(record.earlyMinutes || 0);
  return { ...record, lateMinutes, earlyMinutes,
    lateArrival: !!record.lateArrival || lateMinutes > 0,
    earlyDeparture: !!record.earlyDeparture || earlyMinutes > 0 };
}

export function monthlyRows(staffs: any[], records: any[], timings: Map<string, Timing>) {
  const rows = new Map<string, any>();
  for (const st of staffs) rows.set(String(st._id), {
    ...st, present: 0, absent: 0, leave: 0,
    lateDays: 0, earlyDays: 0, lateMinutes: 0, earlyMinutes: 0,
    byDay: {} as Record<number, any>,
  });
  for (const record of records) {
    const row = rows.get(String(record.staff));
    if (!row) continue;
    const day = Number(String(record.date).slice(8, 10));
    if (!day) continue;
    const r = withTiming(record, timings.get(timingKey(row.designation)));
    row.byDay[day] = r;
    if (r.status === "Present") row.present++;
    else if (r.status === "Absent") row.absent++;
    else if (r.status === "Leave") row.leave++;
    if (r.lateArrival) { row.lateDays++; row.lateMinutes += r.lateMinutes; }
    if (r.earlyDeparture) { row.earlyDays++; row.earlyMinutes += r.earlyMinutes; }
  }
  return [...rows.values()].map((row) => {
    const dedDays = deductionDays(row.absent, row.lateDays, row.earlyDays);
    return { ...row, dedDays, deduction: deductionAmount(dedDays, row.monthlySalary || 0) };
  });
}
