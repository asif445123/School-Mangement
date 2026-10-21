import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { fail } from "@/lib/auth";
import User from "@/models/user";

const hits = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local", now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3_600_000);
  if (recent.length >= 20) return fail("Too many attempts. Please try again later.", 429);
  hits.set(ip, [...recent, now]);

  const { token, password } = await req.json();
  if (typeof token !== "string" || !token) return fail("This reset link is invalid. Please request a new one.");
  if (typeof password !== "string" || password.length < 6) return fail("Password must be 6+ characters");
  await connectDb();
  const user = await User.findOne({ resetTokenHash: crypto.createHash("sha256").update(token).digest("hex"), resetExpires: { $gt: new Date() } });
  if (!user) return fail("This reset link is invalid or has expired. Please request a new one.");
  user.password = await bcrypt.hash(password, 10);
  user.resetTokenHash = undefined; // a link works only once
  user.resetExpires = undefined;
  await user.save();
  return NextResponse.json({ ok: true });
}
