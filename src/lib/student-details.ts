export const studentStatuses = ["Active", "Inactive", "Left", "Passed Out"];

export const studentStatusSelectOptions = ["All", ...studentStatuses];

const canonicalStatus: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  left: "Left",
  "passed out": "Passed Out",
};

export function normalizeStudentStatus(value?: string): string {
  const key = String(value || "").trim().toLowerCase();
  return canonicalStatus[key] || String(value || "").trim();
}

// Older records predate the status field; preserve their leaving information.
export function studentStatus(student: { status?: string; leftDate?: string }): string {
  const normalized = normalizeStudentStatus(student.status);
  return normalized || (student.leftDate ? "Left" : "Active");
}

export const studentStatusStyles: Record<string, { dot: string; badge: string }> = {
  Active: { dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200" },
  Inactive: { dot: "bg-yellow-400", badge: "bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-200" },
  Left: { dot: "bg-red-500", badge: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200" },
  "Passed Out": { dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200" },
};

export function matchesStudentStatusFilter(student: { status?: string; leftDate?: string }, selectedStatus: string): boolean {
  if (!selectedStatus || selectedStatus.toLowerCase() === "all") return true;
  return studentStatus(student) === normalizeStudentStatus(selectedStatus);
}

export function matchesStudentSearch(
  student: { name?: string; rollNo?: string; phone?: string; fatherName?: string },
  query: string,
): boolean {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const digits = (v?: string) => String(v || "").replace(/\D+/g, "");
  const qDigits = digits(q);
  const fields = [student.name, student.rollNo, student.phone, student.fatherName];
  if (fields.some((f) => String(f || "").toLowerCase().includes(q))) return true;
  if (qDigits && [student.phone, student.rollNo].some((f) => digits(f).includes(qDigits))) return true;
  return false;
}

export function studentClassSection(student: { className?: string; section?: string }): string {
  return [student.className?.trim(), student.section?.trim()].filter(Boolean).join("-") || "-";
}
