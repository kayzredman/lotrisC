import { colors } from './theme';

const STATUS_COLORS: Record<string, string> = {
  NEW: colors.mutedLight,
  TEAM_ASSIGNED: colors.accentLight,
  UNASSIGNED: colors.warning,
  ASSIGNED: colors.accentLight,
  IN_PROGRESS: colors.inProgress,
  ESCALATED: colors.danger,
  RESOLVED: colors.success,
  CLOSED: colors.muted,
};

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? colors.muted;
}

export function ticketLabel(ticket: { id: string; title: string }): string {
  const short = ticket.id.slice(0, 8).toUpperCase();
  return ticket.title?.trim() ? ticket.title : `Ticket ${short}`;
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export const ACTIVE_STATUSES = new Set([
  'ASSIGNED',
  'IN_PROGRESS',
  'ESCALATED',
  'UNASSIGNED',
  'TEAM_ASSIGNED',
]);

export function nextActions(status: string): Array<{ label: string; status: string }> {
  switch (status) {
    case 'ASSIGNED':
      return [{ label: 'Start work', status: 'IN_PROGRESS' }];
    case 'IN_PROGRESS':
    case 'ESCALATED':
      return [{ label: 'Mark resolved', status: 'RESOLVED' }];
    default:
      return [];
  }
}
