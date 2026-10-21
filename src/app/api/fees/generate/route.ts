import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail } from "@/lib/auth";
import { scope } from "@/lib/scope";
import Student from "@/models/student";
import Fee from "@/models/fee";

export async function POST(req: NextRequest) {
  const s = await scope("fees", true);
  if (s.error) return s.error;
  if (s.user.role !== "school") return fail("Only the school can generate chalans", 403);
  const { month } = await req.json();
  if (!/^\d{4}-\d{2}$/.test(month || "")) return fail("Invalid month");
  await connectDb();
  const students = await Student.find({ school: s.schoolId });
  const existing = new Set((await Fee.find({ month, school: s.schoolId })).map((f: any) => String(f.student)));
  const docs = students.filter((st: any) => !existing.has(String(st._id)) && !(st.leftDate && st.leftDate < month + "-01")).map((st: any, i: number) => ({
    school: s.schoolId, student: st._id, month, actualFee: st.monthlyFee || 0, discount: Math.min(st.discount || 0, st.monthlyFee || 0), amount: Math.max(0, (st.monthlyFee || 0) - (st.discount || 0)), chalanNo: `${month.replace("-", "")}-${st.className}-${st.rollNo || i + 1}`,
  }));
  if (docs.length) await Fee.insertMany(docs);
  return NextResponse.json({ created: docs.length });
}
