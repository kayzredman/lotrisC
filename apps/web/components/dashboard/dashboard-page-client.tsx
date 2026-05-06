'use client';

import { trpc } from '../../lib/trpc/client';
import { StatCards } from './stat-cards';
import { TicketAnalytics } from './ticket-analytics';
import { EngineerPerfTable } from './engineer-perf-table';

export function DashboardPageClient() {
  const queryOpts = { refetchInterval: 30_000, staleTime: 25_000, placeholderData: (prev: unknown) => prev };
  const summaryQ = trpc['dashboard.summary'].useQuery(undefined, queryOpts);
  const analyticsQ = trpc['dashboard.ticketAnalytics'].useQuery(undefined, queryOpts);
  const engineerQ = trpc['dashboard.engineerPerf'].useQuery(undefined, queryOpts);
  const queueQ = trpc['dashboard.queueHealth'].useQuery(undefined, queryOpts);

  const summary = summaryQ.data as {
    openTickets: number;
    slaCompliancePct: number;
    avgResolutionHours: number;
  } | undefined;

  const analytics = analyticsQ.data as {
    ticketTrend: {
      date: string;
      totalCreated: number;
      totalResolved: number;
      slaBreachCount: number;
    }[];
    slaTrend: { date: string; compliancePct: string | null }[];
  } | undefined;

  const engineers = engineerQ.data as {
    engineerId: string;
    weekKey: string;
    ticketsResolved: number;
    tasksCompleted: number;
    slaBreaches: number;
    avgResolutionHours: string | null;
    kpiScore: string | null;
  }[] | undefined;

  const queue = queueQ.data as {
    openTickets: number;
    recentBreaches: number;
    resolvedLast3Days: number;
  } | undefined;

  const isLoadingSummary = summaryQ.isPending;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="border-l-4 border-brand pl-4">
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-400">Live performance overview · auto-refreshes every 30s</p>
        </div>
        {(summaryQ.isFetching || analyticsQ.isFetching) && (
          <span className="text-xs text-brand/70 animate-pulse font-medium tracking-wide uppercase">Refreshing…</span>
        )}
      </div>

      {/* Stat cards */}
      <StatCards
        openTickets={summary?.openTickets ?? 0}
        slaCompliancePct={summary?.slaCompliancePct ?? 0}
        avgResolutionHours={summary?.avgResolutionHours ?? 0}
        isLoading={isLoadingSummary}
      />

      {/* Queue health banner */}
      {queue && (
        <div className="rounded-xl bg-surface border border-slate-700/60 p-4 flex flex-wrap gap-6 text-sm border-l-4 border-l-brand">
          <span className="text-slate-400">
            Queue Health:
            <span className="ml-2 font-semibold text-brand">{queue.openTickets} open</span>
          </span>
          <span className="text-slate-400">
            SLA breaches (3d):
            <span className={`ml-2 font-semibold ${queue.recentBreaches > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {queue.recentBreaches}
            </span>
          </span>
          <span className="text-slate-400">
            Resolved (3d):
            <span className="ml-2 font-semibold text-accent-green">{queue.resolvedLast3Days}</span>
          </span>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TicketAnalytics
          ticketTrend={analytics?.ticketTrend}
          slaTrend={analytics?.slaTrend}
          isLoading={analyticsQ.isLoading}
        />

        {/* Placeholder for future donut chart */}
        <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-5 flex flex-col justify-center items-center text-center gap-2">
          <p className="text-slate-400 text-sm font-medium">Status Breakdown</p>
          {queue ? (
            <div className="space-y-1 text-sm">
              <p className="text-slate-300">Open: <span className="font-semibold text-violet-400">{queue.openTickets}</span></p>
              <p className="text-slate-300">Resolved (3d): <span className="font-semibold text-emerald-400">{queue.resolvedLast3Days}</span></p>
              <p className="text-slate-300">SLA Breaches (3d): <span className={`font-semibold ${queue.recentBreaches > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{queue.recentBreaches}</span></p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Loading…</p>
          )}
        </div>
      </div>

      {/* Engineer performance */}
      <EngineerPerfTable rows={engineers} isLoading={engineerQ.isLoading} />
    </div>
  );
}
