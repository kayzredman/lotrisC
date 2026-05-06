'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button, Input } from '@lotris/ui';
import { createTeam } from '@/lib/admin-api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTeamModal({ onClose, onSuccess }: Props) {
  const { getToken } = useAuth();
  const [form, setForm] = useState({
    name: '',
    maxTicketsPerEngineer: 5,
    pickupSlaMinutes: 30,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await createTeam(token, form);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Create Team</h2>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Team Name</label>
            <Input
              required
              placeholder="e.g. Infrastructure Team"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Max Tickets per Engineer</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={form.maxTicketsPerEngineer}
              onChange={(e) =>
                setForm({ ...form, maxTicketsPerEngineer: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Pickup SLA (minutes)</label>
            <Input
              type="number"
              min={5}
              value={form.pickupSlaMinutes}
              onChange={(e) =>
                setForm({ ...form, pickupSlaMinutes: Number(e.target.value) })
              }
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Team'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
