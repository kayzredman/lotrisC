'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Critical' },
  { value: 2, label: 'High' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'Low' },
];

export function CreateTicketModal({ open, onClose, onCreated }: CreateTicketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(2);
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState('');

  const { data: teams } = trpc['teams.list'].useQuery();

  const createMutation = trpc['tickets.create'].useMutation({
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setPriority(2);
      setTeamId('');
      setError('');
      onCreated();
    },
    onError: (err) => {
      setError(err.message ?? 'Failed to create ticket');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      priority,
      teamId: teamId || undefined,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-[#0f172a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-100">New Ticket</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <p className="rounded-md bg-red-900/30 border border-red-700 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={500}
              className="w-full rounded-md border border-gray-700 bg-surface px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Brief description of the issue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={4000}
              className="w-full rounded-md border border-gray-700 bg-surface px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand resize-none"
              placeholder="Full details of the issue…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full h-9 rounded-md border border-gray-700 bg-surface px-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Team (optional)</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-700 bg-surface px-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">Unassigned</option>
                {teams?.map((t) => (
                  <option key={t.id as string} value={t.id as string}>
                    {t.name as string}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-gray-700 px-4 text-sm text-gray-400 hover:border-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="h-9 rounded-md bg-brand px-5 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-60"
            >
              {createMutation.isPending ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
