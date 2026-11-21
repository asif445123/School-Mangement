import test from "node:test";
import assert from "node:assert/strict";
import { feeCollectionBand, feeReportSummary } from "../src/lib/fee-report";

test("fee report totals current month fees, collections, pending and previous balances", () => {
  const report = feeReportSummary([
    { amount: 5000, paid: 1000, previous: 0 },
    { amount: 3000, paid: 3000, previous: 1200 },
    { amount: 2000, paid: 0, previous: 500 },
  ]);

  assert.deepEqual(
    {
      totalFee: report.totalFee,
      previousPending: report.previousPending,
      received: report.received,
      thisMonthPending: report.thisMonthPending,
      totalBalance: report.totalBalance,
      collectionPercent: report.collectionPercent,
    },
    { totalFee: 10000, previousPending: 1700, received: 4000, thisMonthPending: 6000, totalBalance: 7700, collectionPercent: 40 },
  );
  assert.deepEqual(report.rows.map(({ prev, pend, balance }) => ({ prev, pend, balance })), [
    { prev: 0, pend: 4000, balance: 4000 },
    { prev: 1200, pend: 0, balance: 1200 },
    { prev: 500, pend: 2000, balance: 2500 },
  ]);
});

test("fee collection percent is safe for empty/zero bills and capped at 100", () => {
  assert.equal(feeReportSummary([]).collectionPercent, 0);
  assert.equal(feeReportSummary([{ amount: 0, paid: 0 }]).collectionPercent, 0);
  assert.equal(feeReportSummary([{ amount: 100, paid: 150 }]).collectionPercent, 100);
  assert.equal(feeReportSummary([{ amount: 1000, paid: 251 }]).collectionPercent, 25.1);
  assert.equal(feeReportSummary([{ amount: "bad", paid: 10, previous: -4 }]).collectionPercent, 0);
});

test("fee collection uses the requested red, yellow, blue and green bands", () => {
  assert.equal(feeCollectionBand(0), "red");
  assert.equal(feeCollectionBand(25), "red");
  assert.equal(feeCollectionBand(25.1), "yellow");
  assert.equal(feeCollectionBand(50), "yellow");
  assert.equal(feeCollectionBand(50.1), "blue");
  assert.equal(feeCollectionBand(75), "blue");
  assert.equal(feeCollectionBand(75.1), "green");
  assert.equal(feeCollectionBand(100), "green");
  assert.equal(feeCollectionBand(120), "green");
});
