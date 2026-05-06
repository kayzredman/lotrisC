import { Metadata } from 'next';
import { TicketsTable } from '@/components/tickets/tickets-table';

export const metadata: Metadata = { title: 'Tickets' };

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-100">Tickets</h1>
        <p className="mt-1 text-sm text-gray-500">
          Queue-ordered by priority and SLA deadline.
        </p>
      </div>
      <TicketsTable />
    </div>
  );
}
