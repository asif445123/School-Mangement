import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail, getSessionUser, schoolIdOf } from "@/lib/auth";
import { classTeacherClasses, isClassTeacher, nz } from "@/lib/teacher-scope";
import { studentRights } from "@/lib/student-scope";
import { studentStatus } from "@/lib/student-details";
import { isValidDate, isValidMonth, normalizeAttendanceStatus, summarizeDay, summarizeMonth } from "@/lib/attendance";
import Student from "@/models/student";
import Attendance from "@/models/attendance";

// Student Attendance — Mark Attendance, Monthly Report, Absent List and the
// school-only class-wise summary. The school admin sees every class; a class
// teacher only his own class(es) (a subject-only teacher has no access).
const FIELDS = "_id name fatherName rollNo className section phone whatsapp status leftDate";

type Scope = { me?: any; schoolId?: any; error?: any };

async function attendanceScope(): Promise<Scope> {
  const me = await getSessionUser();
  if (!me || !["school", "teacher"].includes(me.role)) return { error: fail("Access denied", 403) };
  const schoolId = schoolIdOf(me);
  if (!schoolId) return { error: fail("Access denied", 403) };
  if (me.role === "teacher" && !isClassTeacher(me)) return { error: fail("Only class teachers can open Student Attendance", 403) };
  return { me, schoolId };
}

// Students whose attendance may be marked: studying students of the school,
// narrowed to the class teacher's own class(es) for a teacher.
async function roster(me: any, schoolId: any) {
  const all = await Student.find({ school: schoolId }).select(FIELDS).sort({ rollNo: 1, name: 1 }).lean();
  const studying = all.filter((s: any) => studentStatus(s) === "Active");
  if (me.role === "school") return studying;
  return studying.filter((s: any) => studentRights(me, s)?.own);
}

const inClassSection = (s: any, className: string, section: string) => {
  if (className && nz(s.className) !== nz(className)) return false;
  // a student saved without a section belongs to every section of the class
  if (section && s.section && nz(s.section) !== nz(section)) return false;
  return true;
};

const sortStudents = (list: any[]) =>
  [...list].sort(
    (a, b) =>
      String(a.className).localeCompare(String(b.className), undefined, { numeric: true }) ||
      String(a.section || "").localeCompare(String(b.section || ""), undefined, { numeric: true }) ||
      (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0) ||
      String(a.name).localeCompare(String(b.name)),
  );

