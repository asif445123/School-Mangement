export type FeeReportRow = {
  [key: string]: any;
  prev: number;
  pend: number;
  balance: number;
};

export type FeeReportSummary = {
  rows: FeeReportRow[];
  totalFee: number;
  previousPending: number;
  received: number;
  thisMonthPending: number;
  totalBalance: number;
  collectionPercent: number;
};

const amountOf = (value: any) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
};

// Fee collection is the amount received against the chalans billed for the
// selected month, divided by the total amount billed for those chalans.
export function feeReportSummary(fees: any[] = []): FeeReportSummary {
  const rows = (fees || []).map((fee) => {
    const amount = amountOf(fee.amount);
    const paid = amountOf(fee.paid);
    const prev = amountOf(fee.previous);
    const pend = Math.max(0, amount - paid);
    return { ...fee, prev, pend, balance: prev + pend };
  });

  const total = (key: "amount" | "prev" | "paid" | "pend" | "balance") =>
    rows.reduce((sum, fee) => sum + amountOf(fee[key]), 0);
  const totalFee = total("amount");
  const received = total("paid");
  const collectionPercent = totalFee > 0 ? Math.min(100, Math.round((received / totalFee) * 1000) / 10) : 0;

  return {
    rows,
    totalFee,
    previousPending: total("prev"),
    received,
    thisMonthPending: total("pend"),
    totalBalance: total("balance"),
    collectionPercent,
  };
}

export type FeeCollectionBand = "red" | "yellow" | "blue" | "green";

// Progress colour bands: 0–25% red, >25–50% yellow, >50–75% blue,
// and >75–100% green.
export function feeCollectionBand(percentage: number): FeeCollectionBand {
  const value = Math.min(100, Math.max(0, Number(percentage) || 0));
  if (value <= 25) return "red";
  if (value <= 50) return "yellow";
  if (value <= 75) return "blue";
  return "green";
}
