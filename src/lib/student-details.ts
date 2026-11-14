export const studentStatuses = ["Active", "Inactive", "Left", "Passed out"];

// Older records predate the status field; preserve their leaving information.
export function studentStatus(student: { status?: string; leftDate?: string }): string {
  return student.status || (student.leftDate ? "Left" : "Active");
}

export function studentClassSection(student: { className?: string; section?: string }): string {
  return [student.className?.trim(), student.section?.trim()].filter(Boolean).join("-") || "-";
}
