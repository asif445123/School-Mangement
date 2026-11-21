"use client";

// Small, dependency-free charts (inline SVG) used by the dashboard.
export const CHART_COLORS = ["#16a34a", "#dc2626", "#f59e0b", "#2563eb", "#9333ea", "#0891b2", "#ec4899", "#84cc16"];

const arc = (cx: number, cy: number, r: number, a0: number, a1: number, inner = 0) => {
  const p = (a: number, radius: number) => `${cx + radius * Math.cos(a)} ${cy + radius * Math.sin(a)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const outer = `M ${p(a0, r)} A ${r} ${r} 0 ${large} 1 ${p(a1, r)}`;
  if (!inner) return `${outer} L ${cx} ${cy} Z`;
  return `${outer} L ${p(a1, inner)} A ${inner} ${inner} 0 ${large} 0 ${p(a0, inner)} Z`;
};

export type Slice = { label: string; value: number; color: string };

// Donut chart with a centre total; slices are drawn clockwise from 12 o'clock.
export function DonutChart({ slices, centerLabel, centerValue, size = 208 }: { slices: Slice[]; centerLabel?: string; centerValue?: string | number; size?: number }) {
  const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0);
  const cx = 110, cy = 110, r = 100, inner = 58;
  let angle = -Math.PI / 2;
  return (
    <svg viewBox="0 0 220 220" style={{ width: size, height: size }} className="shrink-0" role="img" aria-label={centerLabel || "chart"}>
      {total > 0 ? (
        slices.filter((s) => s.value > 0).map((s) => {
          const a0 = angle, a1 = angle + (s.value / total) * Math.PI * 2;
          angle = a1;
          if (s.value / total >= 0.9999) return <circle key={s.label} cx={cx} cy={cy} r={(r + inner) / 2} fill="none" stroke={s.color} strokeWidth={r - inner} />;
          return <path key={s.label} d={arc(cx, cy, r, a0, a1, inner)} fill={s.color} stroke="#fff" strokeWidth="1.5" />;
        })
      ) : (
        <circle cx={cx} cy={cy} r={(r + inner) / 2} fill="none" stroke="#e2e8f0" strokeWidth={r - inner} />
      )}
      <text x={cx} y={cy - 2} textAnchor="middle" fill="#0f172a" style={{ fontSize: 22, fontWeight: 700 }}>{centerValue ?? total}</text>
      {centerLabel && <text x={cx} y={cy + 18} textAnchor="middle" fill="#64748b" style={{ fontSize: 11 }}>{centerLabel}</text>}
    </svg>
  );
}

export function Legend({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0);
  return (
    <ul className="space-y-1.5 text-[13px]">
      {slices.map((s) => (
        <li key={s.label} className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} />
          <span className="text-slate-700">{s.label}</span>
          <span className="font-semibold text-slate-900">{s.value}</span>
          <span className="text-xs text-slate-400">{total ? Math.round((Math.max(0, s.value) / total) * 100) : 0}%</span>
        </li>
      ))}
    </ul>
  );
}

const niceStep = (max: number) => {
  if (max <= 5) return 1;
  const raw = max / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
};

// Vertical bars: one per label, the count written under the class name so the
// bar itself can use the full height (works the same for 1 student or 300).
export function BarChart({ bars, height = 220, color = "#2563eb" }: { bars: { label: string; value: number }[]; height?: number; color?: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex min-w-[320px] gap-2">
        <div className="flex w-8 shrink-0 flex-col items-end justify-between text-[10px] leading-none text-slate-400" style={{ height }} aria-hidden="true">
          {[...ticks].reverse().map((t) => <span key={t}>{t}</span>)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative border-b border-l border-slate-200" style={{ height }}>
            {ticks.slice(1).map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-dashed border-slate-100" style={{ bottom: `${(t / top) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end gap-2 px-2">
              {bars.map((b) => (
                <div key={b.label} className="flex h-full min-w-0 flex-1 items-end justify-center" title={`${b.label}: ${b.value}`}>
                  <div className="w-full max-w-[46px] rounded-t" style={{ height: `${(b.value / top) * 100}%`, minHeight: b.value > 0 ? 3 : 0, background: color }} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1 flex gap-2 px-2">
            {bars.map((b) => (
              <div key={b.label} className="min-w-0 flex-1 text-center" title={b.label}>
                <div className="truncate text-[10px] leading-tight text-slate-500">{b.label}</div>
                <div className="text-[11px] font-bold leading-tight text-slate-700">{b.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
