import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanItem, cleanSupplier, cleanRequisition, stockOf, stockValue, belowAlert,
  supplierLedger, itemLedger, nextInvoiceNo, invoiceTotal,
} from '../src/lib/inventory-calc';

test('stock is opening stock plus stock in minus stock out', () => {
  const item = { openingStock: 50, rate: 100 };
  const moves = [
    { type: 'in', qty: 20 },   // purchase / manual in
    { type: 'out', qty: 30 },  // issued to a department
  ];
  assert.equal(stockOf(item, moves), 40);
  assert.equal(stockValue(item, moves), 4000);
  assert.equal(stockOf({}, []), 0);
});

test('minimum stock alert fires only when a limit is set', () => {
  const moves = [{ type: 'in', qty: 5 }];
  assert.equal(belowAlert({ openingStock: 0, minStock: 5 }, moves), true);
  assert.equal(belowAlert({ openingStock: 0, minStock: 4 }, moves), false);
  assert.equal(belowAlert({ openingStock: 100, minStock: 0 }, moves), false);
});

test('items, suppliers and requisitions are validated and trimmed', () => {
  assert.throws(() => cleanItem({ name: '   ' }), /Item name is required/);
  const item = cleanItem({ name: '  Books  ', category: 'Books', unit: 'pcs', rate: '50', openingStock: '10', minStock: '-5' });
  assert.deepEqual(item, { name: 'Books', category: 'Books', unit: 'pcs', rate: 50, openingStock: 10, minStock: 0 });
  assert.equal(cleanItem({ name: 'Copy', category: 'Nope' }).category, 'Stationery');

  assert.throws(() => cleanSupplier({}), /Supplier name is required/);
  assert.deepEqual(cleanSupplier({ name: 'Asif', phone: '0320', address: 'Faisalabad', openingPayable: '1000' }),
    { name: 'Asif', phone: '0320', address: 'Faisalabad', openingPayable: 1000 });

  assert.throws(() => cleanRequisition({ quantity: 2 }), /Item \/ description is required/);
  assert.throws(() => cleanRequisition({ item: 'Chalk', quantity: 0 }), /Quantity must be greater than 0/);
  const req = cleanRequisition({ date: '2026-11-20', item: 'Chalk', quantity: '3', status: 'Approved' });
  assert.equal(req.status, 'Approved');
  assert.equal(req.quantity, 3);
  assert.equal(cleanRequisition({ item: 'Chalk', quantity: 1, date: 'bad', status: 'Whatever' }).status, 'Pending');
});

test('supplier ledger = opening payable + purchases - payments', () => {
  const supplier = { _id: 's1', openingPayable: 1000 };
  const invoices = [
    { _id: 'i1', supplier: 's1', invoiceNo: 'PI-0001', date: '2026-11-20', total: 2500, paid: 2500, mode: 'Cash' },
    { _id: 'i2', supplier: 's1', invoiceNo: 'PI-0002', date: '2026-11-21', total: 4000, paid: 0 },
    { _id: 'i3', supplier: { _id: 's2' }, invoiceNo: 'PI-0003', date: '2026-11-21', total: 9999, paid: 0 }, // other supplier
    { _id: 'i4', supplier: 's1', invoiceNo: 'PI-0004', date: '2026-11-22', total: 500, paid: 0 }, // cash purchase, no supplier
  ];
  const payments = [
    { _id: 'p1', supplier: { _id: 's1' }, date: '2026-11-22', amount: 1500, mode: 'Bank' },
    { _id: 'p2', supplier: 's2', date: '2026-11-22', amount: 7000 },
  ];
  const l = supplierLedger(supplier, invoices, payments);
  // opening 1000 + purchases 2500 + 4000 + 500 - payments (2500 with invoice + 1500 later)
  assert.equal(l.balance, 1000 + 7000 - 4000);
  assert.equal(l.credited, 7000);
  assert.equal(l.debited, 2500 + 1500);
  assert.equal(l.rows[0].description, 'Opening payable balance');
  // newest row's payment carries its id so the row can be deleted
  const row = l.rows.find((r) => r.paymentId === 'p1');
  assert.ok(row);
  // a running balance is kept on every row
  assert.equal(l.rows[l.rows.length - 1].balance, l.balance);
});

test('cash purchases (no supplier) never reach a supplier ledger', () => {
  const l = supplierLedger({ _id: 's1', openingPayable: 0 }, [{ supplier: null, invoiceNo: 'PI-0001', date: '2026-11-20', total: 900, paid: 900 }], []);
  assert.equal(l.balance, 0);
  assert.equal(l.credited, 0);
});

test('item ledger starts from opening stock and keeps a running balance', () => {
  const rows = itemLedger({ openingStock: 10, rate: 50 }, [
    { date: '2026-11-21', type: 'out', qty: 4, note: 'Issued to class 5' },
    { date: '2026-11-20', type: 'in', qty: 6 },
  ]);
  assert.equal(rows[0].description, 'Opening stock');
  assert.deepEqual(rows.map((r) => r.balance), [10, 16, 12]);
  assert.equal(rows[2].description, 'Issued to class 5');
});

test('invoice numbers continue the series and totals multiply qty by rate', () => {
  assert.equal(nextInvoiceNo(), 'PI-0001');
  assert.equal(nextInvoiceNo('PI-0001'), 'PI-0002');
  assert.equal(nextInvoiceNo('PI-0099'), 'PI-0100');
  assert.equal(nextInvoiceNo('weird'), 'PI-0001');
  assert.equal(invoiceTotal([{ qty: 2, rate: 100 }, { qty: 3, rate: 50.5 }]), 351.5);
  assert.equal(invoiceTotal([]), 0);
});
