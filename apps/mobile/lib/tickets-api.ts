import { apiFetch } from './lotris-api';
import type { PagedTickets, QueueTicket, TicketComment, TicketDto } from './types';

export function fetchMyTickets(token: string, limit = 50) {
  return apiFetch<PagedTickets>(`/api/v1/tickets?limit=${limit}`, { token });
}

export function fetchTicket(token: string, id: string) {
  return apiFetch<TicketDto>(`/api/v1/tickets/${id}`, { token });
}

export function fetchQueue(token: string) {
  return apiFetch<QueueTicket[]>('/api/v1/queue?limit=50', { token });
}

export function claimTicket(token: string, ticketId: string) {
  return apiFetch<TicketDto>(`/api/v1/queue/claim/${ticketId}`, {
    method: 'POST',
    token,
  });
}

export function updateTicketStatus(token: string, ticketId: string, status: string) {
  return apiFetch<TicketDto>(`/api/v1/tickets/${ticketId}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}

export function addTicketComment(token: string, ticketId: string, body: string) {
  return apiFetch<{ id: string }>(`/api/v1/tickets/${ticketId}/comments`, {
    method: 'POST',
    token,
    body: { body, isInternal: false },
  });
}

export function fetchTicketComments(token: string, ticketId: string) {
  return apiFetch<TicketComment[]>(`/api/v1/tickets/${ticketId}/comments`, { token });
}
