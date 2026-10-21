import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/auth";
import { sendContactMessage } from "@/lib/mailer";

// Public "Contact Us" endpoint (used by the /contact page): emails the message to the owner.
const hits = new Map<string, number[]>(); // simple per-IP limit: 5 messages per hour
const clean = (s: any, max: number) => String(s || "").replace(/[\r\n]+/g, " ").trim().slice(0, max);

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3_600_000);
  if (recent.length >= 5) return fail("Too many messages from this device. Please try later or use WhatsApp.", 429);

  const { name, email, message, kind } = await req.json();
  const from = clean(name, 80), reply = clean(email, 120), text = String(message || "").trim().slice(0, 1500);
  if (!from) return fail("Please enter your name or school name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply)) return fail("Please enter a valid email address");
  if (text.length < 5) return fail("Please write a short message");

  hits.set(ip, [...recent, now]); // count every attempt that passed validation
  try {
    const subject = kind === "rejected" ? `Account approval request - ${from}` : kind === "pending" ? `School registration approval - ${from}` : `New contact message from ${from}`;
    await sendContactMessage(from, reply, text, subject);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const notSetUp = String(e?.message).startsWith("SMTP is not configured");
    return fail(notSetUp ? "Email is not set up on the server yet. Please contact us on WhatsApp." : "The email could not be sent right now. Please contact us on WhatsApp.", 500);
  }
}
