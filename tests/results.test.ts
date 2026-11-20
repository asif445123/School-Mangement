import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PASS_PERCENT, examGroups, nextClassName, passMarks, passPercent, sessionOptions, studentResult } from '../src/lib/results';

test('pass percentage defaults to 33 and marks are rounded by the paper total', () => {
  assert.equal(passPercent({}), DEFAULT_PASS_PERCENT);
  assert.equal(passPercent({ passPercentage: 0 }), DEFAULT_PASS_PERCENT);
  assert.equal(passPercent({ passPercentage: 40 }), 40);
  assert.equal(passMarks({ totalMarks: 100, passPercentage: 33 }), 33);
  assert.equal(passMarks({ totalMarks: 50 }), 16.5);
});

test('a student passes only when every subject reaches its pass marks', () => {
  const papers = [
    { _id: 'p1', subject: 'Maths', title: 'Mid Term', totalMarks: 100, passPercentage: 33 },
    { _id: 'p2', subject: 'English', title: 'Mid Term', totalMarks: 100, passPercentage: 33 },
  ];
  const marks = [
    { paper: 'p1', student: 's1', obtained: 80 },
    { paper: 'p2', student: 's1', obtained: 10 },
  ];
  const r = studentResult({ _id: 's1', name: 'Ali' }, papers, marks);
  assert.equal(r.obtained, 90);
  assert.equal(r.total, 200);
  assert.equal(r.pct, 45);
  assert.equal(r.grade, 'D');
  assert.equal(r.passed, false); // English is below the pass marks
  assert.deepEqual(r.subjects.map((s) => s.pass), [true, false]);
});

test('missing marks count as zero and are flagged as not entered', () => {
  const papers = [{ _id: 'p1', subject: 'Maths', title: 'Test', totalMarks: 50, passPercentage: 33 }];
  const r = studentResult({ _id: 's1' }, papers, []);
  assert.equal(r.obtained, 0);
  assert.equal(r.subjects[0].entered, false);
  assert.equal(r.passed, false);
  assert.equal(r.grade, 'F');
});

test('next class name increments the number and keeps the prefix / suffix', () => {
  assert.equal(nextClassName('5'), '6');
  assert.equal(nextClassName('Class 9'), 'Class 10');
  assert.equal(nextClassName('9th'), '10th');
  assert.equal(nextClassName('Playgroup'), null);
});

test('exam papers are grouped by session, term, class and section', () => {
  const papers = [
    { _id: '1', session: '2026-2027', term: 'Mid term', className: 'Class1', section: '', subject: 'Math', date: '2026-10-01' },
    { _id: '2', session: '2026-2027', term: 'Mid term', className: 'Class1', section: '', subject: 'English', date: '2026-10-02' },
    { _id: '3', session: '2026-2027', term: 'First term', className: 'Class1', section: '', subject: 'Math', date: '2026-09-01' },
  ];
  const groups = examGroups(papers);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, 'Mid term - Class1'); // latest exam first
  assert.equal(groups[0].papers.length, 2);
  assert.equal(groups[1].label, 'First term - Class1');
});

test('session options cover the current school year', () => {
  const year = new Date().getFullYear();
  const options = sessionOptions();
  assert.ok(options.includes(`${year}-${year + 1}`));
  assert.equal(new Set(options).size, options.length);
});
