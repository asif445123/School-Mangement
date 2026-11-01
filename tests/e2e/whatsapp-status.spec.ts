import { test, expect } from '@playwright/test';

test('manual send history, failed API status, edit invalidation and school isolation', async ({ request }) => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD || process.env.E2E_ALLOW_MUTATIONS !== '1', 'Requires a disposable test school');
  const login = await request.post('/api/auth/login', { data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const suffix = Date.now();
  const createdStudent = await request.post('/api/students', { data: { name: `WhatsApp Test ${suffix}`, className: 'Test', rollNo: String(suffix), phone: '03001234567', monthlyFee: 1000 } });
  expect(createdStudent.ok()).toBeTruthy();
  const student = (await createdStudent.json()).item;
  const createdFee = await request.post('/api/fees', { data: { student: student._id, month: '2099-01', actualFee: 1000, discount: 0, admissionFee: 100, annualCharges: 200 } });
  expect(createdFee.ok()).toBeTruthy();
  let fee = (await createdFee.json()).item;
  expect(fee.amount).toBe(1300);
  try {
    for (const count of [1, 2]) {
      const sent = await request.post(`/api/fees/${fee._id}/whatsapp`, { data: { mode: 'manual', confirmed: true, expectedRevision: fee.revision || 0 } });
      expect(sent.ok()).toBeTruthy();
      fee = (await sent.json()).item;
      expect(fee.whatsapp.sentCount).toBe(count);
      expect(fee.whatsapp.lastStatus).toBe('sent');
      expect(fee.whatsapp.lastTo).toBe('923001234567');
    }
    const unconfirmed = await request.post(`/api/fees/${fee._id}/whatsapp`, { data: { mode: 'manual', confirmed: false } });
    expect(unconfirmed.status()).toBe(400);
    const edited = await request.put(`/api/fees/${fee._id}`, { data: { admissionFee: 250, paid: 999999, whatsapp: { sentCount: 999 } } });
    expect(edited.ok()).toBeTruthy();
    fee = (await edited.json()).item;
    expect(fee.amount).toBe(1450); expect(fee.paid).toBe(0); expect(fee.revision).toBe(1);
    expect(fee.whatsapp.sentCount).toBe(2); expect(fee.whatsapp.sentRevision).toBe(0);
    const stale = await request.post(`/api/fees/${fee._id}/whatsapp`, { data: { mode: 'manual', confirmed: true, expectedRevision: 0 } });
    expect(stale.status()).toBe(422);
    fee = (await stale.json()).item;
    expect(fee.whatsapp.lastStatus).toBe('failed'); expect(fee.whatsapp.sentCount).toBe(2); expect(fee.whatsapp.attemptCount).toBe(3);
    const image = await request.get(`/api/fees/${fee._id}/image`);
    expect(image.ok()).toBeTruthy(); expect(image.headers()['content-type']).toBe('image/png');
    expect((await image.body()).subarray(1, 4).toString()).toBe('PNG');
    const duplicate = await request.post('/api/fees', { data: { student: student._id, month: '2099-01', actualFee: 1000 } });
    expect(duplicate.status()).toBe(400);
    const settings = await request.get('/api/settings/whatsapp');
    expect(JSON.stringify(await settings.json())).not.toContain('accessToken');
  } finally {
    await request.delete(`/api/fees/${fee._id}`);
    await request.delete(`/api/students/${student._id}`);
  }
  await request.post('/api/auth/logout');
  expect((await request.get(`/api/fees/${fee._id}/image`)).status()).toBe(401);
});
