// `amount` remains the total CURRENT-voucher charge (including the two extra
// charges), so existing reports, guardian balances and receiving keep working.
export const CHARGE_LIMIT = 100_000_000;
export function feeValues(input: any = {}) {
  const actualFee = Number(input.actualFee ?? input.monthlyFee ?? 0);
  const discount = Number(input.discount ?? 0);
  const admissionFee = Number(input.admissionFee ?? 0);
  const annualCharges = Number(input.annualCharges ?? 0);
  for (const value of [actualFee, discount, admissionFee, annualCharges]) {
    if (!Number.isFinite(value) || value < 0 || value > CHARGE_LIMIT) throw new Error("Fee amounts must be between 0 and 100,000,000");
  }
  if (discount > actualFee) throw new Error("Discount cannot exceed the monthly fee");
  const round = (n: number) => Math.round(n * 100) / 100;
  return { actualFee: round(actualFee), discount: round(discount), admissionFee: round(admissionFee), annualCharges: round(annualCharges), amount: round(actualFee - discount + admissionFee + annualCharges) };
}
export const feeStatus = (amount: number, paid: number) => paid >= amount ? "paid" : paid > 0 ? "partial" : "unpaid";
export const validMonth = (value: any) => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
export const previousBalance = (fees: any[], studentId: any, month: string) => fees.filter((f) => String(f.student?._id || f.student) === String(studentId) && f.month < month).reduce((sum, f) => sum + Math.max(0, Number(f.amount || 0) - Number(f.paid || 0)), 0);

// --- Student portal chalans ------------------------------------------------
// A student has at most ONE monthly chalan per month (enforced by the unique
// {student, month} index), plus an optional opening balance ("0000-00").
// The student portal lists ALL chalans of a child (newest month first) while
// still tracking previous pending per voucher for print / image rendering.
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatMonthLabel(month: string) {
  if (!month) return "—";
  if (month === "0000-00") return "Previous pending";
  const m = String(month).trim();
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  if (!match) return m;
  const idx = Number(match[2]) - 1;
  if (idx < 0 || idx > 11) return m;
  return `${MONTHS_SHORT[idx]} ${match[1]}`;
}
// The single monthly chalan for `month`, or null when the school has not
// created one for that month yet.
export const chalanForMonth = (fees: any[] = [], month: string) =>
  (fees || []).find((f: any) => f.month === month) || null;
// Unpaid balance of every chalan earlier than `month` (opening balance
// included, because "0000-00" sorts before any real month).
export const previousPendingForMonth = (fees: any[] = [], month: string) =>
  (fees || []).filter((f: any) => f.month < month).reduce((sum: number, f: any) => sum + Math.max(0, Number(f.amount || 0) - Number(f.paid || 0)), 0);
// Months that actually have a chalan, newest first (opening balance excluded).
export const availableChalanMonths = (fees: any[] = []) =>
  [...new Set((fees || []).map((f: any) => f.month).filter((m: any) => m && m !== "0000-00"))].sort().reverse();

// Every chalan of one child for the student portal, newest month first
// (including any "0000-00" opening balance), with charge breakdown, per-row
// balance/status and `previous` pending populated for voucher printing.
export function portalChalanRows(fees: any[] = []) {
  const list = [...(fees || [])].sort((a: any, b: any) => String(b?.month || "").localeCompare(String(a?.month || "")));
  return list.map((f: any) => {
    const amount = Number(f.amount) || 0;
    const paid = Number(f.paid) || 0;
    const balance = Math.max(0, amount - paid);
    const previous = f.previous !== undefined ? Number(f.previous) || 0 : previousPendingForMonth(list, f.month);
    return {
      ...f,
      monthLabel: formatMonthLabel(f.month),
      isOpening: f.month === "0000-00",
      actualFee: Number(f.actualFee ?? f.amount) || 0,
      discount: Number(f.discount) || 0,
      admissionFee: Number(f.admissionFee) || 0,
      annualCharges: Number(f.annualCharges) || 0,
      amount,
      paid,
      balance,
      previous,
      status: feeStatus(amount, paid),
    };
  });
}
