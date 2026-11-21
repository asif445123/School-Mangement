import { nz, assignmentsOf, splitList } from "./teacher-scope";
import { attendancePct } from "./attendance";

// Numbers shown on the dashboard for one chosen date. Everything here is a pure
// function of the rows the API loaded, so the arithmetic can be unit tested.
//
//   Diary  -> S 15 - D 10 - R 5   S = total subjects assigned to teachers,
//                                 D = diaries submitted, R = diaries still missing
//   Tests  -> T 50 - M 40 - R 10  T = tests created, M = their total marks,
//                                 R = marks still to be entered
// The remaining part is always the total minus what has been handed in, so the
// three numbers on every card add up.

export const remainingOf = (total: number, submitted: number) => Math.max(0, (Number(total) || 0) - (Number(submitted) || 0));

/* ------------------------------------------------------------------ diary */

export type DiaryRequirement = { teacherId: string; teacher: string; className: string; section: string; subject: string };

// Every (teacher, class, section, subject) a diary is expected for: one row per
// subject of each subject assignment of each teacher.
export function diaryRequirements(teachers: any[]): DiaryRequirement[] {
  const rows: DiaryRequirement[] = [];
  const seen = new Set<string>();
  for (const t of teachers || []) {
    if (t?.role && t.role !== "teacher") continue;
    const teacherId = String(t?._id || t?.name || "");
    for (const a of assignmentsOf(t)) {
      for (const className of splitList(a.className)) {
        for (const subject of splitList(a.subject)) {
          const row = {
            teacherId,
            teacher: String(t?.name || "").trim(),
            className: String(className || "").trim(),
            section: String(a.section || "").trim(),
            subject: String(subject || "").trim(),
          };
          const key = [teacherId || row.teacher, nz(row.className), nz(row.section), nz(row.subject)].join("|");
          if (seen.has(key)) continue;
          seen.add(key);
          rows.push(row);
        }
      }
    }
  }
  return rows;
}

// A diary counts for a requirement when it was written for the same class and
// subject. A diary saved without a section counts for every section of that
// class (same rule the Daily Diary page uses).
export const diaryMatches = (entry: any, row: { className: string; section: string; subject: string }): boolean =>
  nz(entry?.className) === nz(row.className) &&
  nz(entry?.subject) === nz(row.subject) &&
  (!entry?.section || !nz(row.section) || nz(entry.section) === nz(row.section));

export type DiaryGap = DiaryRequirement & { date?: string };

export type DiarySummary = {
  total: number; // S - total subjects
  submitted: number; // D - diaries written
  remaining: number; // R - diaries still missing
  complete: number; // teachers / rows fully done (kept for the detail view)
  rows: DiaryGap[]; // one row per subject whose diary is still missing
  byTeacher: { teacher: string; total: number; submitted: number; remaining: number; subjects: DiaryGap[] }[];
};

export function diarySummary(required: DiaryRequirement[], entries: any[], date = ""): DiarySummary {
  const requirements = required || [];
  const rows: DiaryGap[] = [];
  const byTeacher = new Map<string, { teacher: string; total: number; submitted: number; remaining: number; subjects: DiaryGap[] }>();
  let submitted = 0;
  for (const req of requirements) {
    const done = (entries || []).some((e) => diaryMatches(e, req));
    const key = req.teacherId || req.teacher;
    const group = byTeacher.get(key) || { teacher: req.teacher, total: 0, submitted: 0, remaining: 0, subjects: [] };
    group.total++;
    if (done) {
      submitted++;
      group.submitted++;
    } else {
      group.remaining++;
      group.subjects.push({ ...req, date });
      rows.push({ ...req, date });
    }
    byTeacher.set(key, group);
  }
  const total = requirements.length;
  return {
    total,
    submitted,
    remaining: remainingOf(total, submitted),
    complete: [...byTeacher.values()].filter((g) => g.remaining === 0).length,
    rows,
    byTeacher: [...byTeacher.values()].sort((a, b) => a.teacher.localeCompare(b.teacher)),
  };
}

/* ------------------------------------------------------------------ tests */

export type TestGapRow = {
  className: string;
  section: string;
  subject: string;
  tests: number; // tests created for this class / subject
  entered: number; // tests whose marks are already entered
  totalMarks: number; // marks of every test
  enteredMarks: number; // marks of the tests that are marked
  remainingMarks: number; // marks still to be entered
};

export type TestSummary = {
  created: number; // T - tests created on the date
  marksEntered: number; // tests whose marks have been entered
  totalMarks: number; // M - total marks of those tests
  enteredMarks: number;
  remainingMarks: number; // R - marks still to be entered
  rows: TestGapRow[];
};

