import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SCHOOL_DAY_MINUTES, dayCode, deductionAmount, deductionBreakdown, deductionDays, earlyMinutesOf, lateMinutesOf, monthlyRows, schoolDayMinutes, timingKey, withTiming } from "../src/lib/staff-attendance";

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

test("deduction rule: late / early minutes are deducted per minute", () => {
  assert.equal(deductionDays(0, 0, 0), 0);
  // 300 late minutes on a 300-minute school day = 1 deduction day
  assert.equal(deductionDays(0, 300, 0, 300), 1);
  assert.equal(deductionDays(0, 0, 150, 300), 0.5);
  assert.equal(deductionDays(2, 30, 0, 300), 2.1);
  // fallback 480-minute day when no day length is given
  assert.equal(deductionDays(0, 480, 0), 1);
  assert.equal(deductionDays(0, 240, 0), 0.5);
  // a flagged late/early with 0 minutes deducts nothing
  assert.equal(deductionDays(0, 0, 0, 300), 0);
});

test("school day minutes come from the designation timing with an 8-hour fallback", () => {
  assert.equal(schoolDayMinutes({ arrivalTime: "09:00", departureTime: "14:00" }), 300);
  assert.equal(schoolDayMinutes({ arrivalTime: "08:00", departureTime: "16:00" }), 480);
  assert.equal(schoolDayMinutes(null), DEFAULT_SCHOOL_DAY_MINUTES);
  assert.equal(schoolDayMinutes({}), DEFAULT_SCHOOL_DAY_MINUTES);
  assert.equal(schoolDayMinutes({ arrivalTime: "14:00", departureTime: "09:00" }), DEFAULT_SCHOOL_DAY_MINUTES);
  assert.equal(schoolDayMinutes({ arrivalTime: "09:00", departureTime: "09:00" }), DEFAULT_SCHOOL_DAY_MINUTES);
});

test("deduction breakdown splits absent, late-minute and early-minute deductions", () => {
  const b = deductionBreakdown(1, 10, 10, 30000, 300);
  assert.equal(b.absentDeduction, 1000);
  assert.equal(b.lateDeduction, 33.33);
  assert.equal(b.earlyDeduction, 33.33);
  assert.equal(b.deduction, 1066.66);
  assert.ok(Math.abs(b.dedDays - (1 + 20 / 300)) < 1e-9);
  assert.equal(b.dayMinutes, 300);
  // no salary / no minutes -> no deduction
  assert.equal(deductionBreakdown(0, 0, 0, 30000, 300).deduction, 0);
  assert.equal(deductionBreakdown(2, 60, 60, 0, 300).deduction, 0);
  // 1 minute late on a 300-minute day at Rs 30,000 = Rs 3.33
  assert.equal(deductionBreakdown(0, 1, 0, 30000, 300).lateDeduction, 3.33);
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
  assert.equal(rows[0].dayMinutes, 300);
  assert.equal(rows[0].absentDeduction, 1000);
  assert.equal(rows[0].lateDeduction, 33.33);
  assert.equal(rows[0].earlyDeduction, 33.33);
  assert.ok(Math.abs(rows[0].dedDays - (1 + 20 / 300)) < 1e-9);
  assert.equal(rows[0].deduction, 1066.66);
  assert.equal(rows[1].leave, 1);
  assert.equal(rows[1].dayMinutes, DEFAULT_SCHOOL_DAY_MINUTES);
  assert.equal(rows[1].absentDeduction, 0);
  assert.equal(rows[1].lateDeduction, 0);
  assert.equal(rows[1].earlyDeduction, 0);
  assert.equal(rows[1].deduction, 0);
});
