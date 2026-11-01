import { NextRequest, NextResponse } from "next/server";
import { fail, getSessionUser, schoolIdOf } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Types } from "mongoose";
import { linkedStudentIds } from "@/lib/guardian";
import { voucherContext } from "@/lib/fees-server";
import { renderChalan } from "@/lib/chalan-image";
import Fee from "@/models/fee";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return fail("Not logged in", 401);
  if (!["school", "student"].includes(user.role)) return fail("Access denied", 403);
  await connectDb();
  const id = (await params).id;
  if (!Types.ObjectId.isValid(id)) return fail("Chalan not found", 404);
  const filter: any = { _id: id, school: schoolIdOf(user) };
  if (user.role === "student") filter.student = { $in: linkedStudentIds(user) };
  const fee = await Fee.findOne(filter);
  if (!fee) return fail("Chalan not found", 404);
  try {
    const context = await voucherContext(fee);
    const image = await renderChalan(context.fee, context.school, context.accounts);
    return new NextResponse(new Uint8Array(image.png), { headers: { "Content-Type": "image/png", "Content-Disposition": `${req.nextUrl.searchParams.has("download") ? "attachment" : "inline"}; filename="${image.filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return fail("Could not create the chalan image. Please try again.", 500); }
}
