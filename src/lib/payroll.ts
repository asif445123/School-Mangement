export const roundMoney = (n: number) => Math.round(n * 100) / 100;
export const validAmount = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1e10 && roundMoney(n) === n;
export type Salary = { month: string; basic: number; allowances: number; bonus: number; overtime: number;
  attendance: number; other: number; paidOn?: Date | string; recovered?: number };
type Advance = { _id: unknown; date: string; installment: number; amount: number; recovered: number };

export function salaryTotals(row: Salary, advances: Advance[]) {
  const available = roundMoney(row.basic + row.allowances + row.bonus + row.overtime - row.attendance - row.other);
  let remaining = Math.max(0, available);
  const payments = new Map<string, number>();
  if (!row.paidOn) {
    for (const a of [...advances].sort((a, b) => a.date.localeCompare(b.date))) {
      if (a.date.slice(0, 7) > row.month) continue;
      const amount = roundMoney(Math.min(remaining, a.installment, a.amount - a.recovered));
      if (amount <= 0) continue;
      payments.set(String(a._id), amount);
      remaining = roundMoney(remaining - amount);
    }
  }
  const advance = row.paidOn ? row.recovered || 0 : roundMoney(Math.max(0, available) - remaining);
  return { advance, net: roundMoney(available - advance), payments };
}
