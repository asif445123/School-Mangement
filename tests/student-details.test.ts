import test from 'node:test';
import assert from 'node:assert/strict';
import Student from '../src/models/student';
import {
  matchesStudentSearch,
  matchesStudentStatusFilter,
  studentClassSection,
  studentStatus,
  studentStatuses,
  studentStatusSelectOptions,
  studentStatusStyles,
} from '../src/lib/student-details';
import { studentFields, teacherStudentFields } from '../src/lib/student-fields';

test('class and section combine without a dangling separator', () => {
  assert.equal(studentClassSection({ className: '10th', section: 'Iqbal' }), '10th-Iqbal');
  assert.equal(studentClassSection({ className: '10th', section: ' ' }), '10th');
  assert.equal(studentClassSection({}), '-');
});

test('legacy status falls back to left date, normalizes Passed out, and explicit status wins', () => {
  assert.equal(studentStatus({}), 'Active');
  assert.equal(studentStatus({ leftDate: '2026-01-01' }), 'Left');
  assert.equal(studentStatus({ status: 'Passed out' }), 'Passed Out');
  for (const status of studentStatuses) {
    assert.equal(studentStatus({ status, leftDate: '2026-01-01' }), status);
  }
});

test('status select options and circle indicator colors cover all statuses', () => {
  assert.deepEqual(studentStatusSelectOptions, ['All', 'Active', 'Inactive', 'Left', 'Passed Out']);
  assert.match(studentStatusStyles.Active.dot, /emerald|green/);
  assert.match(studentStatusStyles.Inactive.dot, /yellow|amber/);
  assert.match(studentStatusStyles.Left.dot, /red/);
  assert.match(studentStatusStyles['Passed Out'].dot, /blue/);
});

test('status filter defaults to Active and supports All plus every status', () => {
  const active = { name: 'Ali', status: 'Active' };
  const inactive = { name: 'Usman', status: 'Inactive' };
  const left = { name: 'Shamaz', leftDate: '2026-02-01' };
  const passedOut = { name: 'Hasnain', status: 'Passed out' };

  assert.equal(matchesStudentStatusFilter(active, 'Active'), true);
  assert.equal(matchesStudentStatusFilter(inactive, 'Active'), false);
  assert.equal(matchesStudentStatusFilter(left, 'Left'), true);
  assert.equal(matchesStudentStatusFilter(passedOut, 'Passed Out'), true);
  for (const s of [active, inactive, left, passedOut]) {
    assert.equal(matchesStudentStatusFilter(s, 'All'), true);
  }
});

test('student search matches student name, roll number, and phone number', () => {
  const s = { name: 'Muhammad Hamd Raza', rollNo: 'ADM-0001', phone: '0300-8077141', fatherName: 'G. Murtaza' };
  assert.equal(matchesStudentSearch(s, ''), true);
  assert.equal(matchesStudentSearch(s, 'hamd'), true);
  assert.equal(matchesStudentSearch(s, 'adm-0001'), true);
  assert.equal(matchesStudentSearch(s, '0001'), true);
  assert.equal(matchesStudentSearch(s, '0300-8077141'), true);
  assert.equal(matchesStudentSearch(s, '03008077141'), true);
  assert.equal(matchesStudentSearch(s, 'murtaza'), true);
  assert.equal(matchesStudentSearch(s, 'nonexistent-xyz'), false);
});

test('student details persist in the model and status is validated', () => {
  const details = { address: 'Street 1', previousSchool: 'Old School', previousClass: '9th', previousResult: 'Passed', leavingCertificateNumber: '00123' };
  const base = { school: '012345678901234567890123', name: 'Student', className: '10th' };
  const student = new Student({ ...base, ...details });
  assert.equal(student.validateSync(), undefined);
  assert.equal(student.status, 'Active');
  for (const [key, value] of Object.entries(details)) assert.equal(student.toObject()[key], value);
  assert.equal(new Student({ ...base, leftDate: '2026-01-01' }).status, 'Left');
  const legacyPassed = new Student({ ...base, status: 'Passed out' });
  assert.equal(legacyPassed.validateSync(), undefined);
  assert.equal(legacyPassed.status, 'Passed Out');
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
