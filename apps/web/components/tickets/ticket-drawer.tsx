'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { SlaBadge } from './sla-badge';
import { TicketStatusBar } from './ticket-status-bar';

interface TicketDrawerProps {
  ticketId: string;
  onClose: () => void;
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Critical',
  2: 'High',
  3: 'Medium',
  4: 'Low',
};

export function TicketDrawer({ ticketId, onClose }: TicketDrawerProps) {
  const [commentBody, setCommentBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const utils = trpc.useUtils();

  const ticketQuery = trpc['tickets.get'].useQuery({ id: ticketId });
  const commentsQuery = trpc['tickets.getComments'].useQuery({ ticketId });
  const historyQuery = trpc['tickets.getHistory'].useQuery({ ticketId });

  const addCommentMutation = trpc['tickets.addComment'].useMutation({
    onSuccess: () => {
      setCommentBody('');
      void utils['tickets.getComments'].invalidate({ ticketId });
    },
  });

  const ticket = ticketQuery.data;

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    addCommentMutation.mutate({ ticketId, body: commentBody.trim(), isInternal });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-[#0f172a] border-l border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-800 px-6 py-4">
          <div className="space-y-1 min-w-0 pr-4">
            {ticket ? (
              <>
                <p className="text-xs text-gray-500 font-mono">#{(ticket.id as string).slice(0, 8).toUpperCase()}</p>
                <h2 className="text-base font-semibold text-gray-100 leading-snug">{ticket.title as string}</h2>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-gray-500">
                    {PRIORITY_LABELS[ticket.priority as number] ?? 'Unknown'} priority
                  </span>
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-400">{ticket.status as string}</span>
                  <span className="text-gray-700">·</span>
                  <SlaBadge
                    deadline={ticket.slaResolutionDeadline as string | null}
                    breached={(ticket.slaResolutionBreached as number) === 1}
                    label="Res SLA"
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Loading…</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl leading-none shrink-0">×</button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {ticket && (
            <div className="space-y-6 px-6 py-5">
              {/* Description */}
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Description</h3>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{ticket.description as string}</p>
              </section>

              {/* Metadata */}
              <section className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Pickup SLA</p>
                  <SlaBadge
                    deadline={ticket.slaPickupDeadline as string | null}
                    breached={(ticket.slaPickupBreached as number) === 1}
                    label="Pickup"
                  />
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Created</p>
                  <p className="text-gray-300">{new Date(ticket.createdAt as string).toLocaleString()}</p>
                </div>
              </section>

              {/* Status action bar */}
              <TicketStatusBar
                ticketId={ticketId}
                currentStatus={ticket.status as string}
                onUpdated={() => void ticketQuery.refetch()}
              />

              {/* Comments */}
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
                  Comments ({commentsQuery.data?.length ?? 0})
                </h3>
                <div className="space-y-3">
                  {commentsQuery.data?.map((c) => (
                    <div
                      key={c.id as string}
                      className={`rounded-lg border p-3 text-sm ${
                        (c.isInternal as number) === 1
                          ? 'border-amber-800/50 bg-amber-900/10'
                          : 'border-gray-800 bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">
                          {new Date(c.createdAt as string).toLocaleString()}
                          {(c.isInternal as number) === 1 && (
                            <span className="ml-2 text-amber-500">internal</span>
                          )}
                        </span>
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap">{c.body as string}</p>
                    </div>
                  ))}
                </div>

                {/* Add comment */}
                <form onSubmit={handleAddComment} className="mt-4 space-y-2">
                  <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    rows={3}
                    placeholder="Add a comment…"
                    className="w-full rounded-md border border-gray-700 bg-surface px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-gray-600 bg-surface accent-amber-500"
                      />
                      Internal only
                    </label>
                    <button
                      type="submit"
                      disabled={!commentBody.trim() || addCommentMutation.isPending}
                      className="h-8 rounded-md bg-brand px-4 text-xs font-medium text-white hover:bg-brand/90 disabled:opacity-50"
                    >
                      {addCommentMutation.isPending ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                </form>
              </section>

              {/* History timeline */}
              <section className="pb-8">
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
                  Activity ({historyQuery.data?.length ?? 0})
                </h3>
                <ol className="relative border-l border-gray-800 space-y-4 ml-3">
                  {historyQuery.data?.map((h) => (
                    <li key={h.id as string | number} className="ml-4">
                      <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-gray-700 bg-surface" />
                      <p className="text-xs text-gray-500 mb-0.5">
                        {new Date(h.createdAt as string).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-300">
                        <span className="font-medium text-gray-400">{h.eventType as string}</span>
                        {h.fromValue && h.toValue && (
                          <span className="text-gray-500">
                            {' '}· {h.fromValue as string} → {h.toValue as string}
                          </span>
                        )}
                        {h.toValue && !h.fromValue && (
                          <span className="text-gray-500"> · {h.toValue as string}</span>
                        )}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
