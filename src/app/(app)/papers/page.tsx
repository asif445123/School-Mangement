"use client";
import SchoolPapers from "@/components/school-papers";
import TeacherPapers from "@/components/teacher-papers";
import TeacherStatus from "@/components/teacher-status";
import { useSession } from "@/components/session";

// Teacher Data -> Tests tab. Tests and exams are separate now: this page only
// handles test papers ("+ Test"), the Exams page (/exams) handles exam papers.
export default function PapersPage() {
  const { user } = useSession();
  return user.role === "school"
    ? <SchoolPapers type="test" />
    : <div className="space-y-8"><TeacherStatus kind="papers" type="test" label="Tests" /><TeacherPapers type="test" /></div>;
}
