import test from "node:test";
import assert from "node:assert/strict";
import { dayCode, deductionAmount, deductionDays, earlyMinutesOf, lateMinutesOf, monthlyRows, timingKey, withTiming } from "../src/lib/staff-attendance";

test("late minutes are computed against the scheduled arrival time", () => {
  assert.equal(lateMinutesOf("09:10", "09:00"), 10);
  assert.equal(lateMinutesOf("09:00", "09:00"), 0);
  assert.equal(lateMinutesOf("08:50", "09:00"), 0);
  assert.equal(lateMinutesOf("", "09:00"), 0);
  assert.equal(lateMinutesOf("09:00", ""), 0);
});

test("early minutes are computed against the scheduled departure time", () => {
  assert.equal(earlyMinutesOf("13:50", "14:00"), 10);
  assert.equal(earlyMinutesOf("14:00", "14:00"), 0);
  assert.equal(earlyMinutesOf("14:10", "14:00"), 0);
  assert.equal(earlyMinutesOf("", "14:00"), 0);
});

test("deduction rule: 3 late / early departures count as 1 day", () => {
  assert.equal(deductionDays(0, 0, 0), 0);
  assert.equal(deductionDays(0, 3, 0), 1);
  assert.equal(deductionDays(0, 0, 3), 1);
  assert.equal(deductionDays(0, 4, 4), 2);
  assert.equal(deductionDays(2, 3, 0), 3);
});

test("deduction amount = deduction days * (salary / 30)", () => {
  assert.equal(deductionAmount(1, 10000), 333.33);
  assert.equal(deductionAmount(3, 10000), 1000);
  assert.equal(deductionAmount(0, 10000), 0);
});

test("day code shows the status with late / early markers", () => {
  assert.equal(dayCode("Present", false, false), "P");
  assert.equal(dayCode("Present", true, false), "P*");
  assert.equal(dayCode("Leave", false, true), "L^");
  assert.equal(dayCode("Absent", true, true), "A*^");
});

test("midnight and invalid times are handled correctly", () => {
  assert.equal(lateMinutesOf("00:10", "00:00"), 10);
  assert.equal(earlyMinutesOf("00:00", "00:20"), 20);
  assert.equal(lateMinutesOf("25:00", "09:00"), 0);
});


test("reports calculate minutes from the current matching timing, including old records", () => {
  const record = { arrivalTime: "09:15", departureTime: "13:40", lateArrival: false, earlyDeparture: false, lateMinutes: 0, earlyMinutes: 0 };
  const updated = withTiming(record, { arrivalTime: "09:00", departureTime: "14:00" });
  assert.equal(updated.lateMinutes, 15);
  assert.equal(updated.earlyMinutes, 20);
  assert.equal(updated.lateArrival, true);
  assert.equal(updated.earlyDeparture, true);
  assert.equal(timingKey("  TEACHER "), "teacher");
  assert.equal(timingKey(""), "teacher");
  assert.deepEqual(withTiming({ lateArrival: true, lateMinutes: 7 }, null), { lateArrival: true, earlyDeparture: false, lateMinutes: 7, earlyMinutes: 0 });
});

test("monthly sheet survives JSON serialization and includes deductions and timing totals", () => {
  const staffs = [{ _id: "1", name: "Teacher", designation: "", monthlySalary: 30000 }, { _id: "2", name: "Other", designation: "Staff", monthlySalary: 0 }];
  const records = [
    { staff: "1", date: "2026-11-01", status: "Absent" },
    { staff: "1", date: "2026-11-02", status: "Present", arrivalTime: "09:10", departureTime: "13:50" },
    { staff: "1", date: "2026-11-03", status: "Present", lateArrival: true },
    { staff: "2", date: "2026-11-04", status: "Leave" },
    { staff: "other", date: "2026-11-05", status: "Absent" },
  ];
  const rows = JSON.parse(JSON.stringify(monthlyRows(staffs, records, new Map([["teacher", { arrivalTime: "09:00", departureTime: "14:00" }]]))));
  assert.equal(rows[0].byDay[2].lateMinutes, 10);
  assert.equal(dayCode(rows[0].byDay[2].status, rows[0].byDay[2].lateArrival, rows[0].byDay[2].earlyDeparture), "P*^");
  assert.equal(rows[0].present, 2);
  assert.equal(rows[0].absent, 1);
  assert.equal(rows[0].lateDays, 2);
  assert.equal(rows[0].earlyDays, 1);
  assert.equal(rows[0].lateMinutes, 10);
  assert.equal(rows[0].earlyMinutes, 10);
  assert.equal(rows[0].dedDays, 2);
  assert.equal(rows[0].deduction, 2000);
  assert.equal(rows[1].leave, 1);
  assert.equal(rows[1].deduction, 0);
});
