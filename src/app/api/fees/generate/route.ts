import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail } from "@/lib/auth";
import { scope } from "@/lib/scope";
import Student from "@/models/student";
import Fee from "@/models/fee";
import { feeValues, validMonth } from "@/lib/fee-calculation";

export async function POST(req: NextRequest) {
  const s = await scope("fees", true);
  if (s.error) return s.error;
  if (s.user.role !== "school") return fail("Only the school can generate chalans", 403);
  const { month } = await req.json();
  if (!validMonth(month)) return fail("Invalid month");
  await connectDb();
  const students = await Student.find({ school: s.schoolId });
  const existing = new Set((await Fee.find({ month, school: s.schoolId })).map((f: any) => String(f.student)));
  // One chalan per student per month: students who already have a chalan for
  // this month are skipped, never duplicated (the unique {student, month}
  // index is the backstop if two requests race).
  const eligible = students.filter((st: any) => !(st.leftDate && st.leftDate < month + "-01"));
  const skipped = eligible.filter((st: any) => existing.has(String(st._id))).length;
  const docs = eligible.filter((st: any) => !existing.has(String(st._id))).map((st: any) => ({
    school: s.schoolId, student: st._id, month,
    ...feeValues({ actualFee: st.monthlyFee || 0, discount: st.discount || 0 }),
    // Admission and annual charges are added per voucher, never silently repeated every month.
    admissionFee: 0, annualCharges: 0,
    chalanNo: `${month.replace("-", "")}-${String(st.className).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}-${String(st.rollNo || String(st._id).slice(-6)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`,
  }));
  if (docs.length) await Fee.insertMany(docs);
  return NextResponse.json({ created: docs.length, skipped });
}
