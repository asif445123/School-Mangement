import { accountTypeLabel } from "./payment-accounts";
export type VoucherSchool = { name?: string; logo?: string };
export const rupees = (value: any) => `Rs ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
export function chalanRows(fee: any) {
  const monthly = Number(fee.actualFee ?? fee.amount ?? 0), discount = Number(fee.discount || 0);
  const admission = Number(fee.admissionFee || 0), annual = Number(fee.annualCharges || 0);
  const previous = Number(fee.previous || 0), paid = Number(fee.paid || 0), total = previous + Number(fee.amount || 0);
  return { monthly, discount, admission, annual, previous, paid, total, balance: Math.max(0, total - paid), currentPending: Math.max(0, Number(fee.amount || 0) - paid), lines: [
    ["Monthly fee", monthly], ["Discount", -discount], ["Admission fee", admission], ["Annual charges", annual],
    ["This voucher total", Number(fee.amount || 0)], ["Previous pending", previous], ["Total payable", total], ["Received", paid], ["Balance due", Math.max(0, total - paid)],
  ] as [string, number][] };
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
