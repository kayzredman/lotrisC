'use client';

import { trpc } from '@/lib/trpc';
import { useUser } from '@clerk/nextjs';

interface TicketStatusBarProps {
  ticketId: string;
  currentStatus: string;
  onUpdated: () => void;
}

// Valid client-side transitions per status
const TRANSITIONS: Record<string, { label: string; to: string }[]> = {
  NEW: [],
  TEAM_ASSIGNED: [{ label: 'Mark Unassigned', to: 'UNASSIGNED' }],
  UNASSIGNED: [{ label: 'Claim', to: 'ASSIGNED' }],
  ASSIGNED: [{ label: 'Start Work', to: 'IN_PROGRESS' }],
  IN_PROGRESS: [
    { label: 'Resolve', to: 'RESOLVED' },
    { label: 'Escalate', to: 'ESCALATED' },
  ],
  ESCALATED: [
    { label: 'Resume', to: 'IN_PROGRESS' },
    { label: 'Resolve', to: 'RESOLVED' },
  ],
  RESOLVED: [{ label: 'Close', to: 'CLOSED' }],
  CLOSED: [],
};

// Roles that can escalate and close
const ELEVATED_ROLES = new Set(['ADMIN', 'SUPERADMIN', 'IT_MANAGER', 'TEAM_LEAD']);

export function TicketStatusBar({ ticketId, currentStatus, onUpdated }: TicketStatusBarProps) {
  const { user } = useUser();
  const role = (user?.publicMetadata?.role as string) ?? 'ENGINEER';
  const utils = trpc.useUtils();

  const updateMutation = trpc['tickets.updateStatus'].useMutation({
    onSuccess: () => {
      void utils['tickets.get'].invalidate({ id: ticketId });
      void utils['tickets.list'].invalidate();
      onUpdated();
    },
  });

  let actions = TRANSITIONS[currentStatus] ?? [];

  // ENGINEER: remove Escalate and Close actions
  if (role === 'ENGINEER') {
    actions = actions.filter((a) => a.to !== 'ESCALATED' && a.to !== 'CLOSED');
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 border-t border-gray-800 pt-4">
      {actions.map((action) => {
        const isDanger = action.to === 'ESCALATED';
        const isSuccess = action.to === 'RESOLVED' || action.to === 'CLOSED';
        const colorClass = isDanger
          ? 'border-red-700 text-red-400 hover:bg-red-900/30'
          : isSuccess
            ? 'border-green-700 text-green-400 hover:bg-green-900/30'
            : 'border-brand text-brand hover:bg-brand/10';

        return (
          <button
            key={action.to}
            onClick={() =>
              updateMutation.mutate({ id: ticketId, status: action.to as 'TEAM_ASSIGNED' | 'UNASSIGNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED' | 'CLOSED' })
            }
            disabled={updateMutation.isPending}
            className={`h-8 rounded border px-3 text-xs font-medium transition-colors disabled:opacity-50 ${colorClass}`}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
