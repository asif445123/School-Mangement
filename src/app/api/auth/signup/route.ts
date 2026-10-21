import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { fail } from "@/lib/auth";
import User from "@/models/user";

async function handler(req: NextRequest) {
  const { name, schoolName, email, phone, password, logo } = await req.json();
  if (!name || !email || !password || password.length < 6) return fail("Name, email and a password of 6+ characters are required");
  await connectDb();
  if (await User.findOne({ email: email.toLowerCase() })) return fail("Email already registered", 409);
  const isFirst = (await User.countDocuments()) === 0; // first account becomes platform admin
  if (!isFirst && !schoolName) return fail("School name is required");
  await User.create({ name, schoolName, email, phone, logo: typeof logo === "string" && logo.startsWith("data:image/") && logo.length < 400000 ? logo : "", password: await bcrypt.hash(password, 10), role: isFirst ? "admin" : "school", status: isFirst ? "approved" : "pending" });
  return NextResponse.json({ ok: true, firstAdmin: isFirst });
}

export async function POST(req: NextRequest) {
  try { return await handler(req); }
  catch (e: any) {
    console.error(e);
    const db = /ECONNREFUSED|ServerSelection|buffering timed out/i.test(String(e?.message));
    return fail(db ? "Cannot connect to MongoDB. Make sure MongoDB is running (check MONGODB_URI in .env.local)." : e.message || "Server error", 500);
  }
}
