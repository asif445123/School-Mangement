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

// Fallback school-day length (8 hours) when a designation has no usable
// arrival/departure timing. Per-minute deduction divides the daily salary
// (monthly salary / 30) by this many minutes.
export const DEFAULT_SCHOOL_DAY_MINUTES = 480;

// Length of one school day in minutes from the designation timing
// (departure - arrival). Falls back to 480 when timing is missing/invalid.
export const schoolDayMinutes = (timing: Timing): number => {
  const a = hhmmToMinutes(timing?.arrivalTime || "");
  const d = hhmmToMinutes(timing?.departureTime || "");
  if (a < 0 || d < 0 || d <= a) return DEFAULT_SCHOOL_DAY_MINUTES;
  return d - a;
};

// Deduction is per minute: absent days count in full, while every late /
// early minute counts as 1 / school-day-minutes of a day. E.g. 30 minutes
// late on a 300-minute day = 0.1 deduction day. A manually flagged
// late/early with 0 recorded minutes therefore deducts 0.
export const deductionDays = (
  absent: number,
  lateMinutes: number,
  earlyMinutes: number,
  dayMinutes: number = DEFAULT_SCHOOL_DAY_MINUTES,
): number => {
  const dm = Number(dayMinutes) > 0 ? Number(dayMinutes) : DEFAULT_SCHOOL_DAY_MINUTES;
  return (Number(absent) || 0) + ((Number(lateMinutes) || 0) + (Number(earlyMinutes) || 0)) / dm;
};

export const deductionAmount = (dedDays: number, monthlySalary: number): number =>
  Math.round((dedDays * (Number(monthlySalary) || 0)) / 30 * 100) / 100;

const round2 = (n: number): number => Math.round(n * 100) / 100;

// Full monthly deduction with breakdown so the sheet can show where the
// deduction came from:
//   absentDeduction = absent × (salary / 30)
//   lateDeduction   = lateMinutes  × (salary / 30) / school-day-minutes
//   earlyDeduction  = earlyMinutes × (salary / 30) / school-day-minutes
//   deduction       = sum of the three (rounded components, so columns add up)
export function deductionBreakdown(
  absent: number,
  lateMinutes: number,
  earlyMinutes: number,
  monthlySalary: number,
  dayMinutes: number = DEFAULT_SCHOOL_DAY_MINUTES,
) {
  const dm = Number(dayMinutes) > 0 ? Number(dayMinutes) : DEFAULT_SCHOOL_DAY_MINUTES;
  const daily = (Number(monthlySalary) || 0) / 30;
  const absentDeduction = round2((Number(absent) || 0) * daily);
  const lateDeduction = round2(((Number(lateMinutes) || 0) * daily) / dm);
  const earlyDeduction = round2(((Number(earlyMinutes) || 0) * daily) / dm);
  const deduction = round2(absentDeduction + lateDeduction + earlyDeduction);
  const dedDays = deductionDays(absent, lateMinutes, earlyMinutes, dm);
  return { dedDays, absentDeduction, lateDeduction, earlyDeduction, deduction, dayMinutes: dm };
}

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
  for (const st of staffs) {
    const timing = timings.get(timingKey(st.designation));
    rows.set(String(st._id), {
      ...st, present: 0, absent: 0, leave: 0,
      lateDays: 0, earlyDays: 0, lateMinutes: 0, earlyMinutes: 0,
      dayMinutes: schoolDayMinutes(timing),
      byDay: {} as Record<number, any>,
    });
  }
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
    const b = deductionBreakdown(row.absent, row.lateMinutes, row.earlyMinutes, row.monthlySalary || 0, row.dayMinutes);
    return { ...row, ...b };
  });
}
