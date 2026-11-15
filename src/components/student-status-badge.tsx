"use client";
import { studentStatus, studentStatusStyles } from "@/lib/student-details";

export default function StudentStatusBadge({ student }: { student: { status?: string; leftDate?: string } }) {
  const status = studentStatus(student);
  const style = studentStatusStyles[status] || {
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badge}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}
