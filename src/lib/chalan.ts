import { accountTypeLabel } from "./payment-accounts";
export type VoucherSchool = { name?: string; logo?: string };
export const rupees = (value: any) => `Rs ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatMonth(month: string) {
  if (!month) return "—";
  if (month === "0000-00") return "Opening balance";
  const m = String(month).trim();
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  if (!match) return m;
  const year = match[1], idx = Number(match[2]) - 1;
  if (idx < 0 || idx > 11) return m;
  return `${MONTHS_SHORT[idx]} ${year}`;
}
export function chalanRows(fee: any) {
  const monthly = Number(fee.actualFee ?? fee.amount ?? 0), discount = Number(fee.discount || 0);
  const admission = Number(fee.admissionFee || 0), annual = Number(fee.annualCharges || 0);
  const previous = Number(fee.previous || 0), paid = Number(fee.paid || 0), total = previous + Number(fee.amount || 0);
  const lines: [string, number][] = [["Monthly fee", monthly]];
  if (discount > 0) lines.push(["Discount", -discount]);
  lines.push(["Admission fee", admission], ["Annual charges", annual]);
  lines.push(["Payable", Number(fee.amount || 0)], ["Previous pending", previous], ["Total payable", total], ["Received", paid], ["Balance due", Math.max(0, total - paid)]);
  return { monthly, discount, admission, annual, previous, paid, total, balance: Math.max(0, total - paid), currentPending: Math.max(0, Number(fee.amount || 0) - paid), lines };
}
export const accountLines = (account: any) => [
  accountTypeLabel(account.type), account.title,
  ...(account.bankName ? [account.bankName] : []),
  `Account / ID: ${account.accountNumber}`,
  ...(account.iban ? [`IBAN: ${account.iban}`] : []),
  ...(account.branch ? [`Branch: ${account.branch}`] : []),
  ...(account.instructions ? [account.instructions] : []),
];
export const chalanFileName = (fee: any) => `Fee-Chalan-${String(fee.chalanNo || fee._id).replace(/[^a-zA-Z0-9_-]/g, "-")}.png`;
