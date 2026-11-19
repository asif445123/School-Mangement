export const attendanceStatuses = ["Present", "Absent", "Leave"] as const;
export type StaffAttendanceStatus = (typeof attendanceStatuses)[number];
export const shortOf: Record<StaffAttendanceStatus, string> = { Present: "P", Absent: "A", Leave: "L" };

// "HH:mm" -> minutes since midnight
export const hhmmToMinutes = (value: string): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value));
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
};

// Minutes the staff member arrived after the scheduled arrival time (0 if on
// time or earlier, or when either time was not recorded).
export const lateMinutesOf = (actualArrival: string, scheduledArrival: string): number => {
  const a = hhmmToMinutes(actualArrival), s = hhmmToMinutes(scheduledArrival);
  if (!a || !s) return 0;
  return Math.max(0, a - s);
};

// Minutes the staff member left before the scheduled departure time (0 if on
// time or later, or when either time was not recorded).
export const earlyMinutesOf = (actualDeparture: string, scheduledDeparture: string): number => {
  const a = hhmmToMinutes(actualDeparture), s = hhmmToMinutes(scheduledDeparture);
  if (!a || !s) return 0;
  return Math.max(0, s - a);
};

// Default rule: 3 late arrivals / early departures count as 1 deductible day.
export const deductionDays = (absent: number, lateDays: number, earlyDays: number): number =>
  absent + Math.floor((lateDays + earlyDays) / 3);

export const deductionAmount = (dedDays: number, monthlySalary: number): number =>
  Math.round((dedDays * (Number(monthlySalary) || 0)) / 30 * 100) / 100;

export const dayCode = (status: StaffAttendanceStatus, late: boolean, early: boolean): string =>
  shortOf[status] + (late ? "*" : "") + (early ? "^" : "");
