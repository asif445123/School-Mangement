// ---------------------------------------------------------------------------
// Student / guardian portal navigation.
//
// The portal used to be ONE long page (/my) holding the fee chalans, the daily
// diary, the tests and the exam marks of a child. It is split now into one
// page per section, and - because a guardian login can be linked to several
// children - into one set of pages per child:
//
//   /my                     -> overview (family summary + one card per child)
//   /my/<childId>/fees      -> all fee chalans of the child, voucher print / download, accounts
//   /my/<childId>/diary     -> daily diary of the class, by date
//   /my/<childId>/tests     -> test papers of the class with marks obtained
//   /my/<childId>/exams     -> exam paper marks per term (First / Mid / Final)
//
// Each link opens ONLY its own page: the child pages carry no in-page tabs
// for the other sections. The sidebar (app layout) builds its child groups
// from these same helpers, so the menu and the pages can never disagree
// about a link.
// ---------------------------------------------------------------------------

export type PortalSection = "fees" | "diary" | "tests" | "exams";

export const portalSections: { key: PortalSection; label: string }[] = [
  { key: "fees", label: "Fee Chalan" },
  { key: "diary", label: "Daily Diary" },
  { key: "tests", label: "Tests" },
  { key: "exams", label: "Exams" },
];

// The portal overview of the whole family (also the single-child dashboard).
export const portalHome = "/my";

export const isPortalSection = (value: any): value is PortalSection =>
  portalSections.some((s) => s.key === value);

export const portalSectionLabel = (value: string) =>
  portalSections.find((s) => s.key === value)?.label || "Portal";

export const portalPath = (childId: any, section: PortalSection) =>
  `${portalHome}/${encodeURIComponent(String(childId || ""))}/${section}`;

// Is this address inside the portal (its overview or one child's section)?
export const isPortalPath = (pathname: string) =>
  pathname === portalHome || (pathname || "").startsWith(`${portalHome}/`);

const portalPathPattern = /^\/my\/([^/]+)\/(fees|diary|tests|exams)\/?$/;

// "/my/<childId>/<section>" -> { childId, section }; anything else -> null.
export function parsePortalPath(pathname: string): { childId: string; section: PortalSection } | null {
  const match = portalPathPattern.exec(pathname || "");
  if (!match) return null;
  let childId = match[1];
  try { childId = decodeURIComponent(childId); } catch { /* keep the raw id */ }
  const section = match[2] as PortalSection;
  return isPortalSection(section) ? { childId, section } : null;
}

// "Class 5 A · Roll # 12" (the roll number is left out when it is blank).
export function childClassLine(student: any) {
  const cls = `Class ${student?.className || "-"}${student?.section ? ` ${student.section}` : ""}`;
  return student?.rollNo ? `${cls} · Roll # ${student.rollNo}` : cls;
}

// "Ahmed son of Ali" / "Sara daughter of Ali" (neutral when gender is unknown)
export function childTitle(student: any) {
  const father = student?.fatherName;
  if (!father) return student?.name || "Student";
  if (student?.gender === "Male") return `${student.name} son of ${father}`;
  if (student?.gender === "Female") return `${student.name} daughter of ${father}`;
  return `${student.name} · Father: ${father}`;
}
