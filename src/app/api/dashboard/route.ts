import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail, getSessionUser, schoolIdOf } from "@/lib/auth";
import { isClassTeacher, nz } from "@/lib/teacher-scope";
import { studentRights, studentScopes } from "@/lib/student-scope";
import { studentStatus } from "@/lib/student-details";
import { isValidDate } from "@/lib/attendance";
import { attendanceTotals, classAttendanceGaps, classStrength, diaryRequirements, diarySummary, staffStrength, testSummary } from "@/lib/dashboard-summary";
import User from "@/models/user";
import Student from "@/models/student";
import Diary from "@/models/diary";
import Paper from "@/models/paper";
import Mark from "@/models/mark";
import Attendance from "@/models/attendance";
import StaffAttendance from "@/models/staff-attendance";

// One request with everything the dashboard shows for the selected date:
//   diary  S (total subjects) / D (diary submitted) / R (diary remaining)
//   tests  T (tests created) / M (total marks) / R (marks remaining)
//   student and staff attendance, teacher + other staff strength, students by class
// The school admin sees the whole school; a class teacher only the classes he is
// class teacher of (the same rule as Student Attendance). A subject-only teacher
// has no dashboard.
const STAFF_FIELDS = "_id name type role teacherType className section subject period assignments";
const STUDENT_FIELDS = "_id name className section status leftDate";

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || !["school", "teacher"].includes(me.role)) return fail("Access denied", 403);
  const schoolId = schoolIdOf(me);
  if (!schoolId) return fail("Access denied", 403);
  if (me.role === "teacher" && !isClassTeacher(me)) return fail("Access denied", 403);
  const date = String(req.nextUrl.searchParams.get("date") || "").trim();
  if (!isValidDate(date)) return fail("Enter a valid date");
  await connectDb();

  const isSchool = me.role === "school";
  // class teacher's own classes; a blank section on the assignment means every section
  const ownScopes = isSchool ? [] : studentScopes(me).filter((s) => s.own);
  const owns = (cls: any, section: any) =>
    isSchool ||
    ownScopes.some((s) => nz(s.className) === nz(cls) && (!s.section || !nz(section) || nz(s.section) === nz(section)));

  // Teachers and the rest of the staff are both role "teacher" accounts; `type`
  // ("Teacher" / "Staff") tells them apart.
  const [staffRows, studentRows, diaryRows, paperRows] = await Promise.all([
    User.find({ school: schoolId, role: "teacher" }).select(STAFF_FIELDS).lean(),
    Student.find({ school: schoolId }).select(STUDENT_FIELDS).lean(),
    Diary.find({ school: schoolId, date }).select("_id className section subject").lean(),
    Paper.find({ school: schoolId, date }).select("_id type className section subject totalMarks").lean(),
  ]);

  const teachers = isSchool ? staffRows : staffRows.filter((t: any) => String(t._id) === String(me._id));
  const students = (studentRows as any[]).filter((st) => isSchool || !!studentRights(me, st)?.own);
  const studying = students.filter((st) => studentStatus(st) === "Active");
  const diaries = (diaryRows as any[]).filter((d) => owns(d.className, d.section));
  const papers = (paperRows as any[]).filter((p) => owns(p.className, p.section));

  const paperIds = papers.map((p) => p._id);
  const [marks, studentAttendance, staffAttendance] = await Promise.all([
    paperIds.length ? Mark.find({ school: schoolId, paper: { $in: paperIds } }).select("paper").lean() : Promise.resolve([]),
    Attendance.find({ school: schoolId, date }).select("student status").lean(),
    StaffAttendance.find({ school: schoolId, date }).select("staff status").lean(),
  ]);

  // Attendance totals and gaps are measured against the active roster the user may see.
  const studentIds = new Set(studying.map((st) => String(st._id)));
  const studentRecords = studentAttendance.filter((r: any) => studentIds.has(String(r.student)));
  // Staff strength and staff attendance are school-wide information, so a class
  // teacher gets neither (his cards stay empty).
  const rosterStaff = isSchool ? staffRows : [];
  const staffIds = new Set((rosterStaff as any[]).map((u) => String(u._id)));
  const staffRecords = staffAttendance.filter((r: any) => staffIds.has(String(r.staff)));

  // One expected diary per subject of the teachers in scope (a class teacher
  // only sees the rows of his own class).
  const requirements = diaryRequirements(teachers as any[]).filter((r) => owns(r.className, r.section));
  const staff = staffStrength(rosterStaff as any[]);
  const classSections = classStrength(studying, true);
  const attendanceGaps = classAttendanceGaps(studying, studentRecords, teachers as any[]);

  return NextResponse.json({
    date,
    role: me.role,
    school: isSchool,
    diary: diarySummary(requirements, diaries),
    tests: testSummary(papers, marks),
    attendance: {
      students: attendanceTotals(studentRecords, studying),
      staff: attendanceTotals(staffRecords, rosterStaff),
      gaps: attendanceGaps,
    },
    strength: {
      students: studying.length,
      // one row per class + section, e.g. "Class 5 A"
      classes: classSections.map((c) => ({ ...c, className: c.section ? `${c.className} ${c.section}` : c.className })),
      teachers: staff.teachers,
      otherStaff: staff.staff,
      staff: staff.total,
    },
    // only kept so the page can greet a teacher with his own name
    teacher: { name: me.name, email: me.email },
  });
}