// Only tests (type = "test", the Papers / Tests tab) count here - exams have
// their own Marks Entry page and their results are shown by Result & Card.
export function testSummary(papers: any[], marks: any[]): TestSummary {
  const markedPapers = new Set((marks || []).map((m) => String(m?.paper?._id || m?.paper || "")).filter(Boolean));
  const groups = new Map<string, TestGapRow>();
  const summary: TestSummary = { created: 0, marksEntered: 0, totalMarks: 0, enteredMarks: 0, remainingMarks: 0, rows: [] };
  for (const p of papers || []) {
    if ((p?.type || "test") !== "test") continue;
    const row: TestGapRow =
      groups.get([nz(p.className), nz(p.section), nz(p.subject)].join("|")) || {
        className: String(p.className || "").trim(),
        section: String(p.section || "").trim(),
        subject: String(p.subject || "").trim() || "-",
        tests: 0,
        entered: 0,
        totalMarks: 0,
        enteredMarks: 0,
        remainingMarks: 0,
      };
    const totalMarks = Number(p.totalMarks) || 0;
    const marked = markedPapers.has(String(p._id));
    row.tests++;
    row.totalMarks += totalMarks;
    summary.created++;
    summary.totalMarks += totalMarks;
    if (marked) {
      row.entered++;
      row.enteredMarks += totalMarks;
      summary.marksEntered++;
      summary.enteredMarks += totalMarks;
    }
    groups.set([nz(p.className), nz(p.section), nz(p.subject)].join("|"), row);
  }
  summary.remainingMarks = remainingOf(summary.totalMarks, summary.enteredMarks);
  summary.rows = [...groups.values()]
    .map((r) => ({ ...r, remainingMarks: remainingOf(r.totalMarks, r.enteredMarks) }))
    .sort(
      (a, b) =>
        a.className.localeCompare(b.className, undefined, { numeric: true }) ||
        a.section.localeCompare(b.section, undefined, { numeric: true }) ||
        a.subject.localeCompare(b.subject),
    );
  return summary;
}

/* ------------------------------------------------------------- attendance */

export type AttendanceTotals = {
  total: number; // people on the roster
  present: number;
  absent: number;
  leave: number;
  marked: number;
  unmarked: number;
  pct: number; // present out of what was marked
};

// totals for one day: `records` are the saved rows, `roster` the people who
// should have been marked (so unmarked people are visible instead of missing).
export function attendanceTotals(records: any[], roster: any[] = []): AttendanceTotals {
  const counted = new Map<string, string>();
  for (const r of records || []) {
    const id = String(r?.student?._id || r?.student || r?.staff?._id || r?.staff || "");
    if (!id) continue;
    counted.set(id, String(r?.status || ""));
  }
  let present = 0,
    absent = 0,
    leave = 0;
  for (const status of counted.values()) {
    if (status === "Present") present++;
    else if (status === "Absent") absent++;
    else if (status === "Leave") leave++;
  }
  const marked = present + absent + leave;
  const total = Math.max((roster || []).length, counted.size);
  return { total, present, absent, leave, marked, unmarked: Math.max(0, total - counted.size), pct: attendancePct(present, marked) };
}

/* --------------------------------------------------------------- strength */

export type ClassStrength = { className: string; total: number };

// Studying students per class (or per class + section when `bySection` is set),
// sorted the way a school reads classes: 1, 2 ... 10.
export function classStrength(students: any[], bySection = false): (ClassStrength & { section: string })[] {
  const map = new Map<string, ClassStrength & { section: string }>();
  for (const s of students || []) {
    const name = String(s?.className || "").trim();
    if (!name) continue;
    const section = bySection ? String(s?.section || "").trim() : "";
    const key = [nz(name), nz(section)].join("|");
    const row = map.get(key) || { className: name, section, total: 0 };
    row.total++;
    map.set(key, row);
  }
  return [...map.values()].sort(
    (a, b) =>
      a.className.localeCompare(b.className, undefined, { numeric: true }) ||
      a.section.localeCompare(b.section, undefined, { numeric: true }),
  );
}

// A staff account is a teacher unless its type says otherwise (schema default
// is "Teacher"), so "Other staff" = role teacher + type "Staff".
export const isTeacherAccount = (u: any): boolean => String(u?.type || "Teacher").trim().toLowerCase() !== "staff";

export function staffStrength(users: any[]): { teachers: number; staff: number; total: number } {
  const people = (users || []).filter((u) => !u?.role || u.role === "teacher");
  const teachers = people.filter(isTeacherAccount).length;
  return { teachers, staff: people.length - teachers, total: people.length };
}
