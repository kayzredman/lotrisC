'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/api/hooks/useAuth';
import { useCreateProblem, useProblemsList } from '@/lib/api/hooks/useProblems';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Search } from 'lucide-react';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'overdue_capa', label: 'Overdue CAPA' },
  { key: 'awaiting_review', label: 'Awaiting Review' },
  { key: 'published', label: 'Published' },
] as const;

const RCA_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  CLOSED: 'Closed',
};

const RCA_STATUS_BADGE: Record<string, string> = {
  DRAFT: 'v2-badge-gray',
  IN_REVIEW: 'v2-badge-yellow',
  APPROVED: 'v2-badge-blue',
  PUBLISHED: 'v2-badge-green',
  CLOSED: 'v2-badge-indigo',
};

const LEAD_ROLES = ['SUPERADMIN', 'ADMIN', 'IT_MANAGER', 'TEAM_LEAD'];

export default function ProblemsTable() {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const router = useRouter();
  const { data: me } = useCurrentUser();
  const canCreate = LEAD_ROLES.includes(me?.roleName ?? '');

  const { data: problems, isLoading } = useProblemsList(filter || undefined, { staleTime: 25_000 });
  const createMutation = useCreateProblem();

  const rows = (problems ?? []) as Array<Record<string, unknown>>;
  const filtered = rows.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(p.title ?? '').toLowerCase().includes(q) ||
      String(p.problemRef ?? '').toLowerCase().includes(q) ||
      String(p.rcaRef ?? '').toLowerCase().includes(q)
    );
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createMutation.mutate(
      { title: newTitle.trim() },
      {
        onSuccess: (created) => {
          setShowCreate(false);
          setNewTitle('');
          const id = (created as { id?: string }).id;
          if (id) router.push(`/rca/${id}`);
        },
      },
    );
  }

  return (
    <div>
      <div className="v2-page-header">
        <div>
          <h1>Problems</h1>
          <p>Root cause investigations and linked incidents</p>
        </div>
        {canCreate && (
          <div className="v2-page-header-actions">
            <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setShowCreate(true)}>
              <Plus size={12} /> New Problem / RCA
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="v2-card" style={{ marginBottom: 20 }}>
          <div className="v2-card-header">
            <div className="v2-card-title">Create Problem Record</div>
            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
          <form className="v2-card-body" onSubmit={handleCreate}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Problem title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Brief description of the recurring or systemic issue"
              style={{ width: '100%', maxWidth: 480, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
            />
            <div style={{ marginTop: 12 }}>
              <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create & open RCA'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`v2-btn v2-btn-sm ${filter === f.key ? 'v2-btn-primary' : 'v2-btn-secondary'}`}
          >
            {f.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems…"
            style={{ padding: '6px 10px 6px 30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, width: 200 }}
          />
        </div>
      </div>

      <div className="v2-card">
        {isLoading ? (
          <div className="v2-card-body"><EmptyState title="Loading problems…" /></div>
        ) : filtered.length === 0 ? (
          <div className="v2-card-body"><EmptyState title="No problems found" message="P1 ticket closures auto-create RCA drafts. Leads can also create manually." /></div>
        ) : (
          <table className="v2-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Title</th>
                <th>RCA Status</th>
                <th>Tickets</th>
                <th>Owners</th>
                <th>Review due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const rcaId = p.rcaId as string | undefined;
                const status = String(p.rcaStatus ?? '—');
                return (
                  <tr key={String(p.id)}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--indigo)' }}>
                        {String(p.problemRef ?? '—')}
                      </span>
                      {rcaId && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{String(p.rcaRef ?? '')}</div>
                      )}
                    </td>
                    <td>
                      {rcaId ? (
                        <Link href={`/rca/${rcaId}`} style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {String(p.title)}
                        </Link>
                      ) : (
                        String(p.title)
                      )}
                    </td>
                    <td>
                      {status !== '—' ? (
                        <span className={`v2-badge ${RCA_STATUS_BADGE[status] ?? 'v2-badge-gray'}`}>
                          {RCA_STATUS_LABEL[status] ?? status}
                        </span>
                      ) : (
                        <span className="v2-badge v2-badge-gray">No RCA</span>
                      )}
                    </td>
                    <td>{Number(p.linkedTicketCount ?? 0)}</td>
                    <td style={{ fontSize: 12 }}>
                      <div>{String(p.processOwnerName ?? '—')}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{String(p.technicalOwnerName ?? '')}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {p.reviewDueAt
                        ? new Date(String(p.reviewDueAt)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
