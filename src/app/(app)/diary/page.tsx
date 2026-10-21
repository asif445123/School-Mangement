"use client";
import CrudPage from "@/components/crud-page";
import { today } from "@/lib/api";
import { useSession } from "@/components/session";
import { classSubjectFields } from "@/lib/teacher-scope";
import SchoolDiary from "@/components/school-diary";
import TeacherStatus from "@/components/teacher-status";

export default function DiaryPage() {
  const { user } = useSession();
  if (user.role === "school") return <SchoolDiary />;
  const { classSubject, editClassSubject, extra, transform } = classSubjectFields(user); // teachers: class and subject come from their account
  return (
    <div className="space-y-8">
    <TeacherStatus kind="diary" />
    <CrudPage resource="diary" title="Diary entry"
      columns={[{ key: "date", label: "Date" }, { key: "className", label: "Class" }, { key: "subject", label: "Subject" }, { key: "text", label: "Homework / Note" }]}
      fields={[{ name: "date", label: "Date", type: "date", required: true }, ...classSubject, { name: "text", label: "Homework / Note", type: "textarea", required: true }]}
      editFields={[{ name: "date", label: "Date", type: "date", required: true }, ...editClassSubject, { name: "text", label: "Homework / Note", type: "textarea", required: true }]}
      defaults={{ date: today() }} extra={extra} transform={transform} />
    </div>
  );
}
