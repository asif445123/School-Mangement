import { test, expect, type Page } from '@playwright/test';
import { studentRights } from '../../src/lib/student-scope';

test.use({ serviceWorkers: 'block' });

const classTeacher = {
  _id: 'teacher-1', role: 'teacher', name: 'Ms Khan', email: 'teacher@example.com',
  teacherType: 'Class teacher', className: '5', section: 'A', subject: 'Maths',
  assignments: [{ teacherType: 'Subject teacher', className: '6', section: 'B', subject: 'English' }],
};
const subjectTeacher = { ...classTeacher, teacherType: 'Subject teacher' };
const school = { _id: 'school-1', role: 'school', name: 'Example School', schoolInfo: { name: 'Example School' } };
const papers = [
  { _id: 'test-5a', type: 'test', title: 'Weekly Fractions Test', className: '5', section: 'A', subject: 'Maths', totalMarks: 25 },
  { _id: 'test-5b', type: 'test', title: 'Other Section Test', className: '5', section: 'B', subject: 'Maths', totalMarks: 25 },
  { _id: 'test-6b', type: 'test', title: 'English Test', className: '6', section: 'B', subject: 'English', totalMarks: 40 },
  { _id: 'test-5-all', type: 'test', title: 'Whole Class Test', className: '5', section: '', subject: 'Maths', totalMarks: 30 },
  { _id: 'test-7', type: 'test', title: 'Other Class Test', className: '7', section: 'A', subject: 'Maths', totalMarks: 25 },
  { _id: 'exam-5a', type: 'exam', title: 'Midterm Maths Exam', className: '5', section: 'A', subject: 'Maths', totalMarks: 75, term: 'Mid term' },
  { _id: 'exam-5b', type: 'exam', title: 'Other Section Exam', className: '5', section: 'B', subject: 'Maths', totalMarks: 75 },
  { _id: 'exam-6b', type: 'exam', title: 'English Exam', className: '6', section: 'B', subject: 'English', totalMarks: 80 },
  { _id: 'exam-7', type: 'exam', title: 'Other Class Exam', className: '7', section: 'A', subject: 'Maths', totalMarks: 75 },
];
const students = [
  { _id: 'student-1', name: 'Ali Raza', rollNo: '1', className: '5', section: 'A' },
  { _id: 'student-2', name: 'Ayesha Khan', rollNo: '2', className: '5', section: 'A' },
  { _id: 'student-3', name: 'Other Section Student', rollNo: '3', className: '5', section: 'B' },
  { _id: 'student-4', name: 'Hamza Malik', rollNo: '1', className: '6', section: 'B' },
];

type Mark = { _id: string; paper: string; student: string; obtained: number };
type Write = { paper: string; marks: { student: string; obtained: number }[] };

// Mock the app APIs so these browser tests run without a database or credentials.
// Return both paper types deliberately: the UI must enforce the correct view.
async function mockApp(page: Page, user: any, availablePapers = papers, slowPaper = '') {
  const saved: Mark[] = [];
  const writes: Write[] = [];
  const paperTypesRequested: (string | null)[] = [];
  await page.addInitScript(() => localStorage.setItem('sms-install-dismissed-at', String(Date.now() + 86400000)));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === '/api/auth/me') return json({ user });
    if (path === '/api/auth/login') return json({ role: user.role, classTeacher: user.teacherType === 'Class teacher' });
    if (path === '/api/users') return json({ items: [classTeacher] });
    if (path === '/api/timetable') return json({ items: [], schedule: null });
    if (path === '/api/students') return json({ items: students });
    if (path === '/api/papers') {
      paperTypesRequested.push(url.searchParams.get('type'));
      return json({ items: availablePapers });
    }
    if (path === '/api/roster') {
      const className = url.searchParams.get('className');
      const section = url.searchParams.get('section');
      const items = students.filter((s) => (!className || s.className === className)
        && (user.role === 'school' || ((!section || !s.section || s.section === section) && !!studentRights(user, s))));
      return json({ items });
    }
    if (path === '/api/marks/bulk' && request.method() === 'POST') {
      const body = request.postDataJSON() as Write;
      writes.push(body);
      for (const mark of body.marks) {
        const existing = saved.find((m) => m.paper === body.paper && m.student === mark.student);
        if (existing) existing.obtained = mark.obtained;
        else saved.push({ _id: `mark-${body.paper}-${mark.student}`, paper: body.paper, ...mark });
      }
      return json({ ok: true, saved: body.marks.length });
    }
    if (path.startsWith('/api/marks/') && request.method() === 'DELETE') {
      const i = saved.findIndex((m) => m._id === path.slice('/api/marks/'.length));
      if (i >= 0) saved.splice(i, 1);
      return json({ ok: true });
    }
    if (path === '/api/marks') {
      const paperId = url.searchParams.get('paper');
      if (paperId && paperId === slowPaper) await new Promise((resolve) => setTimeout(resolve, 600));
      return json({ items: saved.filter((m) => !paperId || m.paper === paperId) });
    }
    return route.fulfill({ status: 500, json: { error: `Unexpected request: ${path}` } });
  });
  return { writes, saved, paperTypesRequested };
}

