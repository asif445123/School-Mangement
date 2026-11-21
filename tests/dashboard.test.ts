import test from "node:test";
import assert from "node:assert/strict";
import {
  attendanceTotals,
  classStrength,
  diaryRequirements,
  diarySummary,
  isTeacherAccount,
  remainingOf,
  staffStrength,
  testSummary,
} from "../src/lib/dashboard-summary";

const teacher = (over: any = {}) => ({ _id: "t1", name: "Ms. Ayesha", role: "teacher", type: "Teacher", teacherType: "Subject teacher", className: "5", section: "A", subject: "Maths", ...over });

test("diary S / D / R counts one row per subject of a teacher", () => {
  const teachers = [
    teacher(), // Class 5 A - Maths
    teacher({ _id: "t2", name: "Mr. Bilal", subject: "English" }), // Class 5 A - English
    teacher({ _id: "t3", name: "Ms. Sara", className: "6", section: "", subject: "Maths, Science" }), // 2 subjects
  ];
  assert.equal(diaryRequirements(teachers).length, 4);

  const entries = [
    { className: "5", section: "A", subject: "maths" }, // case / spacing does not matter
    { className: "6", section: "B", subject: "Science" }, // no section on the assignment = every section
  ];
  const summary = diarySummary(diaryRequirements(teachers), entries, "2026-11-21");
  assert.equal(summary.total, 4); // S
  assert.equal(summary.submitted, 2); // D
  assert.equal(summary.remaining, 2); // R
  assert.deepEqual(summary.rows.map((r) => `${r.teacher}|${r.subject}`).sort(), ["Mr. Bilal|English", "Ms. Sara|Maths"]);
  assert.equal(summary.byTeacher.find((g) => g.teacher === "Ms. Sara")!.remaining, 1);
});

test("a diary saved without a section counts for every section of the class", () => {
  const entries = [{ className: "5", section: "", subject: "Maths" }];
  const summary = diarySummary(diaryRequirements([teacher({ section: "B" }), teacher({ _id: "t2", section: "C" })]), entries);
  assert.equal(summary.submitted, 2);
  assert.equal(summary.remaining, 0);
});

test("duplicate assignments are counted once", () => {
  const t = teacher({ assignments: [{ teacherType: "Subject teacher", className: "5", section: "A", subject: "Maths" }] });
  assert.equal(diaryRequirements([t]).length, 1);
});

test("tests T / M / R only counts tests, not exams", () => {
  const papers = [
    { _id: "p1", type: "test", className: "5", section: "A", subject: "Maths", totalMarks: 25 },
    { _id: "p2", type: "test", className: "5", section: "A", subject: "Maths", totalMarks: 25 },
    { _id: "p3", type: "test", className: "6", section: "", subject: "English", totalMarks: 50 },
    { _id: "p4", type: "exam", className: "5", section: "A", subject: "Maths", totalMarks: 100 },
  ];
  const summary = testSummary(papers, [{ paper: "p1" }, { paper: "p3" }]);
  assert.equal(summary.created, 3); // T
  assert.equal(summary.marksEntered, 2);
  assert.equal(summary.totalMarks, 100); // M
  assert.equal(summary.enteredMarks, 75);
  assert.equal(summary.remainingMarks, 25); // R
  assert.equal(summary.rows.length, 2);
  assert.equal(summary.rows.find((r) => r.className === "5")!.remainingMarks, 25);
  assert.equal(summary.rows.find((r) => r.className === "6")!.remainingMarks, 0);
});

test("remaining is never negative", () => {
  assert.equal(remainingOf(10, 12), 0);
  assert.equal(remainingOf(10, 4), 6);
  assert.equal(remainingOf(0, 0), 0);
  assert.equal(remainingOf(undefined as any, 3), 0);
});

test("attendance totals keep unmarked people visible", () => {
  const records = [{ student: "s1", status: "Present" }, { student: "s2", status: "Absent" }, { student: "s3", status: "Leave" }];
  const totals = attendanceTotals(records, [{ _id: "s1" }, { _id: "s2" }, { _id: "s3" }, { _id: "s4" }, { _id: "s5" }]);
  assert.deepEqual({ ...totals }, { total: 5, present: 1, absent: 1, leave: 1, marked: 3, unmarked: 2, pct: 33 });
  // staff rows carry `staff` instead of `student`
  const staff = attendanceTotals([{ staff: "u1", status: "Present" }, { staff: "u2", status: "Present" }], [{ _id: "u1" }, { _id: "u2" }]);
  assert.equal(staff.present, 2);
  assert.equal(staff.pct, 100);
  assert.equal(attendanceTotals([], []).pct, 0);
});

test("student strength is grouped per class and sorted 1, 2 ... 10", () => {
  const rows = classStrength([
    { className: "10" }, { className: "2" }, { className: "1" }, { className: "2" }, { className: "" },
  ]);
  assert.deepEqual(rows, [
    { className: "1", section: "", total: 1 },
    { className: "2", section: "", total: 2 },
    { className: "10", section: "", total: 1 },
  ]);
});

test("student strength can be split per section", () => {
  const rows = classStrength(
    [{ className: "5", section: "A" }, { className: "5", section: "B" }, { className: "5", section: "A" }, { className: "5" }],
    true,
  );
  assert.deepEqual(rows, [
    { className: "5", section: "", total: 1 },
    { className: "5", section: "A", total: 2 },
    { className: "5", section: "B", total: 1 },
  ]);
});

test("teachers and other staff are counted separately", () => {
  assert.equal(isTeacherAccount({ type: "Teacher" }), true);
  assert.equal(isTeacherAccount({ type: "" }), true); // schema default
  assert.equal(isTeacherAccount({ type: "Staff" }), false);
  assert.deepEqual(staffStrength([{ name: "a" }, { name: "b", type: "Teacher" }, { name: "c", type: "Staff" }, { name: "d", type: "staff" }]), { teachers: 2, staff: 2, total: 4 });
});
