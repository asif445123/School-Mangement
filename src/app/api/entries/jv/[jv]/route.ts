import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail } from "@/lib/auth";
import { scope } from "@/lib/scope";
import Entry from "@/models/entry";

// Deletes a whole voucher (all its entries)
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ jv: string }> }) {
  const s = await scope("entries", true);
  if (s.error) return s.error;
  const jv = Number((await params).jv);
  if (!jv) return fail("Invalid voucher");
  await connectDb();
  await Entry.deleteMany({ school: s.schoolId, jv });
  return NextResponse.json({ ok: true });
}
