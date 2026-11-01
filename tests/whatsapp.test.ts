import test from 'node:test';
import assert from 'node:assert/strict';
import { renderChalan } from '../src/lib/chalan-image';
import { sendWhatsAppImage } from '../src/lib/whatsapp-server';
import { encryptCredential } from '../src/lib/credential-crypto';
process.env.CREDENTIALS_ENCRYPTION_KEY = 'test-only-key-000000000000000000000000';
const fee = { _id: 'voucher-1', chalanNo: '202611-5-1', month: '2026-11', actualFee: 1500, discount: 100, admissionFee: 500, annualCharges: 1200, amount: 3100, paid: 400, previous: 200, student: { name: 'Ali Raza', fatherName: 'Raza Ahmed', className: '5', section: 'A', rollNo: '1' } };
const accounts = [{ type: 'jazzcash', title: 'School Fees', accountNumber: '03001234567' }, { type: 'bank', title: 'School Fund', bankName: 'Test Bank', accountNumber: '00123456789', iban: 'PK36SCBL0000001123456702' }];

test('voucher renders a real PNG with extra charges and payment destinations', async () => {
  const image = await renderChalan(fee, { name: 'Greenfield School' }, accounts);
  assert.equal(image.png.subarray(1, 4).toString(), 'PNG');
  assert.equal(image.png.readUInt32BE(16), 900);
  assert.ok(image.png.length > 10000);
  assert.ok(image.png.length < 5_000_000);
  assert.equal(image.filename, 'Fee-Chalan-202611-5-1.png');
});

test('WhatsApp uploads PNG then sends image header template with four body variables', async (t) => {
  const calls: any[] = [];
  t.mock.method(globalThis, 'fetch', async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return Response.json(String(url).endsWith('/media') ? { id: 'media-1' } : { messages: [{ id: 'wamid.1', message_status: 'accepted' }] });
  });
  const result = await sendWhatsAppImage({ enabled: true, phoneNumberId: '123456789', accessToken: encryptCredential('test-access-token-123456789'), templateName: 'school_fee_chalan', templateLanguage: 'en_US' }, '923001234567', new Uint8Array([1, 2, 3]), 'voucher.png', fee);
  assert.equal(result.id, 'wamid.1');
  assert.equal(calls.length, 2);
  assert.ok(calls[0].init.body instanceof FormData);
  const message = JSON.parse(calls[1].init.body);
  assert.equal(message.to, '923001234567');
  assert.equal(message.type, 'template');
  assert.equal(message.template.components[0].parameters[0].image.id, 'media-1');
  assert.deepEqual(message.template.components[1].parameters.map((p: any) => p.text), ['Ali Raza', '202611-5-1', '2026-11', 'Rs 2,900']);
  assert.ok(!JSON.stringify(message).includes('test-access-token'));
});

test('Meta rejection is surfaced and missing configuration never makes a request', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { message: 'Invalid token', code: 190 } }, { status: 401 }));
  await assert.rejects(sendWhatsAppImage({ enabled: true, phoneNumberId: '123456789', accessToken: encryptCredential('test-access-token-123456789') }, '923001234567', new Uint8Array([1]), 'voucher.png', fee), /Invalid token.*190/);
  assert.equal(mock.mock.callCount(), 1);
  await assert.rejects(sendWhatsAppImage({ enabled: false }, '923001234567', new Uint8Array([1]), 'voucher.png', fee), /not connected/);
  assert.equal(mock.mock.callCount(), 1);
});
