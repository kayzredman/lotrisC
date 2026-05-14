'use client';

import { useState } from 'react';
import { Users, AlertCircle, CheckCircle, ArrowRightLeft, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { WorkloadSuggestion } from '@lotris/types';

interface WorkloadPanelProps {
  teamId: string;
  teamName?: string;
}

function loadColor(pct: number): string {
  if (pct >= 100) return '#dc2626'; // red
  if (pct >= 70) return '#d97706';  // amber
  return '#16a34a';                  // green
}

function loadBg(pct: number): string {
  if (pct >= 100) return 'rgba(220,38,38,0.12)';
  if (pct >= 70) return 'rgba(217,119,6,0.12)';
  return 'rgba(22,163,74,0.12)';
}

export function WorkloadPanel({ teamId, teamName }: WorkloadPanelProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [applyStatus, setApplyStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc['analytics.teamWorkload'].useQuery(
    { teamId },
    { staleTime: 60_000, refetchInterval: 120_000 },
  );

  const batchReassignMutation = trpc['tickets.batchReassign'].useMutation({
    onSuccess: (result) => {
      setApplyStatus({
        ok: true,
        message: `${result.reassigned} ticket(s) reassigned successfully.`,
      });
      setShowConfirm(false);
      void utils['analytics.teamWorkload'].invalidate({ teamId });
    },
    onError: (err) => {
      setApplyStatus({ ok: false, message: err.message ?? 'Reassignment failed.' });
      setShowConfirm(false);
    },
  });

  const handleApplyAll = () => {
    if (!data?.suggestions.length) return;
    const reassignments = data.suggestions.map((s) => ({
      ticketId: s.ticketId,
      toEngineerId: s.toEngineerId,
    }));
    batchReassignMutation.mutate({ reassignments });
  };

  if (isLoading) {
    return (
      <div className="v2-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          Loading workload…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="v2-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: 13 }}>
          <AlertCircle size={14} />
          Failed to load workload data.
        </div>
      </div>
    );
  }

  const { engineers, suggestions } = data;

  return (
    <div className="v2-card">
      <div className="v2-card-header">
        <div className="v2-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={15} style={{ color: 'var(--indigo)' }} />
          Workload — {teamName ?? teamId}
        </div>
        {suggestions.length > 0 && (
          <span className="v2-badge v2-badge-amber">{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="v2-card-body">
        {applyStatus && (
          <div style={{
            marginBottom: 14, padding: '10px 14px', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 8,
            background: applyStatus.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${applyStatus.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: applyStatus.ok ? '#16a34a' : '#dc2626', fontSize: 13,
          }}>
            {applyStatus.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {applyStatus.message}
          </div>
        )}

        {/* Per-engineer load bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: suggestions.length > 0 ? 20 : 0 }}>
          {engineers.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active engineers in this team.</p>
          )}
          {engineers.map((eng) => (
            <div key={eng.engineerId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {eng.fullName}
                  {eng.isUnavailable && (
                    <span className="v2-badge v2-badge-gray" style={{ marginLeft: 6, fontSize: 10 }}>Away</span>
                  )}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: loadColor(eng.loadPct) }}>
                  {eng.openTickets}/{eng.maxCapacity} ({eng.loadPct}%)
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(eng.loadPct, 100)}%`,
                  borderRadius: 3,
                  background: loadColor(eng.loadPct),
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Rebalancing Suggestions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {suggestions.map((s: WorkloadSuggestion) => (
                <div key={s.ticketId} style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(99,102,241,0.06)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                }}>
                  <ArrowRightLeft size={12} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
                  <span style={{ flex: 1, color: 'var(--text-primary)' }}>{s.ticketTitle}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {s.fromEngineerName} → <strong>{s.toEngineerName}</strong>
                  </span>
                </div>
              ))}
            </div>

            {/* Apply All button */}
            {!showConfirm ? (
              <button
                type="button"
                className="v2-btn v2-btn-primary v2-btn-sm"
                onClick={() => setShowConfirm(true)}
                disabled={batchReassignMutation.isPending}
              >
                <ArrowRightLeft size={12} />
                Apply All Suggestions
              </button>
            ) : (
              <div style={{
                padding: '12px 14px', borderRadius: 8,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>
                  Reassign <strong>{suggestions.length}</strong> ticket(s)? This will move them to the suggested engineers.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="v2-btn v2-btn-primary v2-btn-sm"
                    onClick={handleApplyAll}
                    disabled={batchReassignMutation.isPending}
                  >
                    {batchReassignMutation.isPending ? (
                      <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Applying…</>
                    ) : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    className="v2-btn v2-btn-ghost v2-btn-sm"
                    onClick={() => setShowConfirm(false)}
                    disabled={batchReassignMutation.isPending}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
