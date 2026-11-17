import test from "node:test";
import assert from "node:assert/strict";
import Attendance from "../src/models/attendance";
import {
  attendancePct,
  daysInMonth,
  isValidDate,
  isValidMonth,
  monthlyCounts,
  normalizeAttendanceStatus,
  summarizeDay,
  summarizeMonth,
} from "../src/lib/attendance";

test("status accepts full words and P / A / L, rejects anything else", () => {
  assert.equal(normalizeAttendanceStatus("Present"), "Present");
  assert.equal(normalizeAttendanceStatus("absent"), "Absent");
  assert.equal(normalizeAttendanceStatus("LEAVE"), "Leave");
  assert.equal(normalizeAttendanceStatus("P"), "Present");
  assert.equal(normalizeAttendanceStatus("a"), "Absent");
  assert.equal(normalizeAttendanceStatus("L"), "Leave");
  assert.equal(normalizeAttendanceStatus(""), "");
  assert.equal(normalizeAttendanceStatus("late"), "");
  assert.equal(normalizeAttendanceStatus(undefined), "");
});

test("date and month validation rejects impossible calendar values", () => {
  assert.equal(isValidDate("2026-11-14"), true);
  assert.equal(isValidDate("2024-02-29"), true); // leap year
  assert.equal(isValidDate("2026-02-29"), false);
  assert.equal(isValidDate("2026-13-01"), false);
  assert.equal(isValidDate("14-11-2026"), false);
  assert.equal(isValidDate(""), false);
  assert.equal(isValidMonth("2026-11"), true);
  assert.equal(isValidMonth("2026-13"), false);
  assert.equal(isValidMonth("2026-1"), false);
  assert.equal(daysInMonth("2026-02"), 28);
  assert.equal(daysInMonth("2024-02"), 29);
  assert.equal(daysInMonth("2026-11"), 30);
  assert.equal(daysInMonth("2026-01"), 31);
});

test("attendance % is present out of marked days, 0 when nothing is marked", () => {
  assert.equal(attendancePct(18, 20), 90);
  assert.equal(attendancePct(0, 1), 0);
  assert.equal(attendancePct(0, 0), 0);
});

test("monthly counts keep P / A / L per day and ignore other months", () => {
  const records = [
    { student: "s1", date: "2026-11-03", status: "Present" },
    { student: "s1", date: "2026-11-04", status: "A" },
    { student: "s1", date: "2026-11-05", status: "Leave" },
    { student: "s1", date: "2026-10-05", status: "Absent" }, // other month
    { student: "s1", date: "2026-11-06", status: "bogus" },
  ];
  const m = monthlyCounts(records as any, "2026-11");
  assert.equal(m.byDay.get(3), "Present");
  assert.equal(m.byDay.get(4), "Absent");
  assert.equal(m.byDay.get(5), "Leave");
  assert.equal(m.byDay.has(6), false);
  assert.deepEqual([m.present, m.absent, m.leave, m.marked, m.pct], [1, 1, 1, 3, 33]);
});

test("class-wise summary groups by class + section and counts unmarked students", () => {
  const students = [
    { _id: "1", className: "1", section: "A" },
    { _id: "2", className: "1", section: "A" },
    { _id: "3", className: "1", section: "B" },
    { _id: "4", className: "2", section: "" },
  ];
  const records = [
    { student: "1", date: "2026-11-14", status: "Present" },
    { student: "2", date: "2026-11-14", status: "Absent" },
    { student: "3", date: "2026-11-14", status: "Leave" },
    // student 4 has no record yet
  ];
  const rows = summarizeDay(students as any, records as any);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { className: "1", section: "A", total: 2, present: 1, absent: 1, leave: 0, marked: 2, unmarked: 0, pct: 50 });
  assert.deepEqual(rows[1], { className: "1", section: "B", total: 1, present: 0, absent: 0, leave: 1, marked: 1, unmarked: 0, pct: 0 });
  assert.deepEqual(rows[2], { className: "2", section: "", total: 1, present: 0, absent: 0, leave: 0, marked: 0, unmarked: 1, pct: 0 });
});

test("month summary adds up every marked day per class", () => {
  const students = [
    { _id: "1", className: "1", section: "A" },
    { _id: "2", className: "1", section: "A" },
  ];
  const records = [
    { student: "1", date: "2026-11-02", status: "Present" },
    { student: "1", date: "2026-11-03", status: "Absent" },
    { student: "1", date: "2026-11-04", status: "Leave" },
    { student: "2", date: "2026-11-02", status: "Present" },
    { student: "9", date: "2026-11-02", status: "Absent" }, // not on the roster any more
  ];
  const rows = summarizeMonth(students as any, records as any);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { className: "1", section: "A", total: 2, present: 2, absent: 1, leave: 1, marked: 4, unmarked: 0, pct: 50 });
});

test("attendance model stores one status per student per day", () => {
  const row = new Attendance({ school: "012345678901234567890123", student: "012345678901234567890124", date: "2026-11-14", status: "Present", className: "1", section: "A" });
  assert.equal(row.validateSync(), undefined);
  assert.ok(new Attendance({ school: "012345678901234567890123", student: "012345678901234567890124", date: "2026-11-14", status: "Late" }).validateSync()?.errors.status);
});
