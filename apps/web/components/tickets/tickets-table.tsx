'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { SlaBadge } from './sla-badge';
import { CreateTicketModal } from './create-ticket-modal';
import { TicketDrawer } from './ticket-drawer';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'TEAM_ASSIGNED', label: 'Team Assigned' },
  { value: 'UNASSIGNED', label: 'Unassigned' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: '1', label: 'Critical' },
  { value: '2', label: 'High' },
  { value: '3', label: 'Medium' },
  { value: '4', label: 'Low' },
];

const PRIORITY_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: 'Critical', cls: 'bg-red-900/40 text-red-400 border-red-700' },
  2: { label: 'High', cls: 'bg-orange-900/40 text-orange-400 border-orange-700' },
  3: { label: 'Medium', cls: 'bg-yellow-900/40 text-yellow-400 border-yellow-700' },
  4: { label: 'Low', cls: 'bg-gray-800 text-gray-400 border-gray-600' },
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'bg-blue-900/40 text-blue-400 border-blue-700',
  TEAM_ASSIGNED: 'bg-purple-900/40 text-purple-400 border-purple-700',
  UNASSIGNED: 'bg-gray-800 text-gray-400 border-gray-600',
  ASSIGNED: 'bg-indigo-900/40 text-indigo-400 border-indigo-700',
  IN_PROGRESS: 'bg-teal-900/40 text-teal-400 border-teal-700',
  ESCALATED: 'bg-red-900/40 text-red-400 border-red-700',
  RESOLVED: 'bg-green-900/40 text-green-400 border-green-700',
  CLOSED: 'bg-gray-800 text-gray-500 border-gray-700',
};

export function TicketsTable() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const { data, isLoading, isError } = trpc['tickets.list'].useQuery({
    page,
    limit: 25,
    status: status || undefined,
    priority: priority ? Number(priority) : undefined,
  });

  const utils = trpc.useUtils();

  function handleCreated() {
    void utils['tickets.list'].invalidate();
    setCreateOpen(false);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="h-9 rounded-md border border-gray-700 bg-surface px-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            className="h-9 rounded-md border border-gray-700 bg-surface px-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90 transition-colors"
        >
          + New Ticket
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm text-gray-300">
          <thead className="bg-surface border-b border-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Title</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Priority</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Resolution SLA</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading…</td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-red-400">Failed to load tickets.</td>
              </tr>
            )}
            {!isLoading && !isError && data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No tickets found.</td>
              </tr>
            )}
            {data?.map((ticket) => {
              const prioMeta = PRIORITY_LABELS[ticket.priority as number] ?? PRIORITY_LABELS[3];
              const statusCls = STATUS_LABELS[ticket.status as string] ?? 'bg-gray-800 text-gray-400 border-gray-600';
              return (
                <tr
                  key={ticket.id}
                  className="hover:bg-surface/60 cursor-pointer transition-colors"
                  onClick={() => setSelectedTicketId(ticket.id as string)}
                >
                  <td className="px-4 py-3 max-w-xs truncate font-medium text-gray-200">
                    {ticket.title as string}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${statusCls}`}>
                      {ticket.status as string}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${prioMeta.cls}`}>
                      {prioMeta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <SlaBadge
                      deadline={ticket.slaResolutionDeadline as string | null}
                      breached={(ticket.slaResolutionBreached as number) === 1}
                      label="Res"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(ticket.createdAt as string).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-8 rounded border border-gray-700 px-3 text-sm text-gray-400 hover:border-gray-500 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page}</span>
          <button
            disabled={data.length < 25}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 rounded border border-gray-700 px-3 text-sm text-gray-400 hover:border-gray-500 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {/* Modals / Drawers */}
      <CreateTicketModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      {selectedTicketId && (
        <TicketDrawer
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
}