const optionValues = (page: Page, label: string) => page.getByLabel(label).locator('option').evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value));

async function openClass(page: Page, className: string) {
  await page.getByRole('row').filter({ has: page.getByRole('cell', { name: className, exact: true }) }).first().click();
}

test('school manages test and exam marks from separate tabs, including status shortcuts and saved edits', async ({ page }) => {
  const { writes, paperTypesRequested } = await mockApp(page, school);
  await page.goto('/teachers');
  const menu = page.getByRole('navigation', { name: 'Main menu' });
  await expect(menu.getByRole('link', { name: 'Teachers & time table' })).toHaveClass(/bg-blue-600/);
  await expect(page.getByRole('navigation', { name: 'Diary & Tests sections' })).toHaveCount(0);
  await menu.getByRole('link', { name: 'Diary & Tests' }).click();
  const teacherTabs = page.getByRole('navigation', { name: 'Diary & Tests sections' });
  await expect(teacherTabs.getByRole('tab')).toHaveText(['Daily Diary', 'Tests', 'Marks Entry']);
  await teacherTabs.getByRole('tab', { name: 'Marks Entry' }).click();
  await expect(page).toHaveURL(/\/teachers\/marks$/);
  await expect(teacherTabs.getByRole('tab', { name: 'Marks Entry' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('navigation', { name: 'Main menu' }).getByRole('link', { name: 'Diary & Tests' })).toHaveClass(/bg-blue-600/);
  await expect(page.getByRole('heading', { name: 'Test Marks', exact: true })).toBeVisible();
  await expect(page.getByText('Midterm Maths Exam', { exact: false })).toHaveCount(0);
  await openClass(page, '5');
  await expect(page.getByTitle('Enter / edit marks')).toHaveCount(2); // one section-specific and one whole-class test
  await page.getByRole('row').filter({ hasText: 'Weekly Fractions Test' }).last().getByTitle('Enter / edit marks').click();

  const testPaper = page.getByLabel('Test paper');
  await expect(testPaper).toHaveValue('test-5a');
  expect(await optionValues(page, 'Test paper')).toEqual(['', 'test-5a', 'test-5b', 'test-6b', 'test-5-all', 'test-7']);
  await page.getByLabel('Marks for Ali Raza').fill('18');
  await page.getByRole('button', { name: 'Save marks' }).click();
  const ali = page.getByRole('row').filter({ hasText: 'Ali Raza' });
  await expect(ali).toContainText('18 / 25');
  await ali.getByTitle('Edit marks').click();
  await expect(page.getByLabel('Marks for Ali Raza')).toHaveValue('18');
  await page.getByLabel('Marks for Ali Raza').fill('19');
  await page.getByRole('button', { name: 'Save marks' }).click();
  await expect(ali).toContainText('19 / 25');

  await page.getByRole('navigation', { name: 'Main menu' }).getByRole('link', { name: 'Exams & Results' }).click();
  const resultTabs = page.getByRole('navigation', { name: 'Exams and results sections' });
  await resultTabs.getByRole('tab', { name: 'Marks Entry' }).click();
  await expect(page).toHaveURL(/\/marks$/);
  await expect(resultTabs.getByRole('tab', { name: 'Marks Entry' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('navigation', { name: 'Diary & Tests sections' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Exam Marks', exact: true })).toBeVisible();
  await expect(page.getByText('Weekly Fractions Test', { exact: false })).toHaveCount(0);
  await openClass(page, '5');
  await expect(page.getByTitle('Enter / edit marks')).toHaveCount(1);
  await page.getByTitle('Enter / edit marks').click();
  await expect(page.getByLabel('Exam paper')).toHaveValue('exam-5a');
  expect(await optionValues(page, 'Exam paper')).toEqual(['', 'exam-5a', 'exam-5b', 'exam-6b', 'exam-7']);
  await page.getByLabel('Marks for Ali Raza').fill('65');
  await page.getByRole('button', { name: 'Save marks' }).click();
  await expect(ali).toContainText('65 / 75');

  // The test and exam results remain independent, and deleting one does not remove the other.
  await page.goto('/teachers/marks');
  await page.getByRole('button', { name: 'Enter marks', exact: true }).click();
  await page.getByLabel('Test paper').selectOption('test-5a');
  await expect(ali).toContainText('19 / 25');
  await ali.getByTitle('Delete marks').click();
  await page.getByRole('button', { name: 'Yes, delete' }).click();
  await expect(page.getByLabel('Marks for Ali Raza')).toHaveValue('');
  await page.goto('/marks');
  await page.getByRole('button', { name: 'Enter marks', exact: true }).click();
  await page.getByLabel('Exam paper').selectOption('exam-5a');
  await expect(ali).toContainText('65 / 75');
  expect(writes).toEqual([
    { paper: 'test-5a', marks: [{ student: 'student-1', obtained: 18 }] },
    { paper: 'test-5a', marks: [{ student: 'student-1', obtained: 19 }] },
    { paper: 'exam-5a', marks: [{ student: 'student-1', obtained: 65 }] },
  ]);
  expect(paperTypesRequested).toContain('test');
  expect(paperTypesRequested).toContain('exam');
});

test('class teacher sees only each paper type within assigned classes and sections', async ({ page }) => {
  const { writes } = await mockApp(page, classTeacher);
  await page.goto('/teachers/marks');
  await expect(page.getByRole('navigation', { name: 'Diary & Tests sections' }).getByRole('tab', { name: 'Marks Entry' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Test marks status' })).toBeVisible();
  await expect.poll(() => optionValues(page, 'Test paper')).toEqual(['', 'test-5a', 'test-6b', 'test-5-all']);
  await openClass(page, '5');
  await expect(page.getByText('Weekly Fractions Test', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Midterm Maths Exam', { exact: false })).toHaveCount(0);
  await page.getByLabel('Test paper').selectOption('test-5a');
  await expect(page.getByLabel('Marks for Other Section Student')).toHaveCount(0);
  await page.getByLabel('Marks for Ali Raza').fill('20');
  await page.getByRole('button', { name: 'Save marks' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Ali Raza' })).toContainText('20 / 25');

  await page.goto('/marks');
  await expect(page.getByRole('heading', { name: 'Exam marks status' })).toBeVisible();
  await expect.poll(() => optionValues(page, 'Exam paper')).toEqual(['', 'exam-5a', 'exam-6b']);
  await openClass(page, '5');
  await expect(page.getByText('Midterm Maths Exam', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Weekly Fractions Test', { exact: false })).toHaveCount(0);
  await page.getByLabel('Exam paper').selectOption('exam-5a');
  await page.getByLabel('Marks for Ali Raza').fill('60');
  await page.getByRole('button', { name: 'Save marks' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Ali Raza' })).toContainText('60 / 75');
  expect(writes.map((w) => w.paper)).toEqual(['test-5a', 'exam-5a']);
});

test('subject teacher can reach test marks from the menu and exam marks from Exams & Results', async ({ page }) => {
  const { writes } = await mockApp(page, subjectTeacher);
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('teacher@example.com');
  await page.getByPlaceholder('Password', { exact: true }).fill('password');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/teachers\/marks$/);
  const menu = page.getByRole('navigation', { name: 'Main menu' });
  await expect(menu.getByRole('link', { name: 'Test Marks Entry' })).toHaveClass(/bg-blue-600/);
  await expect(menu.getByRole('link', { name: 'Diary & Tests' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Diary & Tests sections' })).toHaveCount(0);
  await expect.poll(() => optionValues(page, 'Test paper')).toEqual(['', 'test-5a', 'test-6b', 'test-5-all']);
  await page.getByLabel('Test paper').selectOption('test-5a');
  await page.getByLabel('Marks for Ali Raza').fill('10'); // left unsaved when changing sections

  await menu.getByRole('link', { name: 'Exams & Results' }).click();
  await page.getByRole('navigation', { name: 'Exams and results sections' }).getByRole('tab', { name: 'Marks Entry' }).click();
  await expect(menu.getByRole('link', { name: 'Exams & Results' })).toHaveClass(/bg-blue-600/);
  await expect.poll(() => optionValues(page, 'Exam paper')).toEqual(['', 'exam-5a', 'exam-6b']);
  await page.getByLabel('Exam paper').selectOption('exam-5a');
  await expect(page.getByLabel('Marks for Ali Raza')).toHaveValue('');
  await page.getByLabel('Marks for Ali Raza').fill('55');
  await page.getByRole('button', { name: 'Save marks' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Ali Raza' })).toContainText('55 / 75');
  await menu.getByRole('link', { name: 'Test Marks Entry' }).click();
  await page.getByLabel('Test paper').selectOption('test-5a');
  await expect(page.getByLabel('Marks for Ali Raza')).toHaveValue('');
  expect(writes).toEqual([{ paper: 'exam-5a', marks: [{ student: 'student-1', obtained: 55 }] }]);
});

test('each empty paper list identifies the type and does not offer the other type', async ({ page }) => {
  const availablePapers = papers.filter((p) => p.type === 'exam');
  await mockApp(page, classTeacher, availablePapers);
  await page.goto('/teachers/marks');
  await expect(page.getByText('No test papers available. Add one in Tests first.')).toBeVisible();
  expect(await optionValues(page, 'Test paper')).toEqual(['']);
  availablePapers.splice(0, availablePapers.length, ...papers.filter((p) => p.type === 'test'));
  await page.goto('/marks');
  await expect(page.getByText('No exam papers available. Add one in Exams first.')).toBeVisible();
  expect(await optionValues(page, 'Exam paper')).toEqual(['']);
});

test('a slow response from an earlier paper cannot replace the currently selected roster', async ({ page }) => {
  const { writes } = await mockApp(page, subjectTeacher, papers, 'test-5a');
  await page.goto('/teachers/marks');
  await expect.poll(() => optionValues(page, 'Test paper')).toEqual(['', 'test-5a', 'test-6b', 'test-5-all']);
  const slowRequest = page.waitForRequest((r) => r.url().includes('/api/marks?paper=test-5a'));
  const slowResponse = page.waitForResponse((r) => r.url().includes('/api/marks?paper=test-5a'));
  await page.getByLabel('Test paper').selectOption('test-5a');
  await slowRequest;
  await page.getByLabel('Test paper').selectOption('test-6b');
  await expect(page.getByLabel('Marks for Hamza Malik')).toBeVisible();
  await slowResponse;
  await expect(page.getByLabel('Marks for Hamza Malik')).toBeVisible();
  await expect(page.getByLabel('Marks for Ali Raza')).toHaveCount(0);
  await page.getByLabel('Marks for Hamza Malik').fill('32');
  await page.getByRole('button', { name: 'Save marks' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Hamza Malik' })).toContainText('32 / 40');
  expect(writes).toEqual([{ paper: 'test-6b', marks: [{ student: 'student-4', obtained: 32 }] }]);
});

test('a failed roster load can be retried without changing the selected paper', async ({ page }) => {
  await mockApp(page, subjectTeacher);
  let attempts = 0;
  await page.route(/\/api\/roster\?className=5&section=A$/, async (route) => {
    if (attempts++ === 0) return route.fulfill({ status: 503, json: { error: 'Temporarily unavailable' } });
    return route.fallback();
  });
  await page.goto('/teachers/marks');
  await expect.poll(() => optionValues(page, 'Test paper')).toContain('test-5a');
  await page.getByLabel('Test paper').selectOption('test-5a');
  await expect(page.getByRole('alert').filter({ hasText: 'Could not load students and marks' })).toContainText('Temporarily unavailable');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByLabel('Marks for Ali Raza')).toBeVisible();
  await expect(page.getByLabel('Test paper')).toHaveValue('test-5a');
});

test('both marks tabs and paper selectors remain usable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApp(page, school);
  await page.goto('/diary');
  await page.getByRole('navigation', { name: 'Diary & Tests sections' }).getByRole('tab', { name: 'Marks Entry' }).click();
  await page.getByRole('button', { name: 'Enter marks', exact: true }).click();
  await expect.poll(() => optionValues(page, 'Test paper')).toContain('test-5a');
  await page.getByLabel('Test paper').selectOption('test-5a');
  await expect(page.getByLabel('Marks for Ali Raza')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

  await page.goto('/marks');
  await expect(page.getByRole('navigation', { name: 'Exams and results sections' }).getByRole('tab', { name: 'Marks Entry' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Enter marks', exact: true }).click();
  await expect.poll(() => optionValues(page, 'Exam paper')).toContain('exam-5a');
  await page.getByLabel('Exam paper').selectOption('exam-5a');
  await expect(page.getByLabel('Marks for Ali Raza')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});
