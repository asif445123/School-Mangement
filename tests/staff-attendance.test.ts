import test from "node:test";
import assert from "node:assert/strict";
import { dayCode, deductionAmount, deductionDays, earlyMinutesOf, lateMinutesOf } from "../src/lib/staff-attendance";

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
