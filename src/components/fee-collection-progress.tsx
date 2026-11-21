import { money } from "@/lib/api";
import { feeCollectionBand, type FeeReportSummary } from "@/lib/fee-report";

const bandStyles = {
  red: { badge: "bg-red-100 text-red-700", bar: "bg-red-500", message: "0–25% collection" },
  yellow: { badge: "bg-amber-100 text-amber-800", bar: "bg-amber-400", message: "Above 25% to 50%" },
  blue: { badge: "bg-blue-100 text-blue-700", bar: "bg-blue-600", message: "Above 50% to 75%" },
  green: { badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-600", message: "Above 75% to 100%" },
} as const;

export default function FeeCollectionProgress({ month, summary }: { month: string; summary: FeeReportSummary }) {
  const percentage = summary.collectionPercent;
  const style = bandStyles[feeCollectionBand(percentage)];
  const [year, monthNumber] = month.split("-").map(Number);
  const monthLabel = year && monthNumber
    ? new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "UTC" })
    : month;

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Fee collection</h3>
          <p className="mt-1 text-sm text-slate-500">
            {money(summary.received)} received of {money(summary.totalFee)} billed in {monthLabel}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${style.badge}`}>
          {percentage}% collected
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Fee collection percentage for ${monthLabel}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200"
      >
        <div className={`h-full rounded-full transition-all duration-300 ${style.bar}`} style={{ width: `${percentage}%` }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-400">
        <span>{style.message}</span>
        <span>0% <span className="px-1">·</span> 25% <span className="px-1">·</span> 50% <span className="px-1">·</span> 75% <span className="px-1">·</span> 100%</span>
      </div>
    </div>
  );
}
