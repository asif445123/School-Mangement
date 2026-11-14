import test from 'node:test';
import assert from 'node:assert/strict';
import Student from '../src/models/student';
import { studentClassSection, studentStatus, studentStatuses } from '../src/lib/student-details';
import { studentFields, teacherStudentFields } from '../src/lib/student-fields';

test('class and section combine without a dangling separator', () => {
  assert.equal(studentClassSection({ className: '10th', section: 'Iqbal' }), '10th-Iqbal');
  assert.equal(studentClassSection({ className: '10th', section: ' ' }), '10th');
  assert.equal(studentClassSection({}), '-');
});

test('legacy status falls back to left date and explicit status wins', () => {
  assert.equal(studentStatus({}), 'Active');
  assert.equal(studentStatus({ leftDate: '2026-01-01' }), 'Left');
  for (const status of studentStatuses) {
    assert.equal(studentStatus({ status, leftDate: '2026-01-01' }), status);
  }
});

test('student details persist in the model and status is validated', () => {
  const details = { address: 'Street 1', previousSchool: 'Old School', previousClass: '9th', previousResult: 'Passed', leavingCertificateNumber: '00123' };
  const base = { school: '012345678901234567890123', name: 'Student', className: '10th' };
  const student = new Student({ ...base, ...details });
  assert.equal(student.validateSync(), undefined);
  assert.equal(student.status, 'Active');
  for (const [key, value] of Object.entries(details)) assert.equal(student.toObject()[key], value);
  assert.equal(new Student({ ...base, leftDate: '2026-01-01' }).status, 'Left');
  for (const status of studentStatuses) assert.equal(new Student({ ...base, status }).validateSync(), undefined);
  assert.ok(new Student({ ...base, status: 'Other' }).validateSync()?.errors.status);
});

test('forms retain existing fields and offer new details and status choices', () => {
  for (const name of ['gender', 'monthlyFee', 'discount', 'previousPending', 'leftDate']) {
    assert.ok(studentFields.some((f) => f.name === name));
  }
  for (const fields of [studentFields, teacherStudentFields]) {
    for (const name of ['address', 'previousSchool', 'previousClass', 'previousResult', 'leavingCertificateNumber']) {
      assert.ok(fields.some((f) => f.name === name));
    }
    assert.deepEqual(fields.find((f) => f.name === 'status')?.options, studentStatuses);
  }
});
