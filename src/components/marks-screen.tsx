"use client";
import MarksEntry from "./marks-entry";
import SchoolMarks from "./school-marks";
import TeacherStatus from "./teacher-status";
import { useSession } from "./session";
import type { PaperType } from "./school-papers";

// Both sections share the same workflow, but never mix test and exam papers.
export default function MarksScreen({ type }: { type: PaperType }) {
  const { user } = useSession();
  return user.role === "school"
    ? <SchoolMarks key={type} type={type} />
    : <div key={type} className="space-y-8"><TeacherStatus kind="marks" type={type} label={type === "test" ? "Test marks" : "Exam marks"} /><MarksEntry type={type} /></div>;
}
