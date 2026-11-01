import { NextRequest, NextResponse } from "next/server";
import { fail, getSessionUser } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { encryptCredential } from "@/lib/credential-crypto";
import User from "@/models/user";
export const runtime = "nodejs";
const safe = (u: any) => ({ enabled: !!u.whatsapp?.enabled, phoneNumberId: u.whatsapp?.phoneNumberId || "", templateName: u.whatsapp?.templateName || "", templateLanguage: u.whatsapp?.templateLanguage || "en_US", countryCallingCode: u.whatsapp?.countryCallingCode || "92", hasAccessToken: !!u.whatsapp?.accessToken });
export async function GET() {
  const session = await getSessionUser();
  if (session?.role !== "school") return fail("School administrators only", 403);
  const user = await User.findById(session._id).select("+whatsapp.accessToken");
  return NextResponse.json({ settings: safe(user), encryptionReady: (process.env.CREDENTIALS_ENCRYPTION_KEY || "").length >= 32 }, { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(req: NextRequest) {
  const session = await getSessionUser();
  if (session?.role !== "school") return fail("School administrators only", 403);
  try {
    const body = await req.json();
    const phoneNumberId = String(body.phoneNumberId || "").trim();
    const templateName = String(body.templateName || "").trim();
    const templateLanguage = String(body.templateLanguage || "en_US").trim();
    const countryCallingCode = String(body.countryCallingCode || "92").replace(/\D/g, "");
    const accessToken = String(body.accessToken || "").trim();
    if (!/^\d{5,30}$/.test(phoneNumberId)) return fail("Enter the numeric WhatsApp Business Phone Number ID from Meta");
    if (templateName && !/^[a-z0-9_]{1,512}$/.test(templateName)) return fail("Template name must use lowercase letters, numbers and underscores");
    if (!/^[a-z]{2,3}(_[A-Z]{2})?$/.test(templateLanguage)) return fail("Enter a template language code such as en_US or ur");
    if (!/^[1-9]\d{0,3}$/.test(countryCallingCode)) return fail("Enter a country calling code such as 92, without +");
    if (accessToken && (accessToken.length < 20 || accessToken.length > 2048)) return fail("Enter a valid Meta access token");
    await connectDb();
    const user = await User.findById(session._id).select("+whatsapp.accessToken");
    if (body.enabled && !phoneNumberId) return fail("Phone Number ID is required");
    if (body.enabled && !accessToken && !user.whatsapp?.accessToken) return fail("Save an access token before enabling WhatsApp sending");
    user.whatsapp = { ...user.whatsapp?.toObject(), enabled: !!body.enabled, phoneNumberId, templateName, templateLanguage, countryCallingCode, accessToken: user.whatsapp?.accessToken || "" };
    if (body.clearToken) { user.whatsapp.accessToken = ""; user.whatsapp.enabled = false; }
    if (accessToken) user.whatsapp.accessToken = encryptCredential(accessToken);
    await user.save();
    return NextResponse.json({ settings: safe(user) });
  } catch (e: any) { return fail(e.message); }
}
