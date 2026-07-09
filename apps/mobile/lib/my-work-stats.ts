import type { TicketDto } from './types';

export interface MyWorkStats {
  open: number;
  inProgress: number;
  atRisk: number;
  dueToday: number;
  atRiskTickets: TicketDto[];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isAtRisk(ticket: TicketDto): boolean {
  if (ticket.slaPickupBreached || ticket.slaResolutionBreached) return true;
  if (!ticket.slaWarningLevel) return false;
  const level = ticket.slaWarningLevel.toLowerCase();
  return level !== 'none' && level !== 'ok';
}

function isDueToday(ticket: TicketDto, today: Date): boolean {
  for (const iso of [ticket.slaPickupDeadline, ticket.slaResolutionDeadline]) {
    if (!iso) continue;
    const deadline = new Date(iso);
    if (!Number.isNaN(deadline.getTime()) && isSameDay(deadline, today)) {
      return true;
    }
  }
  return false;
}

export function computeMyWorkStats(tickets: TicketDto[]): MyWorkStats {
  const today = new Date();
  let inProgress = 0;
  let atRisk = 0;
  let dueToday = 0;
  const atRiskTickets: TicketDto[] = [];

  for (const ticket of tickets) {
    if (ticket.status === 'IN_PROGRESS' || ticket.status === 'ESCALATED') {
      inProgress += 1;
    }
    if (isAtRisk(ticket)) {
      atRisk += 1;
      atRiskTickets.push(ticket);
    }
    if (isDueToday(ticket, today)) {
      dueToday += 1;
    }
  }

  return {
    open: tickets.length,
    inProgress,
    atRisk,
    dueToday,
    atRiskTickets,
  };
}
