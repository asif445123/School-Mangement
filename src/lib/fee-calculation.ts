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
