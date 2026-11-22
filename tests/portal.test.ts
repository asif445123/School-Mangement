import test from 'node:test';
import assert from 'node:assert/strict';
import {
  childClassLine, childTitle, isPortalPath, isPortalSection, parsePortalPath, portalPath, portalSections,
} from '../src/lib/portal-routes';
import {
  availableChalanMonths, chalanForMonth, formatMonthLabel, previousPendingForMonth,
} from '../src/lib/fee-calculation';

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

test('the portal fee page shows one chalan for the picked month only', () => {
  const fees = [
    { _id: 'a', month: '2026-09', chalanNo: 'C-SEP', amount: 5000, paid: 5000 },
    { _id: 'b', month: '2026-10', chalanNo: 'C-OCT', amount: 5000, paid: 2000 },
    { _id: 'c', month: '2026-11', chalanNo: 'C-NOV', amount: 5000, paid: 0 },
  ];
  // exactly one voucher per month, never the whole history at once
  assert.equal(chalanForMonth(fees, '2026-10')?.chalanNo, 'C-OCT');
  assert.equal(chalanForMonth(fees, '2026-12'), null);
  // previous pending counts only earlier unpaid balances
  assert.equal(previousPendingForMonth(fees, '2026-09'), 0);
  assert.equal(previousPendingForMonth(fees, '2026-10'), 0); // September is fully paid
  assert.equal(previousPendingForMonth(fees, '2026-11'), 3000); // October still owes 3000
  assert.equal(previousPendingForMonth(fees, '2026-12'), 8000); // October 3000 + November 5000
  // the opening balance is previous pending, never a monthly chalan
  const withOpening = [...fees, { _id: 'o', month: '0000-00', chalanNo: 'OPEN-1', amount: 1500, paid: 500 }];
  assert.equal(chalanForMonth(withOpening, '2026-09')?.chalanNo, 'C-SEP');
  assert.equal(previousPendingForMonth(withOpening, '2026-09'), 1000);
  assert.deepEqual(availableChalanMonths(withOpening), ['2026-11', '2026-10', '2026-09']);
  assert.equal(formatMonthLabel('2026-10'), 'Oct 2026');
  assert.equal(formatMonthLabel('0000-00'), 'Previous pending');
});
