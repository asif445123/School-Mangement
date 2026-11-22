import test from 'node:test';
import assert from 'node:assert/strict';
import {
  childClassLine, childTitle, isPortalPath, isPortalSection, parsePortalPath, portalPath, portalSections,
} from '../src/lib/portal-routes';
import {
  availableChalanMonths, chalanForMonth, formatMonthLabel, portalChalanRows, previousPendingForMonth,
} from '../src/lib/fee-calculation';
import { chalanRows } from '../src/lib/chalan';

test('each portal section has its own child address and a matching label', () => {
  assert.deepEqual(portalSections.map((s) => s.key), ['fees', 'diary', 'tests', 'exams']);
  for (const section of portalSections) {
    const href = portalPath('abc123', section.key);
    assert.equal(href, `/my/abc123/${section.key}`);
    assert.deepEqual(parsePortalPath(href), { childId: 'abc123', section: section.key });
  }
  assert.equal(portalPath('', 'fees'), '/my//fees');
});

test('portal paths are recognised separately from every other page', () => {
  assert.equal(isPortalPath('/my'), true);
  assert.equal(isPortalPath('/my/abc123/fees'), true);
  assert.equal(isPortalPath('/my-fees'), false);
  assert.equal(isPortalPath('/fees'), false);
  assert.equal(parsePortalPath('/my'), null);          // the family overview has no section
  assert.equal(parsePortalPath('/my/abc123'), null);   // opens the default section via a redirect
  assert.equal(parsePortalPath('/my/abc123/marks'), null);
  assert.equal(parsePortalPath('/my/abc123/fees/extra'), null);
  assert.deepEqual(parsePortalPath('/my/abc123/fees/'), { childId: 'abc123', section: 'fees' });
  assert.equal(isPortalSection('exams'), true);
  assert.equal(isPortalSection('results'), false);
});

test('a child header reads naturally for sons and daughters', () => {
  assert.equal(childTitle({ name: 'Ahmed', fatherName: 'Ali', gender: 'Male' }), 'Ahmed son of Ali');
  assert.equal(childTitle({ name: 'Sara', fatherName: 'Ali', gender: 'Female' }), 'Sara daughter of Ali');
  assert.equal(childTitle({ name: 'Ahmed', fatherName: 'Ali' }), 'Ahmed · Father: Ali');
  assert.equal(childTitle({ name: 'Ahmed' }), 'Ahmed');
  assert.equal(childClassLine({ className: '5', section: 'A', rollNo: '12' }), 'Class 5 A · Roll # 12');
  assert.equal(childClassLine({ className: '5' }), 'Class 5');
});

test('the portal fee page lists all chalans of the student newest month first', () => {
  const fees = [
    { _id: 'a', month: '2026-09', chalanNo: 'C-SEP', actualFee: 5000, discount: 0, amount: 5000, paid: 5000 },
    { _id: 'o', month: '0000-00', chalanNo: 'OPEN-1', actualFee: 1500, discount: 0, amount: 1500, paid: 500 },
    { _id: 'c', month: '2026-11', chalanNo: 'C-NOV', actualFee: 5000, discount: 500, admissionFee: 1000, annualCharges: 200, amount: 5700, paid: 0 },
    { _id: 'b', month: '2026-10', chalanNo: 'C-OCT', actualFee: 5000, discount: 0, amount: 5000, paid: 2000 },
  ];

  const rows = portalChalanRows(fees);
  // Every chalan of the student (all months + opening balance) is returned, sorted newest month first
  assert.deepEqual(rows.map((r) => r.chalanNo), ['C-NOV', 'C-OCT', 'C-SEP', 'OPEN-1']);
  assert.deepEqual(rows.map((r) => r.monthLabel), ['Nov 2026', 'Oct 2026', 'Sep 2026', 'Previous pending']);
  assert.deepEqual(rows.map((r) => r.isOpening), [false, false, false, true]);
  assert.deepEqual(rows.map((r) => r.status), ['unpaid', 'partial', 'paid', 'partial']);
  assert.deepEqual(rows.map((r) => r.balance), [5700, 3000, 0, 1000]);

  // Previous pending is populated on each row so printed vouchers match PNG vouchers
  assert.deepEqual(rows.map((r) => r.previous), [4000, 1000, 1000, 0]);
  const novPrint = chalanRows(rows[0]);
  assert.equal(novPrint.previous, 4000);
  assert.equal(novPrint.total, 9700);
  assert.equal(novPrint.balance, 9700);

  // Empty list is safe
  assert.deepEqual(portalChalanRows([]), []);
});

test('month and previous-pending helpers compute per-month values accurately', () => {
  const fees = [
    { _id: 'a', month: '2026-09', chalanNo: 'C-SEP', amount: 5000, paid: 5000 },
    { _id: 'b', month: '2026-10', chalanNo: 'C-OCT', amount: 5000, paid: 2000 },
    { _id: 'c', month: '2026-11', chalanNo: 'C-NOV', amount: 5000, paid: 0 },
  ];
  assert.equal(chalanForMonth(fees, '2026-10')?.chalanNo, 'C-OCT');
  assert.equal(chalanForMonth(fees, '2026-12'), null);
  assert.equal(previousPendingForMonth(fees, '2026-09'), 0);
  assert.equal(previousPendingForMonth(fees, '2026-10'), 0); // September is fully paid
  assert.equal(previousPendingForMonth(fees, '2026-11'), 3000); // October still owes 3000
  assert.equal(previousPendingForMonth(fees, '2026-12'), 8000); // October 3000 + November 5000
  const withOpening = [...fees, { _id: 'o', month: '0000-00', chalanNo: 'OPEN-1', amount: 1500, paid: 500 }];
  assert.equal(chalanForMonth(withOpening, '2026-09')?.chalanNo, 'C-SEP');
  assert.equal(previousPendingForMonth(withOpening, '2026-09'), 1000);
  assert.deepEqual(availableChalanMonths(withOpening), ['2026-11', '2026-10', '2026-09']);
  assert.equal(formatMonthLabel('2026-10'), 'Oct 2026');
  assert.equal(formatMonthLabel('0000-00'), 'Previous pending');
});