export async function GET(req: NextRequest) {
  const s = await attendanceScope();
  if (s.error) return s.error;
  const { me, schoolId } = s as any;
  const q = req.nextUrl.searchParams;
  const mode = q.get("mode") || "day";
  const className = String(q.get("className") || "").trim();
  const section = String(q.get("section") || "").trim();
  const date = String(q.get("date") || "").trim();
  const month = String(q.get("month") || "").trim();
  await connectDb();

  if (mode === "classes") {
    const map = new Map<string, { className: string; sections: string[] }>();
    const add = (cls: any, sec: any) => {
      const key = nz(cls);
      let row = map.get(key);
      if (!row) {
        row = { className: String(cls), sections: [] };
        map.set(key, row);
      }
      const value = String(sec || "").trim();
      if (value && !row.sections.some((x) => nz(x) === nz(value))) row.sections.push(value);
    };
    // a class teacher sees the classes he is class teacher of, even before a student is added there
    const own = me.role === "teacher" ? classTeacherClasses(me) : [];
    for (const a of own) add(a.className, a.section);
    if (!own.length) for (const st of await roster(me, schoolId)) add(st.className, st.section);
    const classes = [...map.values()]
      .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }))
      .map((c) => ({ ...c, sections: c.sections.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) }));
    return NextResponse.json({ classes });
  }

  if (mode === "summary") {
    if (me.role !== "school") return fail("Only the school admin can see the class-wise summary", 403);
    const monthly = !!month; // month summary = the whole month added up per class
    if (monthly ? !isValidMonth(month) : !isValidDate(date)) return fail(monthly ? "Enter a valid month" : "Enter a valid date");
    const students = await roster(me, schoolId);
    const records = await Attendance.find(
      monthly ? { school: schoolId, date: { $gte: `${month}-01`, $lte: `${month}-31` } } : { school: schoolId, date },
    )
      .select("student status")
      .lean();
    const rows = monthly ? summarizeMonth(students as any, records as any) : summarizeDay(students as any, records as any);
    const totals = rows.reduce(
      (a, r) => ({ total: a.total + r.total, present: a.present + r.present, absent: a.absent + r.absent, leave: a.leave + r.leave, marked: a.marked + r.marked, unmarked: a.unmarked + r.unmarked }),
      { total: 0, present: 0, absent: 0, leave: 0, marked: 0, unmarked: 0 },
    );
    return NextResponse.json({ date, month: monthly ? month : "", rows, totals, pct: totals.marked ? Math.round((totals.present / totals.marked) * 100) : 0 });
  }

  if (mode === "absent") {
    if (!isValidDate(date)) return fail("Enter a valid date");
    const students = sortStudents((await roster(me, schoolId)).filter((st: any) => inClassSection(st, className, "")));
    const records = await Attendance.find({ school: schoolId, date, status: "Absent" }).select("student").lean();
    const absentIds = new Set(records.map((r: any) => String(r.student)));
    return NextResponse.json({ date, className: className || "All", students: students.filter((st: any) => absentIds.has(String(st._id))) });
  }

  if (mode === "month") {
    if (!isValidMonth(month)) return fail("Enter a valid month");
    if (!className) return fail("Select a class");
    const students = sortStudents((await roster(me, schoolId)).filter((st: any) => inClassSection(st, className, section)));
    const records = await Attendance.find({ school: schoolId, date: { $gte: `${month}-01`, $lte: `${month}-31` } }).select("student date status").lean();
    // keep students who have records this month even if they are no longer Active
    const known = new Set(students.map((st: any) => String(st._id)));
    const extra = await Student.find({ school: schoolId, _id: { $in: records.map((r: any) => r.student).filter((id: any) => !known.has(String(id))) } })
      .select(FIELDS)
      .lean();
    const extraInClass = extra.filter((st: any) => inClassSection(st, className, section) && (me.role === "school" || studentRights(me, st)?.own));
    return NextResponse.json({ month, className, section, students: sortStudents([...students, ...extraInClass]), records });
  }

  // mode = "day": the Mark Attendance roster + what is already saved for the date
  if (!isValidDate(date)) return fail("Enter a valid date");
  if (!className) return fail("Select a class");
  const students = sortStudents((await roster(me, schoolId)).filter((st: any) => inClassSection(st, className, section)));
  const records = await Attendance.find({ school: schoolId, date, student: { $in: students.map((st: any) => st._id) } }).select("student status").lean();
  return NextResponse.json({ date, className, section, students, records });
}

export async function POST(req: NextRequest) {
  const s = await attendanceScope();
  if (s.error) return s.error;
  const { me, schoolId } = s as any;
  const body = await req.json().catch(() => null);
  const date = String(body?.date || "").trim();
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  if (!isValidDate(date)) return fail("Enter a valid date");
  if (!rows.length) return fail("No attendance rows to save");
  await connectDb();

  const students = await Student.find({ school: schoolId, _id: { $in: rows.map((r: any) => r?.student) } }).select("_id className section").lean();
  const byId = new Map(students.map((st: any) => [String(st._id), st]));
  const ops: any[] = [];
  for (const r of rows) {
    const st = byId.get(String(r?.student || ""));
    if (!st) return fail("One of the students does not belong to this school", 403);
    if (me.role === "teacher" && !studentRights(me, st)?.own) return fail("You can only mark attendance for your own class", 403);
    const status = normalizeAttendanceStatus(r?.status);
    if (!status) return fail("Attendance must be Present, Absent or Leave");
    ops.push({
      updateOne: {
        filter: { school: schoolId, student: st._id, date },
        update: { $set: { school: schoolId, student: st._id, date, status, className: String(st.className || ""), section: String(st.section || "").trim() } },
        upsert: true,
      },
    });
  }
  await Attendance.bulkWrite(ops, { ordered: false });
  return NextResponse.json({ ok: true, saved: ops.length, date });
}
