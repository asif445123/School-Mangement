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

// --- One chalan per month (student portal) ---------------------------------
// A student has at most ONE monthly chalan per month (enforced by the unique
// {student, month} index). The portal shows a single month at a time, so
// these helpers pick that one voucher and its previous pending. `fees` here
// is ONE child's list (as /api/my returns it), so no student filter is needed.
// The opening balance (month "0000-00") is never a monthly chalan: it only
// counts towards previous pending.
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
