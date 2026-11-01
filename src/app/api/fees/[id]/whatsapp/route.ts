import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { fail, getSessionUser } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { voucherContext } from "@/lib/fees-server";
import { studentWhatsApp } from "@/lib/phone";
import { renderChalan } from "@/lib/chalan-image";
import { sendWhatsAppImage } from "@/lib/whatsapp-server";
import Fee from "@/models/fee";
import User from "@/models/user";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (user?.role !== "school") return fail("Only the school administrator can send fee chalans", 403);
  const body = await req.json().catch(() => ({}));
  if (!["api", "manual"].includes(body.mode)) return fail("Choose a sending method");
  if (body.mode === "manual" && body.confirmed !== true) return fail("Confirm that you sent the image in WhatsApp first");
  await connectDb();
  const id = (await params).id, token = randomUUID(), now = new Date();
  if (!Types.ObjectId.isValid(id)) return fail("Chalan not found", 404);
  // Check ownership before the lease so another school's voucher always returns
  // 404, never a 409 that would disclose an in-progress send.
  if (!await Fee.exists({ _id: id, school: user._id })) return fail("Chalan not found", 404);
  // Atomic lease prevents a double click / concurrent request from sending twice.
  // A crashed request can be retried after 90 seconds; each HTTP request times out at 25s.
  const fee = await Fee.findOneAndUpdate({ _id: id, school: user._id, $or: [{ "whatsapp.lockUntil": { $exists: false } }, { "whatsapp.lockUntil": null }, { "whatsapp.lockUntil": { $lte: now } }] }, { $set: { "whatsapp.lockUntil": new Date(now.getTime() + 90_000), "whatsapp.lockToken": token } }, { new: true } );
  if (!fee) return fail("Chalan not found, or a send is already in progress. Refresh before trying again.", 409);
  try {
    const { fee: voucher, school, accounts } = await voucherContext(fee);
    const owner = await User.findById(user._id).select("+whatsapp.accessToken").lean();
    const config = (owner as any)?.whatsapp;
    const recipient = studentWhatsApp(voucher.student, config?.countryCallingCode || "92");
    if (!recipient.number) throw new Error("Add a valid student WhatsApp number or phone number first. International numbers need a country code.");
    if (body.expectedRevision !== undefined && Number(body.expectedRevision) !== (fee.revision || 0)) throw new Error("This voucher changed. Refresh its image before sending.");
    let messageId = "", deliveryStatus = "manually_confirmed";
    if (body.mode === "api") {
      const image = await renderChalan(voucher, school, accounts);
      const result = await sendWhatsAppImage(config, recipient.number, image.png, image.filename, voucher);
      messageId = result.id; deliveryStatus = result.status;
    }
    const at = new Date();
    const item = await Fee.findOneAndUpdate({ _id: id, school: user._id, "whatsapp.lockToken": token }, {
      $set: { "whatsapp.lastStatus": "sent", "whatsapp.lastAttemptAt": at, "whatsapp.lastSentAt": at, "whatsapp.lastTo": recipient.number, "whatsapp.lastBy": body.mode === "manual" ? `${user.name} (manual confirmation)` : user.name, "whatsapp.lastMessageId": messageId, "whatsapp.sentRevision": fee.revision || 0, "whatsapp.deliveryStatus": deliveryStatus },
      $inc: { "whatsapp.sentCount": 1, "whatsapp.attemptCount": 1 }, $unset: { "whatsapp.lastError": 1, "whatsapp.lockUntil": 1, "whatsapp.lockToken": 1 },
    }, { new: true });
    return NextResponse.json({ item, message: body.mode === "manual" ? "Manual WhatsApp send recorded" : "Image accepted by WhatsApp" });
  } catch (e: any) {
    const item = await Fee.findOneAndUpdate({ _id: id, school: user._id, "whatsapp.lockToken": token }, { $set: { "whatsapp.lastStatus": "failed", "whatsapp.lastAttemptAt": new Date(), "whatsapp.lastError": String(e.message).slice(0, 500), "whatsapp.lastBy": user.name }, $inc: { "whatsapp.attemptCount": 1 }, $unset: { "whatsapp.lockUntil": 1, "whatsapp.lockToken": 1 } }, { new: true });
    return NextResponse.json({ error: e.message, item }, { status: 422 });
  }
}
