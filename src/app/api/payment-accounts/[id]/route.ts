import { NextRequest, NextResponse } from "next/server";
import { fail, getSessionUser } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Types } from "mongoose";
import PaymentAccount from "@/models/payment-account";
import { cleanPaymentAccount } from "@/lib/payment-accounts";
type Ctx = { params: Promise<{ id: string }> };
export async function PUT(req: NextRequest, { params }: Ctx) {
  const user = await getSessionUser();
  if (user?.role !== "school") return fail("School administrators only", 403);
  try {
    const id = (await params).id;
    if (!Types.ObjectId.isValid(id)) return fail("Account not found", 404);
    const data = cleanPaymentAccount(await req.json());
    await connectDb();
    const item = await PaymentAccount.findOneAndUpdate({ _id: id, school: user._id }, { $set: data }, { new: true, runValidators: true });
    return item ? NextResponse.json({ item }) : fail("Account not found", 404);
  } catch (e: any) { return fail(e.message); }
}
export async function DELETE(_: NextRequest, { params }: Ctx) {
  const user = await getSessionUser();
  if (user?.role !== "school") return fail("School administrators only", 403);
  const id = (await params).id;
  if (!Types.ObjectId.isValid(id)) return fail("Account not found", 404);
  await connectDb();
  const item = await PaymentAccount.findOneAndDelete({ _id: id, school: user._id });
  return item ? NextResponse.json({ ok: true }) : fail("Account not found", 404);
}
