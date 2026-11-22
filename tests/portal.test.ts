import test from 'node:test';
import assert from 'node:assert/strict';
import {
  childClassLine, childTitle, isPortalPath, isPortalSection, parsePortalPath, portalPath, portalSections,
} from '../src/lib/portal-routes';

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
