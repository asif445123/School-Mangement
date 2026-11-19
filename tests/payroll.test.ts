import test from "node:test";
import assert from "node:assert/strict";
import { salaryTotals, validAmount } from "../src/lib/payroll";

const draft = { month: "2026-11", basic: 10000, allowances: 500, bonus: 800, overtime: 100,
  attendance: 333.33, other: 50 };
const loan = { _id: "a", date: "2026-11-14", installment: 1000, amount: 10000, recovered: 0 };

test("draft net includes earnings, attendance and only eligible outstanding installments", () => {
  const result = salaryTotals(draft, [loan, { ...loan, _id: "b", recovered: 9900 }, { ...loan, _id: "c", date: "2026-12-01" }]);
  assert.equal(result.advance, 1100);
  assert.equal(result.net, 9916.67);
  assert.deepEqual([...result.payments], [["a", 1000], ["b", 100]]);
  assert.equal(loan.recovered, 0);
});

test("recovery cannot exceed available earnings and oldest advance is recovered first", () => {
  const result = salaryTotals({ ...draft, other: 10000 }, [loan, { ...loan, _id: "older", date: "2026-10-01" }]);
  assert.equal(result.net, 0);
  assert.deepEqual([...result.payments], [["older", 1000], ["a", 66.67]]);
});

test("paid slip uses its recorded recovery even after the advance is cleared", () => {
  const paid = salaryTotals({ ...draft, paidOn: new Date(), recovered: 1000 }, [{ ...loan, recovered: loan.amount }]);
  assert.equal(paid.net, 10016.67);
  assert.equal(paid.payments.size, 0);
});

test("validate monetary inputs", () => {
  assert.ok(validAmount(0) && validAmount(199.99));
  for (const n of [-1, 0.001, NaN, Infinity, null, "100"]) assert.equal(validAmount(n), false);
});
