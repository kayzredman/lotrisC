export const PAGER_CHANNEL_ID = 'lotris-pager-alerts';

export interface PagerAlert {
  id: string;
  eventType: string;
  title: string;
  body: string;
  ticketId?: string;
  ticketRef?: string;
  receivedAt: string;
  read: boolean;
}

export function alertFromNotification(data: Record<string, unknown>, title: string, body: string): PagerAlert {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    eventType: String(data.eventType ?? 'ALERT'),
    title,
    body,
    ticketId: data.ticketId ? String(data.ticketId) : undefined,
    ticketRef: data.ticketRef ? String(data.ticketRef) : undefined,
    receivedAt: new Date().toISOString(),
    read: false,
  };
}
