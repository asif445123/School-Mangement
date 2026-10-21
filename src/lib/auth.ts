import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDb } from "./db";
import User from "@/models/user";

const secret = process.env.JWT_SECRET || "change-me";
export const signToken = (id: string, remember: boolean) => jwt.sign({ id }, secret, { expiresIn: remember ? "30d" : "1d" });

export async function getSessionUser() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  try {
    const { id } = jwt.verify(token, secret) as any;
    await connectDb();
    const user = await User.findById(id).select("-password");
    return user && user.status === "approved" ? user : null;
  } catch { return null; }
}
export const fail = (error: string, status = 400, extra: any = {}) => NextResponse.json({ error, ...extra }, { status });

export const schoolIdOf = (u: any) => (u.role === "school" ? u._id : u.school || null);
