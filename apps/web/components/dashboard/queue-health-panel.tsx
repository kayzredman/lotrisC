'use client';

import { trpc } from '@/lib/trpc/client';
import { Badge } from '@lotris/ui';

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-500',
  TEAM_ASSIGNED: 'bg-cyan-500',
  UNASSIGNED: 'bg-orange-400',
  ASSIGNED: 'bg-yellow-500',
  IN_PROGRESS: 'bg-violet-500',
  ESCALATED: 'bg-red-500',
  RESOLVED: 'bg-green-500',
  CLOSED: 'bg-gray-400',
};

function StatusBar({
  label,
  count,
  total,
  colorClass,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function QueueHealthPanel() {
  const { data, isLoading, isError } = trpc['queue.health'].useQuery(undefined, {
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Queue Health</h3>
        <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Queue Health</h3>
        <div className="h-32 flex items-center justify-center text-xs text-destructive">
          Failed to load queue health.
        </div>
      </div>
    );
  }

  const { statusCounts, pickupSlaBreaches, resolutionSlaBreaches, engineerWorkloads } = data as {
    statusCounts: Record<string, number>;
    pickupSlaBreaches: number;
    resolutionSlaBreaches: number;
    engineerWorkloads: Array<{ assigneeId: string; assigneeName: string | null; openCount: number }>;
  };

  const totalTickets = Object.values(statusCounts).reduce((s, n) => s + n, 0);
  const openStatuses = ['NEW', 'TEAM_ASSIGNED', 'UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED'];
  const openCount = openStatuses.reduce((s, k) => s + (statusCounts[k] ?? 0), 0);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Queue Health</h3>
        <span className="text-xs text-muted-foreground">{openCount} open</span>
      </div>

      {/* SLA Breach Alerts */}
      {(pickupSlaBreaches > 0 || resolutionSlaBreaches > 0) && (
        <div className="flex flex-wrap gap-2">
          {pickupSlaBreaches > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
              {pickupSlaBreaches} pickup SLA {pickupSlaBreaches === 1 ? 'breach' : 'breaches'}
            </Badge>
          )}
          {resolutionSlaBreaches > 0 && (
            <Badge variant="destructive">
              {resolutionSlaBreaches} resolution SLA {resolutionSlaBreaches === 1 ? 'breach' : 'breaches'}
            </Badge>
          )}
        </div>
      )}

      {/* Status Distribution */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status Distribution</p>
        <div className="space-y-2.5">
          {openStatuses.map((status) => (
            <StatusBar
              key={status}
              label={status.replace(/_/g, ' ')}
              count={statusCounts[status] ?? 0}
              total={totalTickets}
              colorClass={STATUS_COLORS[status] ?? 'bg-gray-400'}
            />
          ))}
        </div>
      </div>

      {/* Engineer Workloads */}
      {engineerWorkloads?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Top Engineer Loads
          </p>
          <div className="space-y-1.5">
            {engineerWorkloads.slice(0, 5).map((eng) => (
              <div key={eng.assigneeId} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate max-w-[140px]">
                  {eng.assigneeName ?? eng.assigneeId.slice(0, 8) + '…'}
                </span>
                <Badge
                  variant={eng.openCount >= 8 ? 'destructive' : eng.openCount >= 5 ? 'secondary' : 'outline'}
                >
                  {eng.openCount}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
