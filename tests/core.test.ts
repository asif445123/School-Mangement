import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWhatsAppNumber, studentWhatsApp } from '../src/lib/phone';
import { feeValues, previousBalance, validMonth } from '../src/lib/fee-calculation';
import { cleanPaymentAccount } from '../src/lib/payment-accounts';
import { chalanRows } from '../src/lib/chalan';
import { encryptCredential, decryptCredential } from '../src/lib/credential-crypto';

test('WhatsApp falls back to phone only when separate number is blank', () => {
  assert.equal(studentWhatsApp({ phone: '0300 1234567' }).number, '923001234567');
  assert.equal(studentWhatsApp({ phone: '0300 1234567', whatsapp: '0311 7654321' }).number, '923117654321');
  assert.equal(studentWhatsApp({ phone: '0300 1234567', whatsapp: '   ' }).usesPhone, true);
  assert.equal(normalizeWhatsAppNumber('+44 20 7946 0958'), '442079460958');
  assert.equal(normalizeWhatsAppNumber('0092 300 1234567'), '923001234567');
  for (const value of ['abc', '123', '+0123456789', '0300-1234567 ext 2']) assert.equal(normalizeWhatsAppNumber(value), '');
});
test('admission and annual charges are included exactly once', () => {
  assert.deepEqual(feeValues({ actualFee: 1500, discount: 200, admissionFee: 500, annualCharges: 1200 }), { actualFee: 1500, discount: 200, admissionFee: 500, annualCharges: 1200, amount: 3000 });
  assert.equal(feeValues({ actualFee: 0, admissionFee: 500 }).amount, 500);
  assert.throws(() => feeValues({ actualFee: -1 }));
  assert.throws(() => feeValues({ actualFee: 100, discount: 101 }));
  assert.throws(() => feeValues({ actualFee: NaN }));
  assert.equal(validMonth('2026-13'), false);
  assert.equal(validMonth('2026-11'), true);
});
test('legacy voucher totals and previous balances remain compatible', () => {
  const rows = chalanRows({ amount: 1500, paid: 500, previous: 200 });
  assert.equal(rows.total, 1700); assert.equal(rows.balance, 1200);
  assert.equal(previousBalance([{ student: 'a', month: '2026-10', amount: 100, paid: 30 }, { student: 'a', month: '2026-11', amount: 200, paid: 0 }, { student: 'b', month: '2026-10', amount: 500, paid: 0 }], 'a', '2026-11'), 70);
});
test('payment account validation preserves leading zeros and rejects incomplete bank details', () => {
  assert.equal(cleanPaymentAccount({ type: 'jazzcash', title: 'School', accountNumber: '03001234567' }).accountNumber, '03001234567');
  assert.throws(() => cleanPaymentAccount({ type: 'bank', title: 'School', accountNumber: '123' }));
  assert.equal(cleanPaymentAccount({ type: 'raast', title: 'School', accountNumber: 'school@bank' }).type, 'raast');
  assert.equal(cleanPaymentAccount({ type: 'bank', title: 'School', bankName: 'Bank', accountNumber: '123', iban: 'pk36 scbl 0000 0011 2345 6702' }).iban, 'PK36SCBL0000001123456702');
});
test('credentials round trip with authenticated encryption', () => {
  process.env.CREDENTIALS_ENCRYPTION_KEY = 'test-only-key-000000000000000000000000';
  const encrypted = encryptCredential('secret-token');
  assert.ok(!encrypted.includes('secret-token'));
  assert.equal(decryptCredential(encrypted), 'secret-token');
  assert.throws(() => decryptCredential(encrypted.slice(0, -5) + 'AAAAA'));
});
