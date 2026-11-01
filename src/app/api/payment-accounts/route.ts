import { NextRequest, NextResponse } from "next/server";
import { fail, getSessionUser } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import PaymentAccount from "@/models/payment-account";
import { cleanPaymentAccount } from "@/lib/payment-accounts";
export async function GET() {
  const user = await getSessionUser();
  if (user?.role !== "school") return fail("School administrators only", 403);
  await connectDb();
  return NextResponse.json({ items: await PaymentAccount.find({ school: user._id }).sort({ createdAt: 1 }).lean() }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (user?.role !== "school") return fail("School administrators only", 403);
  try {
    const data = cleanPaymentAccount(await req.json());
    await connectDb();
    if (await PaymentAccount.countDocuments({ school: user._id }) >= 30) return fail("Maximum 30 payment accounts");
    return NextResponse.json({ item: await PaymentAccount.create({ ...data, school: user._id }) });
  } catch (e: any) { return fail(e.message); }
}
