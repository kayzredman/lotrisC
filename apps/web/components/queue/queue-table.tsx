'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { SlaBadge } from '@/components/tickets/sla-badge';
import { Badge } from '@lotris/ui';
import { Button } from '@lotris/ui';

const PRIORITY_LABELS: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: 'Critical', variant: 'destructive' },
  2: { label: 'High', variant: 'destructive' },
  3: { label: 'Medium', variant: 'secondary' },
  4: { label: 'Low', variant: 'outline' },
};

const PAGE_SIZE = 25;

export default function QueueTable() {
  const [page, setPage] = useState(1);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, isError } = trpc['queue.list'].useQuery(
    { page, limit: PAGE_SIZE },
    { refetchInterval: 30_000 },
  );

  const healthData = trpc['queue.health'].useQuery(
    undefined,
    { refetchInterval: 60_000 },
  );

  const claimMutation = trpc['queue.claim'].useMutation({
    onMutate: (vars) => setClaimingId(vars.ticketId),
    onSettled: () => {
      setClaimingId(null);
      void utils['queue.list'].invalidate();
      void utils['queue.health'].invalidate();
    },
  });

  const myOpenCount = healthData.data?.engineerWorkloads?.find(
    (w: { assigneeId: string; openCount: number }) => w.assigneeId === healthData.data?.currentUserId,
  )?.openCount ?? 0;

  const maxCapacity = healthData.data?.maxCapacity ?? 10;

  return (
    <div className="space-y-4">
      {/* Workload indicator */}
      {healthData.data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Your open tickets:</span>
          <Badge
            variant={myOpenCount >= maxCapacity ? 'destructive' : myOpenCount > maxCapacity * 0.7 ? 'secondary' : 'outline'}
          >
            {myOpenCount} / {maxCapacity}
          </Badge>
          {myOpenCount >= maxCapacity && (
            <span className="text-destructive font-medium">At capacity — claim blocked</span>
          )}
        </div>
      )}

      {/* Queue table */}
      <div className="rounded-md border">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Loading queue…
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-40 text-destructive text-sm">
            Failed to load queue.
          </div>
        ) : !data?.items?.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-1">
            <span className="text-2xl">✓</span>
            <span>Queue is empty — all tickets assigned.</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ticket</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Priority</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-40">Pickup SLA</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-36">Created</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Team</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((ticket: {
                id: string;
                title: string;
                priority: number;
                status: string;
                slaPickupDeadline: string | null;
                slaPickupBreached: boolean;
                createdAt: string;
                teamName: string | null;
              }) => {
                const priority = PRIORITY_LABELS[ticket.priority] ?? PRIORITY_LABELS[3];
                const isClaiming = claimingId === ticket.id;
                const atCapacity = myOpenCount >= maxCapacity;

                return (
                  <tr key={ticket.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium">{ticket.title}</span>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {ticket.id.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={priority.variant}>{priority.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <SlaBadge
                        deadline={ticket.slaPickupDeadline}
                        breached={ticket.slaPickupBreached}
                        label="Pickup"
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ticket.teamName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        disabled={isClaiming || atCapacity}
                        onClick={() => claimMutation.mutate({ ticketId: ticket.id })}
                      >
                        {isClaiming ? 'Claiming…' : 'Claim'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * PAGE_SIZE >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
