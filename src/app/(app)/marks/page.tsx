"use client";
import MarksEntry from "@/components/marks-entry";
import SchoolMarks from "@/components/school-marks";
import TeacherStatus from "@/components/teacher-status";
import { useSession } from "@/components/session";

// School admin: class wise marks status. Teachers: the marks entry screen.
export default function MarksPage() {
  const { user } = useSession();
  return user.role === "school" ? <SchoolMarks /> : <div className="space-y-8"><TeacherStatus kind="marks" /><MarksEntry /></div>;
}
