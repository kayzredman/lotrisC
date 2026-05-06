'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button, Input } from '@lotris/ui';
import { createUser } from '@/lib/admin-api';

const ROLES = [
  { id: 2, label: 'ADMIN' },
  { id: 3, label: 'IT_MANAGER' },
  { id: 4, label: 'TEAM_LEAD' },
  { id: 5, label: 'ENGINEER' },
  { id: 6, label: 'EXECUTIVE' },
];

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteUserModal({ onClose, onSuccess }: Props) {
  const { getToken } = useAuth();
  const [form, setForm] = useState({
    clerkUserId: '',
    email: '',
    fullName: '',
    roleId: 5,
    teamId: '',
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
      await createUser(token, {
        clerkUserId: form.clerkUserId,
        email: form.email,
        fullName: form.fullName,
        roleId: form.roleId,
        ...(form.teamId ? { teamId: form.teamId } : {}),
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to invite user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Invite User</h2>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Clerk User ID</label>
            <Input
              required
              placeholder="user_..."
              value={form.clerkUserId}
              onChange={(e) => setForm({ ...form, clerkUserId: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Full Name</label>
            <Input
              required
              placeholder="Jane Smith"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <Input
              required
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Role</label>
            <select
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Team ID <span className="text-slate-600">(optional)</span></label>
            <Input
              placeholder="Leave blank to assign later"
              value={form.teamId}
              onChange={(e) => setForm({ ...form, teamId: e.target.value })}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? 'Inviting…' : 'Invite'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
