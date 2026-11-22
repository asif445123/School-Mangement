import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail, getSessionUser } from "@/lib/auth";
import { belongsToStudentClass, feeTotals, linkedStudentIds } from "@/lib/guardian";
import { previousPendingForMonth } from "@/lib/fee-calculation";
import { PORTAL_FEE_FIELDS } from "@/lib/portal-fees";
import Student from "@/models/student";
import Fee from "@/models/fee";
import Diary from "@/models/diary";
import Mark from "@/models/mark";
import Paper from "@/models/paper";
import User from "@/models/user";
import PaymentAccount from "@/models/payment-account";
import { publicPaymentAccount } from "@/lib/payment-accounts";

// Everything a student / guardian may see. A guardian login is linked to ALL
// of his or her children in the school (see lib/guardian), so this returns
// one bundle per child - own fee chalans, class diary, test papers and exam
// marks - plus a combined family fee summary. A login with a single child
// behaves exactly as before: the response still carries that child's data in
// the original top-level fields (student / fees / diary / marks / papers).
export async function GET() {
  try {
    const me = await getSessionUser();
    if (me?.role !== "student") return fail("Students only", 403);
    await connectDb();
    const school = me.school;
    const ids = linkedStudentIds(me);
    const found: any[] = await Student.find({ _id: { $in: ids }, school }).lean();
    // keep the linked order (first child first) whatever order Mongo returned
    const students = ids.map((id) => found.find((s) => String(s._id) === id)).filter(Boolean);
    if (!students.length) return fail("Student record not found", 404);

    const studentIds = students.map((s) => s._id);
    const classNames = [...new Set(students.map((s) => s.className))];
    const classLimit = 500 * classNames.length; // the old 500-per-child allowance, per class
    const [fees, diary, marks, papers, owner, accounts] = await Promise.all([
      // Inclusion projection only - never `-whatsapp` (see lib/portal-fees).
      Fee.find({ student: { $in: studentIds }, school }).select(PORTAL_FEE_FIELDS).sort({ month: -1 }).lean(),
      Diary.find({ className: { $in: classNames }, school }).sort({ date: -1 }).limit(classLimit).lean(),
      // paper questions are not sent to students
      Mark.find({ student: { $in: studentIds }, school }).populate({ path: "paper", select: "title type subject date totalMarks term className section" }).sort({ createdAt: -1 }).lean(),
      Paper.find({ className: { $in: classNames }, school }).select("title type subject date totalMarks term className section").sort({ date: -1 }).limit(classLimit).lean(),
      User.findById(school).select("schoolName logo").lean(),
      PaymentAccount.find({ school, active: true }).sort({ createdAt: 1 }).lean(),
    ]);

    const children = students.map((student) => {
      const rawFees = fees.filter((f: any) => String(f.student) === String(student._id));
      const ownFees = rawFees.map((f: any) => ({
        ...f,
        previous: previousPendingForMonth(rawFees, f.month),
        actualFee: f.actualFee ?? f.amount,
        discount: f.discount ?? 0,
        admissionFee: f.admissionFee ?? 0,
        annualCharges: f.annualCharges ?? 0,
      }));
      return {
        student,
        fees: ownFees,
        diary: diary.filter((x: any) => belongsToStudentClass(x, student)),
        marks: marks.filter((x: any) => String(x.student) === String(student._id)),
        papers: papers.filter((x: any) => belongsToStudentClass(x, student)),
        feeSummary: feeTotals(ownFees),
      };
    });
    const family = children.reduce(
      (a, c) => ({ total: a.total + c.feeSummary.total, paid: a.paid + c.feeSummary.paid, balance: a.balance + c.feeSummary.balance }),
      { total: 0, paid: 0, balance: 0 },
    );
    const first = children[0];
    return NextResponse.json({
      schoolInfo: { name: (owner as any)?.schoolName || "School", logo: (owner as any)?.logo || "" },
      paymentAccounts: accounts.map(publicPaymentAccount),
      guardian: {
        name: me.name, email: me.email,
        fatherName: students.map((s) => s.fatherName).find(Boolean) || "",
        childCount: children.length,
      },
      children,
      family,
      // original single-student shape (first child) for any older client
      student: first.student, fees: first.fees, diary: first.diary, marks: first.marks, papers: first.papers,
    });
  } catch (err: any) {
    console.error("GET /api/my error:", err);
    return fail(err?.message || "Failed to load student portal", 500);
  }
}
