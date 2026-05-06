'use client';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'green' | 'amber' | 'red';
}

function StatCard({ label, value, sub, trend, color = 'default' }: StatCardProps) {
  const colorClass = {
    default: 'text-slate-100',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-rose-400',
  }[color];

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : null;

  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-5 flex flex-col gap-1">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${colorClass}`}>
        {trendIcon && (
          <span className={`mr-1 text-lg ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trendIcon}
          </span>
        )}
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

interface StatCardsProps {
  openTickets: number;
  slaCompliancePct: number;
  avgResolutionHours: number;
  teamKpiScore?: number;
  isLoading?: boolean;
}

export function StatCards({ openTickets, slaCompliancePct, avgResolutionHours, teamKpiScore, isLoading }: StatCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl bg-slate-800/60 border border-slate-700 p-5 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const slaColor: StatCardProps['color'] =
    slaCompliancePct >= 95 ? 'green' : slaCompliancePct >= 85 ? 'amber' : 'red';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Open Tickets"
        value={openTickets}
        sub="currently unresolved"
        color={openTickets > 50 ? 'amber' : 'default'}
      />
      <StatCard
        label="SLA Compliance"
        value={`${slaCompliancePct}%`}
        sub="last 30 days"
        color={slaColor}
      />
      <StatCard
        label="Avg Resolution"
        value={`${avgResolutionHours}h`}
        sub="last 30 days"
        color={avgResolutionHours > 48 ? 'amber' : 'default'}
      />
      <StatCard
        label="Team KPI Score"
        value={teamKpiScore != null ? `${teamKpiScore}` : '—'}
        sub="current period"
        color={
          teamKpiScore == null ? 'default' : teamKpiScore >= 80 ? 'green' : teamKpiScore >= 60 ? 'amber' : 'red'
        }
      />
    </div>
  );
}
