'use client';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'green' | 'amber' | 'red';
  accentColor?: string; // CSS color for the top accent bar
}

function StatCard({ label, value, sub, trend, color = 'default', accentColor }: StatCardProps) {
  const colorClass = {
    default: 'text-slate-100',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-rose-400',
  }[color];

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : null;

  return (
    <div className="relative rounded-xl bg-[#141926] border border-slate-800/80 p-5 flex flex-col gap-1 overflow-hidden hover:border-slate-700 transition-colors">
      {/* Accent top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: accentColor ?? 'linear-gradient(90deg, #f57f20 0%, rgba(245,127,32,0.2) 100%)' }}
      />
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium pt-1">{label}</p>
      <p className={`text-3xl font-bold animate-count-up ${colorClass}`}>
        {trendIcon && (
          <span className={`mr-1 text-lg ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trendIcon}
          </span>
        )}
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-600">{sub}</p>}
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
          <div key={i} className="rounded-xl bg-[#141926] border border-slate-800 p-5 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const slaColor: StatCardProps['color'] =
    slaCompliancePct >= 95 ? 'green' : slaCompliancePct >= 85 ? 'amber' : 'red';
  const slaAccent =
    slaCompliancePct >= 95
      ? 'linear-gradient(90deg,#22c55e,rgba(34,197,94,0.2))'
      : slaCompliancePct >= 85
      ? 'linear-gradient(90deg,#eab308,rgba(234,179,8,0.2))'
      : 'linear-gradient(90deg,#ef4444,rgba(239,68,68,0.2))';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Open Tickets"
        value={openTickets}
        sub="currently unresolved"
        color={openTickets > 50 ? 'amber' : 'default'}
        accentColor={openTickets > 50 ? 'linear-gradient(90deg,#f97316,rgba(249,115,22,0.2))' : undefined}
      />
      <StatCard
        label="SLA Compliance"
        value={`${slaCompliancePct}%`}
        sub="last 30 days"
        color={slaColor}
        accentColor={slaAccent}
      />
      <StatCard
        label="Avg Resolution"
        value={`${avgResolutionHours}h`}
        sub="last 30 days"
        color={avgResolutionHours > 48 ? 'amber' : 'default'}
        accentColor="linear-gradient(90deg,#376cc6,rgba(55,108,198,0.2))"
      />
      <StatCard
        label="Team KPI Score"
        value={teamKpiScore != null ? `${teamKpiScore}` : '—'}
        sub="current period"
        color={
          teamKpiScore == null ? 'default' : teamKpiScore >= 80 ? 'green' : teamKpiScore >= 60 ? 'amber' : 'red'
        }
        accentColor="linear-gradient(90deg,#8aac11,rgba(138,172,17,0.2))"
      />
    </div>
  );
}
