import test from 'node:test';
import assert from 'node:assert/strict';
import { FEE_INCOME, feePayments, financeSummary, splitRows } from '../src/lib/accounting';
import { typeFlags } from '../src/lib/account-flags';

const expenseType = { _id: 't1', name: 'Operating expense', isExpense: true };
const incomeType = { _id: 't2', name: 'Other income', isIncome: true };

test('feePayments prefers the payment list and falls back to receivedDate / month start', () => {
  const out = feePayments([
    { month: '2026-11', paid: 1500, receivedDate: '2026-11-03', payments: [{ amount: 1000, date: '2026-11-03' }, { amount: 500, date: '2026-11-09' }] },
    { month: '2026-10', paid: 1800, receivedDate: '2026-11-02', payments: [] }, // older chalan without a payment list
    { month: '2026-09', paid: 700, payments: undefined }, // no receivedDate either -> first of the chalan month
    { month: '2026-11', paid: 0, payments: [] }, // unpaid chalan contributes nothing
    { month: '2026-11', paid: 300, payments: [{ amount: 300, date: '' }] }, // date-less payment is dropped
  ]);
  assert.deepEqual(out, [
    { date: '2026-11-03', amount: 1000 },
    { date: '2026-11-09', amount: 500 },
    { date: '2026-11-02', amount: 1800 },
    { date: '2026-09-01', amount: 700 },
  ]);
});

test('splitRows files entries by account type flags and adds fee income', () => {
  const rows = splitRows([
    { date: '2026-11-05', amount: 25000, account: { _id: 'a1', name: 'Utilities', accountType: expenseType } },
    { date: '2026-11-08', amount: 12000, account: { _id: 'a2', name: 'Donations', accountType: incomeType } },
    { date: '2026-11-08', amount: 999, account: { _id: 'a3', name: 'Bank', accountType: { _id: 't9', name: 'Bank' } } }, // no flags -> neither side
    { date: '2026-11-08', amount: 555, account: null }, // deleted account -> skipped, never crashes
  ], [{ date: '2026-11-03', amount: 1500 }]);
  assert.deepEqual(rows.expense, [{ id: 'a1', name: 'Utilities', date: '2026-11-05', amount: 25000 }]);
  assert.deepEqual(rows.income, [
    { id: 'a2', name: 'Donations', date: '2026-11-08', amount: 12000 },
    { id: FEE_INCOME, name: 'Fee income', date: '2026-11-03', amount: 1500 },
  ]);
});

test('typeFlags still reads the legacy dropdown values', () => {
  assert.deepEqual(typeFlags({ dashboard: 'income', nature: 'receivable' }), { receivable: true, payable: false, income: true, expense: false });
  assert.deepEqual(typeFlags({ dashboard: 'expense', nature: 'payable', isIncome: false }), { receivable: false, payable: true, income: false, expense: true });
  assert.deepEqual(typeFlags(undefined), { receivable: false, payable: false, income: false, expense: false });
  // an explicit false checkbox wins over a stale legacy value
  assert.equal(typeFlags({ isExpense: false, dashboard: 'expense' }).expense, false);
});

test('financeSummary totals only the selected period (dashboard Finance cards)', () => {
  const entries = [
    { date: '2026-11-01', amount: 100, account: { _id: 'a1', name: 'Utilities', accountType: expenseType } }, // from-day counts
    { date: '2026-11-21', amount: 200, account: { _id: 'a1', name: 'Utilities', accountType: expenseType } }, // to-day counts
    { date: '2026-10-31', amount: 99999, account: { _id: 'a1', name: 'Utilities', accountType: expenseType } }, // October stays out of November
    { date: '2026-11-22', amount: 88888, account: { _id: 'a1', name: 'Utilities', accountType: expenseType } }, // after the period stays out
    { date: '2026-11-08', amount: 12000, account: { _id: 'a2', name: 'Donations', accountType: incomeType } },
    { date: '2026-11-09', amount: 60000, account: { _id: 'a3', name: 'Students receivable', accountType: { _id: 't3', isReceivable: true } } },
    { date: '2026-11-11', amount: 45000, account: { _id: 'a4', name: 'Salaries payable', accountType: { _id: 't4', isPayable: true } } },
  ];
  const s = financeSummary(entries, [{ date: '2026-11-03', amount: 1500 }, { date: '2026-10-12', amount: 700 }], '2026-11-01', '2026-11-21');
  assert.equal(s.expenseTotal, 300);
  assert.equal(s.incomeTotal, 13500); // 12000 other income + 1500 fee income; the October fee payment is excluded
  assert.equal(s.net, 13200);
  assert.equal(s.receivable, 60000);
  assert.equal(s.payable, 45000);
  assert.equal(s.income.find((r) => r.id === FEE_INCOME)?.amount, 1500);
});

test('financeSummary of a period without records is all zero (not an error)', () => {
  const s = financeSummary([], [], '2026-11-01', '2026-11-21');
  assert.deepEqual([s.incomeTotal, s.expenseTotal, s.net, s.receivable, s.payable], [0, 0, 0, 0, 0]);
  assert.deepEqual([s.income.length, s.expense.length], [0, 0]);
});
