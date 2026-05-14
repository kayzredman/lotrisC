'use client';

import { useState } from 'react';
import { Users, AlertCircle, CheckCircle, ArrowRightLeft, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { WorkloadSuggestion, TeamWorkloadResult } from '@lotris/types';

// ── Single-team panel (used for TEAM_LEAD) ───────────────────────────────────

interface TeamPanelProps {
  teamId: string;
  teamName?: string;
  /** when true the surrounding card wrapper is omitted (used when nested in multi-panel) */
  inline?: boolean;
}

function loadColor(pct: number): string {
  if (pct >= 100) return '#dc2626';
  if (pct >= 70) return '#d97706';
  return '#16a34a';
}

function TeamLoadPanel({ teamId, teamName, inline }: TeamPanelProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [applyStatus, setApplyStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc['analytics.teamWorkload'].useQuery(
    { teamId },
    { staleTime: 60_000, refetchInterval: 120_000 },
  );

  const batchReassignMutation = trpc['tickets.batchReassign'].useMutation({
    onSuccess: (result) => {
      setApplyStatus({ ok: true, message: `${result.reassigned} ticket(s) reassigned successfully.` });
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
    batchReassignMutation.mutate({
      reassignments: data.suggestions.map((s) => ({ ticketId: s.ticketId, toEngineerId: s.toEngineerId })),
    });
  };

  const inner = (
    <>
      {!inline && (
        <div className="v2-card-header">
          <div className="v2-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={15} style={{ color: 'var(--indigo)' }} />
            Workload — {teamName ?? teamId}
          </div>
          {data && data.suggestions.length > 0 && (
            <span className="v2-badge v2-badge-amber">{data.suggestions.length} suggestion{data.suggestions.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      )}

      <div className={inline ? '' : 'v2-card-body'}>
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading workload…
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: 13 }}>
            <AlertCircle size={14} /> Failed to load workload data.
          </div>
        )}

        {data && (
          <>
            {applyStatus && (
              <div style={{
                marginBottom: 14, padding: '10px 14px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                background: applyStatus.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${applyStatus.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: applyStatus.ok ? '#16a34a' : '#dc2626',
              }}>
                {applyStatus.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {applyStatus.message}
              </div>
            )}

            {/* Engineer load bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: data.suggestions.length > 0 ? 20 : 0 }}>
              {data.engineers.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active engineers in this team.</p>
              )}
              {data.engineers.map((eng) => (
                <div key={eng.engineerId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {eng.fullName}
                      {eng.isUnavailable && <span className="v2-badge v2-badge-gray" style={{ marginLeft: 6, fontSize: 10 }}>Away</span>}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: loadColor(eng.loadPct) }}>
                      {eng.openTickets}/{eng.maxCapacity} ({eng.loadPct}%)
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(eng.loadPct, 100)}%`, borderRadius: 3, background: loadColor(eng.loadPct), transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Suggestions */}
            {data.suggestions.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Rebalancing Suggestions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {data.suggestions.map((s: WorkloadSuggestion) => (
                    <div key={s.ticketId} style={{
                      padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                      background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
                    }}>
                      <ArrowRightLeft size={12} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text-primary)' }}>{s.ticketTitle}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{s.fromEngineerName} → <strong>{s.toEngineerName}</strong></span>
                    </div>
                  ))}
                </div>

                {!showConfirm ? (
                  <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => setShowConfirm(true)} disabled={batchReassignMutation.isPending}>
                    <ArrowRightLeft size={12} /> Apply All Suggestions
                  </button>
                ) : (
                  <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>
                      Reassign <strong>{data.suggestions.length}</strong> ticket(s)? This will notify affected engineers.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={handleApplyAll} disabled={batchReassignMutation.isPending}>
                        {batchReassignMutation.isPending ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Applying…</> : 'Confirm'}
                      </button>
                      <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => setShowConfirm(false)} disabled={batchReassignMutation.isPending}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  if (inline) return <div style={{ padding: '12px 16px' }}>{inner}</div>;
  return <div className="v2-card">{inner}</div>;
}

// ── Multi-team panel (used for IT_MANAGER, ADMIN, SUPERADMIN) ────────────────

function AllTeamsWorkloadPanel() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const utils = trpc.useUtils();

  const { data: allTeams, isLoading } = trpc['analytics.workloadSuggestions'].useQuery(
    undefined,
    { staleTime: 60_000, refetchInterval: 120_000 },
  );

  const totalSuggestions = allTeams?.reduce((n, t) => n + t.suggestions.length, 0) ?? 0;

  const batchReassignMutation = trpc['tickets.batchReassign'].useMutation({
    onSuccess: () => void utils['analytics.workloadSuggestions'].invalidate(),
  });

  const handleApplyAll = (team: TeamWorkloadResult) => {
    batchReassignMutation.mutate({
      reassignments: team.suggestions.map((s) => ({ ticketId: s.ticketId, toEngineerId: s.toEngineerId })),
    });
  };

  return (
    <div className="v2-card">
      <div className="v2-card-header">
        <div className="v2-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={15} style={{ color: 'var(--indigo)' }} />
          Workload Rebalancing
        </div>
        {totalSuggestions > 0 && (
          <span className="v2-badge v2-badge-amber">{totalSuggestions} suggestion{totalSuggestions !== 1 ? 's' : ''} across teams</span>
        )}
      </div>

      {isLoading && (
        <div className="v2-card-body" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading all teams…
        </div>
      )}

      {allTeams?.map((team) => {
        const isOpen = !!expanded[team.teamId];
        const hasSuggestions = team.suggestions.length > 0;
        return (
          <div key={team.teamId} style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setExpanded(e => ({ ...e, [team.teamId]: !isOpen }))}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <strong>{team.teamId}</strong>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{team.engineers.length} engineers</span>
              </span>
              {hasSuggestions && <span className="v2-badge v2-badge-amber">{team.suggestions.length} suggestion{team.suggestions.length !== 1 ? 's' : ''}</span>}
            </button>

            {isOpen && (
              <div style={{ padding: '0 16px 16px' }}>
                {/* Load bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: team.suggestions.length > 0 ? 14 : 0 }}>
                  {team.engineers.map((eng) => (
                    <div key={eng.engineerId}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{eng.fullName}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: loadColor(eng.loadPct) }}>{eng.openTickets}/{eng.maxCapacity} ({eng.loadPct}%)</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(eng.loadPct, 100)}%`, borderRadius: 3, background: loadColor(eng.loadPct) }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Suggestions */}
                {team.suggestions.map((s) => (
                  <div key={s.ticketId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '6px 10px', marginBottom: 4, borderRadius: 6, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)' }}>
                    <ArrowRightLeft size={11} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{s.ticketTitle}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{s.fromEngineerName} → <strong>{s.toEngineerName}</strong></span>
                  </div>
                ))}

                {team.suggestions.length > 0 && (
                  <button
                    type="button"
                    className="v2-btn v2-btn-primary v2-btn-sm"
                    style={{ marginTop: 10 }}
                    onClick={() => handleApplyAll(team)}
                    disabled={batchReassignMutation.isPending}
                  >
                    <ArrowRightLeft size={11} /> Apply {team.suggestions.length} Suggestion{team.suggestions.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Public export — role-aware wrapper ───────────────────────────────────────

interface WorkloadPanelProps {
  /** Required for TEAM_LEAD single-team mode */
  teamId?: string;
  teamName?: string;
  role: string;
}

export function WorkloadPanel({ teamId, teamName, role }: WorkloadPanelProps) {
  const isTeamLead = role === 'TEAM_LEAD';

  if (isTeamLead) {
    if (!teamId) return null;
    return <TeamLoadPanel teamId={teamId} teamName={teamName} />;
  }

  // IT_MANAGER, ADMIN, SUPERADMIN
  return <AllTeamsWorkloadPanel />;
}
