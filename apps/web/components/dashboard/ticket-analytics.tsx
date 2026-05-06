'use client';

interface TicketDayRow {
  date: string;
  totalCreated: number;
  totalResolved: number;
  slaBreachCount: number;
}

interface SlaRow {
  date: string;
  compliancePct: string | null;
}

interface TicketAnalyticsProps {
  ticketTrend?: TicketDayRow[];
  slaTrend?: SlaRow[];
  isLoading?: boolean;
}

function BarChart({ data, maxVal }: { data: { label: string; created: number; resolved: number }[]; maxVal: number }) {
  if (data.length === 0) return <p className="text-sm text-slate-500 py-4">No data for this period.</p>;

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => {
        const createdH = maxVal > 0 ? Math.round((d.created / maxVal) * 100) : 0;
        const resolvedH = maxVal > 0 ? Math.round((d.resolved / maxVal) * 100) : 0;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.label}: created ${d.created}, resolved ${d.resolved}`}>
            <div className="w-full flex items-end gap-0.5 h-28">
              <div
                className="flex-1 rounded-t bg-violet-500/70"
                style={{ height: `${createdH}%` }}
              />
              <div
                className="flex-1 rounded-t bg-emerald-500/70"
                style={{ height: `${resolvedH}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-500 truncate w-full text-center">
              {d.label.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SlaBar({ pct }: { pct: number }) {
  const color = pct >= 95 ? 'bg-emerald-500' : pct >= 85 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="w-full bg-slate-700 rounded h-2">
      <div className={`${color} h-2 rounded transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function TicketAnalytics({ ticketTrend, slaTrend, isLoading }: TicketAnalyticsProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-5 animate-pulse h-48" />
    );
  }

  const trend = ticketTrend ?? [];
  const maxVal = trend.reduce((m, r) => Math.max(m, r.totalCreated, r.totalResolved), 0);
  const barData = trend.map((r) => ({ label: r.date, created: r.totalCreated, resolved: r.totalResolved }));

  const avgSla =
    (slaTrend ?? []).length > 0
      ? (slaTrend ?? []).reduce((s, r) => s + parseFloat(r.compliancePct ?? '100'), 0) / (slaTrend ?? []).length
      : 100;

  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-200">Ticket Volume — Last 7 Days</h2>

      <BarChart data={barData} maxVal={maxVal} />

      <div className="flex gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-violet-500/70" /> Created</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-emerald-500/70" /> Resolved</span>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>SLA Compliance (7-day avg)</span>
          <span className={avgSla >= 95 ? 'text-emerald-400' : avgSla >= 85 ? 'text-amber-400' : 'text-rose-400'}>
            {avgSla.toFixed(1)}%
          </span>
        </div>
        <SlaBar pct={avgSla} />
      </div>
    </div>
  );
}
