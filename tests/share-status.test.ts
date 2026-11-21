import test from "node:test";
import assert from "node:assert/strict";
import { formatSentAt, shareStatus } from "../src/lib/share-status";

test("never sent: Not sent, 0 times, no last-sent line", () => {
  const s = shareStatus({ revision: 0, whatsapp: {} });
  assert.equal(s.label, "Not sent");
  assert.equal(s.sent, false);
  assert.equal(s.count, 0);
  assert.equal(s.failedCount, 0);
  assert.equal(s.lastSentText, "");
  assert.equal(s.methodLabel, "");
});

test("sent via WhatsApp API: shows how many times and when last sent", () => {
  const s = shareStatus({
    revision: 1,
    whatsapp: { lastStatus: "sent", sentCount: 3, attemptCount: 4, sentRevision: 1, lastSentAt: "2026-11-14T10:42:00", lastTo: "923001234567", lastBy: "Greenfield School" },
  });
  assert.equal(s.label, "WhatsApp sent");
  assert.equal(s.count, 3);
  assert.equal(s.failedCount, 1); // 4 attempts - 3 successful sends
  assert.equal(s.lastSentText, formatSentAt("2026-11-14T10:42:00"));
  assert.match(s.lastSentText, /14 Nov 2026/);
  assert.equal(s.recipient, "923001234567");
  assert.equal(s.methodLabel, "Accepted by WhatsApp");
  assert.equal(s.sentBy, "Greenfield School");
});

test("manual share: counted the same, shown as manually confirmed by name", () => {
  const s = shareStatus({
    revision: 0,
    whatsapp: { lastStatus: "sent", sentCount: 1, attemptCount: 1, sentRevision: 0, lastSentAt: "2026-11-14T09:05:00", lastTo: "923001234567", lastBy: "Admin (manual confirmation)" },
  });
  assert.equal(s.count, 1);
  assert.equal(s.methodLabel, "Manually confirmed");
  assert.equal(s.sentBy, "Admin");
});

test("a manually confirmed defaulter reminder is visible without appearing stale as a chalan image", () => {
  const s = shareStatus({
    revision: 3,
    whatsapp: { lastStatus: "sent", lastMessageType: "reminder", sentCount: 1, attemptCount: 1, sentRevision: null, lastSentAt: "2026-11-14T09:05:00", lastBy: "Admin (manual confirmation)" },
  });
  assert.equal(s.label, "WhatsApp sent");
  assert.equal(s.stale, false);
  assert.equal(s.contentLabel, "Fee reminder");
  assert.equal(s.methodLabel, "Manually confirmed");
});

test("charges edited after sending: Updated · send again, count is kept", () => {
  const s = shareStatus({
    revision: 2,
    whatsapp: { lastStatus: "sent", sentCount: 2, attemptCount: 2, sentRevision: 1, lastSentAt: "2026-11-10T08:00:00", lastBy: "Admin" },
  });
  assert.equal(s.stale, true);
  assert.equal(s.label, "Updated · send again");
  assert.equal(s.count, 2);
});

test("latest attempt failed: Send failed with the error, successes still counted", () => {
  const s = shareStatus({
    revision: 0,
    whatsapp: { lastStatus: "failed", sentCount: 2, attemptCount: 3, lastError: "Invalid token (190)" },
  });
  assert.equal(s.label, "Send failed");
  assert.equal(s.count, 2);
  assert.equal(s.failedCount, 1);
  assert.equal(s.error, "Invalid token (190)");
});

test("formatSentAt: readable date + time, empty for missing/invalid values", () => {
  assert.match(formatSentAt("2026-01-05T15:07:00"), /5 Jan 2026, 3:07 PM/);
  assert.match(formatSentAt("2026-01-05T00:07:00"), /12:07 AM/);
  assert.equal(formatSentAt(""), "");
  assert.equal(formatSentAt(undefined), "");
  assert.equal(formatSentAt("not-a-date"), "");
});
