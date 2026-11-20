"use client";
import SchoolPapers from "@/components/school-papers";
import TeacherPapers from "@/components/teacher-papers";
import TeacherStatus from "@/components/teacher-status";
import { useSession } from "@/components/session";

// Exams is its own navbar item. It works exactly like the Tests tab (same
// layout), but only handles exam papers ("+ Exam") and the exam form also asks
// for the session and the pass percentage used by Result & Card / promotion.
export default function ExamsPage() {
  const { user } = useSession();
  return user.role === "school"
    ? <SchoolPapers type="exam" />
    : <div className="space-y-8"><TeacherStatus kind="papers" type="exam" label="Exams" /><TeacherPapers type="exam" /></div>;
}
