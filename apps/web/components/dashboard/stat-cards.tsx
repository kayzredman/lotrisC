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
    default: 'text-[#f57f20]',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-rose-400',
  }[color];

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : null;

  return (
    <div className="relative rounded-xl bg-[#141926] border border-slate-800/80 p-5 flex flex-col gap-1 overflow-hidden hover:border-slate-700 transition-colors">
      {/* Accent top bar — solid, thick */}
      <div
        className="absolute top-0 left-0 right-0 h-[5px]"
        style={{ background: accentColor ?? '#f57f20' }}
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
    slaCompliancePct >= 95 ? '#22c55e' : slaCompliancePct >= 85 ? '#eab308' : '#ef4444';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Open Tickets"
        value={openTickets}
        sub="currently unresolved"
        color="default"
        accentColor="#f57f20"
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
        color="default"
        accentColor="#376cc6"
      />
      <StatCard
        label="Team KPI Score"
        value={teamKpiScore != null ? `${teamKpiScore}` : '—'}
        sub="current period"
        color={
          teamKpiScore == null ? 'default' : teamKpiScore >= 80 ? 'green' : teamKpiScore >= 60 ? 'amber' : 'red'
        }
        accentColor="#8aac11"
      />
    </div>
  );
}
