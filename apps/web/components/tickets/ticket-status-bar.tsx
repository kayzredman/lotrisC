'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/api/hooks/useAuth';
import { useUpdateTicketStatus } from '@/lib/api/hooks/useTickets';

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

// Roles that can escalate and close tickets
const ELEVATED_ROLES = new Set(['ADMIN', 'SUPERADMIN', 'IT_MANAGER', 'TEAM_LEAD']);

export function TicketStatusBar({ ticketId, currentStatus, onUpdated }: TicketStatusBarProps) {
  const { data: me } = useCurrentUser();
  const role = me?.roleName ?? 'ENGINEER';
  const queryClient = useQueryClient();

  const updateMutation = useUpdateTicketStatus();

  let actions = TRANSITIONS[currentStatus] ?? [];

  // ENGINEER: cannot escalate or close
  if (!ELEVATED_ROLES.has(role)) {
    actions = actions.filter((a) => a.to !== 'ESCALATED' && a.to !== 'CLOSED');
  }

  if (actions.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
      {actions.map((action) => {
        const isDanger = action.to === 'ESCALATED';
        const isSuccess = action.to === 'RESOLVED' || action.to === 'CLOSED';
        return (
          <button
            key={action.to}
            onClick={() =>
              updateMutation.mutate(
                { id: ticketId, status: action.to },
                {
                  onSuccess: () => {
                    void queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] });
                    void queryClient.invalidateQueries({ queryKey: ['tickets', 'list'] });
                    onUpdated();
                  },
                },
              )
            }
            disabled={updateMutation.isPending}
            className={`v2-btn v2-btn-sm${isDanger ? ' v2-btn-danger' : isSuccess ? ' v2-btn-success' : ' v2-btn-secondary'}`}
            style={
              isDanger ? { borderColor: 'var(--red)', color: 'var(--red)', background: 'none' } :
              isSuccess ? { borderColor: 'var(--green)', color: 'var(--green)', background: 'none' } :
              undefined
            }
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
