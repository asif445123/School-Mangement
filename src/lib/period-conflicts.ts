import { assignmentsOf, nz, PERIOD_OPTIONS, periodNumber, splitList } from "./teacher-scope";
import { periodTime } from "./timetable";

// A class can have only ONE teacher in a period. Every period already assigned
// to a class becomes a "busy slot"; a new assignment for the same class (and
// section) in that period is refused and the existing teacher is named.
export type BusySlot = {
  teacherId: string;
  teacherName: string;
  teacherType: string;
  className: string;
  section: string;
  subject: string;
  period: number;
};

export type Seat = { className?: string; section?: string; period?: number | string };

// "10th, 9th" and "10th" share a class; sections are compared ignoring case and spaces
export const sameClass = (a: any, b: any) =>
  splitList(a).some((x) => splitList(b).some((y) => nz(x) === nz(y)));

// A blank section covers every section of the class
export const sameSection = (a: any, b: any) => !nz(a) || !nz(b) || nz(a) === nz(b);

// Every period a teacher is already busy in, one row per class he teaches
export function busySlots(teachers: any[]): BusySlot[] {
  const out: BusySlot[] = [];
  for (const teacher of teachers) for (const a of assignmentsOf(teacher)) {
    const period = periodNumber(a.period);
    if (!period) continue;
    for (const className of splitList(a.className)) out.push({
      teacherId: String(teacher?._id ?? ""),
      teacherName: String(teacher?.name || "Teacher"),
      teacherType: String(a.teacherType || ""),
      className,
      section: String(a.section || "").trim(),
      subject: String(a.subject || "").trim(),
      period,
    });
  }
  return out;
}

// Who already teaches the candidate class/section/period (optionally ignoring one teacher)
export function conflictsFor(seat: Seat, busy: BusySlot[], ignoreTeacherId?: string): BusySlot[] {
  const period = periodNumber(seat.period);
  if (!period || !splitList(seat.className).length) return [];
  const ignore = ignoreTeacherId ? String(ignoreTeacherId) : "";
  return busy.filter((slot) =>
    slot.period === period
    && (!ignore || slot.teacherId !== ignore)
    && sameClass(slot.className, seat.className)
    && sameSection(slot.section, seat.section));
}

// Options of a period dropdown: the school time is added to every period and a
// period that another teacher of the class already holds is named and disabled.
// Used by the school admin popup, the class teacher popup and the class teacher's
// edit dialog, so all three offer exactly the same periods.
export type PeriodChoice = { value: string; label: string; taken: BusySlot[] };
export function periodChoices(schedule: any, busy: BusySlot[], seat?: Seat): PeriodChoice[] {
  return PERIOD_OPTIONS.map((period) => {
    const taken = seat ? conflictsFor({ ...seat, period }, busy) : [];
    const who = [...new Set(taken.map((t) => t.teacherName))].join(", ");
    const time = periodTime(schedule, period);
    return { value: period, label: `Period ${period}${time ? ` · ${time}` : ""}${who ? ` (${who} taken)` : ""}`, taken };
  });
}

// "Period 2 of class 10th Iqbal" / "Period 2 of class 5 A"
export const seatText = (seat: Seat) => {
  const section = String(seat.section || "").trim();
  return `Period ${Number(seat.period)} of class ${String(seat.className || "").trim()}${section ? ` ${section}` : ""}`;
};

// "Period 2 of class 10th Iqbal is already taken by Kamran (Math)"
export function conflictText(seat: Seat, slots: BusySlot[]): string {
  const unique = slots.filter((s, i) => slots.findIndex((x) => x.teacherId === s.teacherId && nz(x.subject) === nz(s.subject)) === i);
  const who = unique.map((s) => `${s.teacherName}${s.subject ? ` (${s.subject})` : ""}`).join(", ");
  return `${seatText(seat)} is already taken by ${who}`;
}

// Server guard: checks every assignment of the request against the other teachers.
// Only the period fields are looked at, so old rows without a period are ignored.
export function assignmentConflict(teachers: any[], candidates: any[], ignoreTeacherId?: string): string | null {
  const busy = busySlots(teachers);
  for (const candidate of candidates) {
    const hits = conflictsFor(candidate, busy, ignoreTeacherId);
    if (hits.length) return conflictText(candidate, hits);
  }
  return null;
}
