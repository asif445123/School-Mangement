import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { fail } from "@/lib/auth";
import { sendResetEmail } from "@/lib/mailer";
import User from "@/models/user";

// Emails a password reset link. The answer is the same whether or not the email has an account.
const ipHits = new Map<string, number[]>(), mailHits = new Map<string, number[]>();
function tooMany(map: Map<string, number[]>, key: string, max: number) {
  const now = Date.now(), recent = (map.get(key) || []).filter((t) => now - t < 3_600_000);
  map.set(key, [...recent, now]);
  return recent.length >= max;
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const addr = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return fail("Please enter a valid email address");
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return fail("Email is not set up on the server yet. Please contact the school admin.", 500);
  if (tooMany(ipHits, req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local", 10)) return fail("Too many requests. Please try again later.", 429);
  if (tooMany(mailHits, addr, 3)) return NextResponse.json({ ok: true }); // silently stop e-mail bombing of one address

  await connectDb();
  const user = await User.findOne({ email: addr });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    user.resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.resetExpires = new Date(Date.now() + 3_600_000); // valid for 1 hour
    await user.save();
    const base = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    try { await sendResetEmail(addr, `${base}/reset-password?token=${token}`); }
    catch { return fail("The email could not be sent right now. Please try again later.", 500); }
  }
  return NextResponse.json({ ok: true });
}
