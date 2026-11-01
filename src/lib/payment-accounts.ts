import type { Field } from "./alerts";
export const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank account" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "Easypaisa" },
  { value: "raast", label: "Raast ID" },
];
export const accountTypeLabel = (type: string) => ACCOUNT_TYPES.find((t) => t.value === type)?.label || type;
export const paymentAccountFields: Field[] = [
  { name: "type", label: "Account type", type: "select", choices: ACCOUNT_TYPES, required: true },
  { name: "title", label: "Account title", required: true },
  { name: "accountNumber", label: "Account number / mobile number / Raast ID", required: true, hint: "For JazzCash or Easypaisa enter the wallet mobile number. Raast may also be an alias." },
  { name: "bankName", label: "Bank name (bank accounts only)" },
  { name: "iban", label: "IBAN (optional)" },
  { name: "branch", label: "Branch / branch code (optional)" },
  { name: "instructions", label: "Payment instructions (optional)", type: "textarea" },
  { name: "active", label: "Show this account on fee vouchers", type: "checkbox" },
];
export function cleanPaymentAccount(body: any) {
  const text = (key: string, max: number) => String(body[key] ?? "").trim().slice(0, max);
  if (!ACCOUNT_TYPES.some((t) => t.value === body.type)) throw new Error("Choose a valid account type");
  if (!text("title", 100) || !text("accountNumber", 64)) throw new Error("Account title and account number / ID are required");
  if (body.type === "bank" && !text("bankName", 100)) throw new Error("Bank name is required for a bank account");
  const iban = text("iban", 34).replace(/\s/g, "").toUpperCase();
  if (iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) throw new Error("Enter a valid IBAN or leave it empty");
  if (["jazzcash", "easypaisa"].includes(body.type) && !/^\+?[\d\s()-]{10,20}$/.test(text("accountNumber", 64))) throw new Error("Enter a valid wallet mobile number");
  return { type: body.type, title: text("title", 100), accountNumber: text("accountNumber", 64), bankName: body.type === "bank" ? text("bankName", 100) : "", iban: body.type === "bank" ? iban : "", branch: body.type === "bank" ? text("branch", 120) : "", instructions: text("instructions", 300), active: body.active !== false };
}
export const publicPaymentAccount = (a: any) => ({ _id: String(a._id), type: a.type, title: a.title, accountNumber: a.accountNumber, bankName: a.bankName || "", iban: a.iban || "", branch: a.branch || "", instructions: a.instructions || "" });
