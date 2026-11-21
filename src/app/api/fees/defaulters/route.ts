import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { scope } from "@/lib/scope";
import Fee from "@/models/fee";

// A compact source for the reminder screen. Unlike the generic fee listing it
// does not calculate a derived previous balance for every voucher; the client
// groups each voucher's own remaining amount once per student.
export async function GET() {
  const access = await scope("fees", false);
  if (access.error) return access.error;

  await connectDb();
  const rows = await Fee.find({ school: access.schoolId })
    .select("student month amount paid")
    .populate({
      path: "student",
      select: "name fatherName className section rollNo phone whatsapp status",
    })
    .sort({ month: -1 })
    .lean();
  const items = rows.filter((fee: any) => (Number(fee.amount) || 0) - (Number(fee.paid) || 0) > 0);

  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "no-store" } },
  );
}
