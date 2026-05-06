import { BadRequestException } from '@nestjs/common';

/**
 * Ticket lifecycle state machine.
 *
 * Valid statuses and allowed transitions:
 *
 * NEW → TEAM_ASSIGNED
 * TEAM_ASSIGNED → UNASSIGNED
 * UNASSIGNED → ASSIGNED
 * ASSIGNED → IN_PROGRESS
 * IN_PROGRESS → ESCALATED | RESOLVED
 * ESCALATED → IN_PROGRESS | RESOLVED
 * RESOLVED → CLOSED
 * CLOSED → (terminal — no further transitions)
 */

export const TICKET_STATUS = {
  NEW: 'NEW',
  TEAM_ASSIGNED: 'TEAM_ASSIGNED',
  UNASSIGNED: 'UNASSIGNED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  ESCALATED: 'ESCALATED',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const TICKET_PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
} as const;

export type TicketPriority = (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['TEAM_ASSIGNED'],
  TEAM_ASSIGNED: ['UNASSIGNED'],
  UNASSIGNED: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['ESCALATED', 'RESOLVED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

/**
 * Returns true if the transition is allowed.
 */
export function isTransitionAllowed(from: TicketStatus, to: TicketStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Validates a transition and throws a BadRequestException if invalid.
 */
export function assertTransition(from: TicketStatus, to: TicketStatus): void {
  if (!isTransitionAllowed(from, to)) {
    throw new BadRequestException(
      `Invalid status transition: ${from} → ${to}. ` +
        `Allowed from ${from}: [${(TRANSITIONS[from] ?? []).join(', ') || 'none'}]`,
    );
  }
}

/**
 * Event types written to Ticket_History on each lifecycle action.
 */
export const HISTORY_EVENT = {
  CREATED: 'CREATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  ASSIGNED: 'ASSIGNED',
  REASSIGNED: 'REASSIGNED',
  TEAM_ASSIGNED: 'TEAM_ASSIGNED',
  ESCALATED: 'ESCALATED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  ATTACHMENT_ADDED: 'ATTACHMENT_ADDED',
  FIELD_EDITED: 'FIELD_EDITED',
  SLA_PICKUP_BREACHED: 'SLA_PICKUP_BREACHED',
  SLA_RESOLUTION_BREACHED: 'SLA_RESOLUTION_BREACHED',
} as const;

export type HistoryEvent = (typeof HISTORY_EVENT)[keyof typeof HISTORY_EVENT];
