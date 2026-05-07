import { Metadata } from 'next';
import { TicketsTable } from '@/components/tickets/tickets-table';

export const metadata: Metadata = { title: 'Tickets' };

export default function TicketsPage() {
  return <TicketsTable />;
}
