// Pakistan is the default for local school numbers. International numbers must
// start with + (or 00), so a local number is never mistaken for another country.
export function normalizeWhatsAppNumber(value: unknown, countryCallingCode = "92"): string {
  const raw = String(value ?? "").trim();
  if (!raw || !/^\+?[\d\s().-]+$/.test(raw)) return "";
  const international = raw.startsWith("+") || raw.startsWith("00");
  let digits = raw.replace(/\D/g, "");
  if (raw.startsWith("00")) digits = digits.slice(2);
  if (!international) {
    const country = String(countryCallingCode).replace(/\D/g, "") || "92";
    if (digits.startsWith("0")) digits = country + digits.slice(1);
    else if (digits.length === 10) digits = country + digits;
  }
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : "";
}

export function studentWhatsApp(student: any, countryCode = "92") {
  const usesPhone = !String(student?.whatsapp || "").trim();
  const value = String((usesPhone ? student?.phone : student?.whatsapp) || "").trim();
  return { value, number: normalizeWhatsAppNumber(value, countryCode), usesPhone };
}

export const whatsappDisplay = (student: any) => String(student?.whatsapp || "").trim() || String(student?.phone || "").trim() || "—";
