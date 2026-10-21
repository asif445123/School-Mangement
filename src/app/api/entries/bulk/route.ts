import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail } from "@/lib/auth";
import { scope } from "@/lib/scope";
import Account from "@/models/account";
import Entry from "@/models/entry";

// Saves several entries as one voucher (JV). With `jv` it replaces that voucher's entries.
export async function POST(req: NextRequest) {
  const s = await scope("entries", true);
  if (s.error) return s.error;
  try {
    const { date, rows, jv } = await req.json();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return fail("Select the date");
    if (!Array.isArray(rows) || !rows.length) return fail("Add at least one entry");
    if (rows.some((r: any) => !(Number(r.amount) > 0))) return fail("Amount must be greater than 0");
    await connectDb();
    const ids = [...new Set(rows.map((r: any) => String(r.account)))];
    if ((await Account.countDocuments({ _id: { $in: ids }, school: s.schoolId })) !== ids.length) return fail("Invalid account");
    let voucher = Number(jv) || 0;
    if (voucher) {
      if (!(await Entry.exists({ school: s.schoolId, jv: voucher }))) return fail("Voucher not found", 404);
      await Entry.deleteMany({ school: s.schoolId, jv: voucher });
    } else {
      const last: any = await Entry.findOne({ school: s.schoolId, jv: { $exists: true } }).sort({ jv: -1 }).select("jv").lean();
      voucher = (last?.jv || 0) + 1;
    }
    await Entry.insertMany(rows.map((r: any) => ({ school: s.schoolId, jv: voucher, date, account: r.account, narration: String(r.narration || "").slice(0, 300), amount: Number(r.amount) })));
    return NextResponse.json({ ok: true, jv: voucher });
  } catch (e: any) { return fail(e.message || "Server error", 500); }
}
