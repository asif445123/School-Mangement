import { assignmentsOf, classTeacherClasses, nz, periodNumber, splitList } from "./teacher-scope";

export const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export type TimeSlot = { start: string; end: string };
export type TimetableEntry = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherType: string;
  subject: string;
  period?: number;
};
export type TimetableItem = {
  key: string;
  className: string;
  section: string;
  classTeachers: string[];
  entries: TimetableEntry[];
};

// One schedule per school: every class uses these same period and break times.
export type SchoolSchedule = {
  regularPeriods: TimeSlot[];
  fridayPeriods: TimeSlot[];
  regularBreak: TimeSlot;
  fridayBreak: TimeSlot;
};

export const blankSlot = (): TimeSlot => ({ start: "", end: "" });
export const blankPeriods = () => PERIODS.map(() => blankSlot());
export const blankSchedule = (): SchoolSchedule => ({
  regularPeriods: blankPeriods(),
  fridayPeriods: blankPeriods(),
  regularBreak: blankSlot(),
  fridayBreak: blankSlot(),
});
export const timetableKey = (className: any, section: any) => `${nz(className)}|${nz(section)}`;
export const slotText = (slot?: TimeSlot) => slot?.start && slot?.end ? `${slot.start} – ${slot.end}` : "Not set";

const slots = (value: any): TimeSlot[] => PERIODS.map((_, i) => ({
  start: String(value?.[i]?.start || ""),
  end: String(value?.[i]?.end || ""),
}));
const oneSlot = (value: any): TimeSlot => ({ start: String(value?.start || ""), end: String(value?.end || "") });

// Reads a saved schedule (new PeriodSchedule or a legacy per-class Timetable row).
export const scheduleFrom = (doc: any): SchoolSchedule => ({
  regularPeriods: slots(doc?.regularPeriods),
  fridayPeriods: slots(doc?.fridayPeriods),
  regularBreak: oneSlot(doc?.regularBreak),
  fridayBreak: oneSlot(doc?.fridayBreak),
});

// A blank assignment section applies to every section of the class. A specific
// section never leaks into another section's timetable.
const sectionMatches = (assignmentSection: any, classSection: any) =>
  !nz(assignmentSection) || nz(assignmentSection) === nz(classSection);

const ownsClass = (ct: { className: string; section: string }, item: { className: string; section: string }) =>
  nz(ct.className) === nz(item.className) && (!nz(ct.section) || nz(ct.section) === nz(item.section));

/**
 * Builds timetable rows from the school's existing teacher/subject assignments.
 * School admins see everything, class teachers see their whole class plus their
 * own teaching elsewhere, and subject teachers see only their own assignments.
 * Period times live on the school-wide schedule, so they are not part of a row.
 */
export function buildTimetableItems(teachers: any[], me: any): TimetableItem[] {
  const classes = new Map<string, TimetableItem>();
  const ensure = (className: any, section: any) => {
    const name = String(className || "").trim();
    if (!name) return null;
    const sec = String(section || "").trim();
    const key = timetableKey(name, sec);
    if (!classes.has(key)) classes.set(key, {
      key, className: name, section: sec, classTeachers: [], entries: [],
    });
    return classes.get(key)!;
  };

  for (const teacher of teachers) for (const a of assignmentsOf(teacher)) {
    for (const className of splitList(a.className)) ensure(className, a.section);
  }

  for (const teacher of teachers) {
    const teacherId = String(teacher._id);
    assignmentsOf(teacher).forEach((a, assignmentIndex) => {
      for (const className of splitList(a.className)) {
        const targets = [...classes.values()].filter((item) => nz(item.className) === nz(className) && sectionMatches(a.section, item.section));
        for (const item of targets) {
          if (a.teacherType === "Class teacher" && !item.classTeachers.includes(teacher.name)) item.classTeachers.push(teacher.name);
          for (const subject of splitList(a.subject)) {
            const period = periodNumber(a.period);
            const id = `${teacherId}:${assignmentIndex}:${item.key}:${nz(subject)}:${period || "none"}`;
            if (item.entries.some((e) => e.id === id)) continue;
            item.entries.push({ id, teacherId, teacherName: teacher.name, teacherType: a.teacherType || "", subject, period });
          }
        }
      }
    });
  }

  const myId = String(me?._id || "");
  const myAssignments = assignmentsOf(me);
  const myClasses = classTeacherClasses(me);
  const teachesClass = (item: TimetableItem) => myAssignments.some((a) =>
    splitList(a.className).some((name) => nz(name) === nz(item.className)) && sectionMatches(a.section, item.section));

  return [...classes.values()].filter((item) => {
    if (me?.role === "school") return true;
    const ownClass = myClasses.some((ct) => ownsClass(ct, item));
    if (!ownClass && !teachesClass(item)) return false;
    if (!ownClass) item.entries = item.entries.filter((entry) => entry.teacherId === myId);
    return true;
  }).map((item) => ({
    ...item,
    classTeachers: item.classTeachers.sort(),
    entries: item.entries.sort((a, b) => (a.period || 99) - (b.period || 99) || a.subject.localeCompare(b.subject)),
  })).sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }) || a.section.localeCompare(b.section));
}
