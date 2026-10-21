import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail, getSessionUser } from "@/lib/auth";
import Student from "@/models/student";
import Fee from "@/models/fee";
import Diary from "@/models/diary";
import Mark from "@/models/mark";
import Paper from "@/models/paper";

// Everything a student may see about himself / herself
export async function GET() {
  const me = await getSessionUser();
  if (me?.role !== "student") return fail("Students only", 403);
  await connectDb();
  const student: any = await Student.findOne({ _id: me.student, school: me.school }).lean();
  if (!student) return fail("Student record not found", 404);
  const school = me.school;
  const [fees, diary, marks, papers] = await Promise.all([
    Fee.find({ student: student._id, school }).sort({ month: -1 }).lean(),
    Diary.find({ className: student.className, school }).sort({ date: -1 }).limit(500).lean(),
    // paper questions are not sent to students
    Mark.find({ student: student._id, school }).populate({ path: "paper", select: "title type subject date totalMarks term className" }).sort({ createdAt: -1 }).lean(),
    Paper.find({ className: student.className, school }).select("title type subject date totalMarks term").sort({ date: -1 }).limit(500).lean(),
  ]);
  return NextResponse.json({ student, fees, diary, marks, papers });
}
