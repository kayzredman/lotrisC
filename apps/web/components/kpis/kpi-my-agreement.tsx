'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FilePenLine,
  ShieldCheck,
  Clock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type AgreementStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'CLOSED';

interface Agreement {
  id: string;
  engineerId: string;
  leadId: string;
  periodKey: string;
  status: AgreementStatus;
  createdAt: string;
  acceptedAt?: string | null;
  submittedAt?: string | null;
}

interface DbMetric {
  id: string;
  description: string;
  measurementPeriod: string;
  weight: string | number;
  targetScore: string | number | null;
}

interface DbArea {
  id: string;
  name: string;
  metrics: DbMetric[];
}

interface User {
  id: string;
  fullName: string;
  roleName: string;
}

interface Me {
  id: string;
  fullName: string;
  roleName: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AREA_COLORS = ['#4F46E5', '#2563EB', '#16A34A', '#EA580C', '#7C3AED', '#CA8A04'];

const STATUS_PILL: Record<AgreementStatus, { label: string; cls: string }> = {
  DRAFT:          { label: 'Draft',          cls: 'status-pill draft'   },
  PENDING_REVIEW: { label: 'Pending Review', cls: 'status-pill pending' },
  ACTIVE:         { label: 'Active',         cls: 'status-pill active'  },
  CLOSED:         { label: 'Closed',         cls: 'status-pill closed'  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase();
}

function periodLabel(key: string) {
  const MAP: Record<string, string> = {
    'JAN-DEC-2026': 'Jan – Dec 2026',
    'Q2-2026':      'Q2 2026',
    'Q3-2026':      'Q3 2026',
    'JAN-DEC-2025': 'Jan – Dec 2025',
  };
  return MAP[key] ?? key;
}

// ─── Read-only area card ──────────────────────────────────────────────────────

function ReadOnlyArea({ area, idx, color }: { area: DbArea; idx: number; color: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const total = area.metrics.reduce((s, m) => s + (parseFloat(String(m.weight)) || 0), 0);

  return (
    <div className="agr-area-card" style={{ marginBottom: 10 }}>
      <button type="button" className="agr-area-header" onClick={() => setCollapsed(c => !c)}>
        <div className="agr-area-num" style={{ background: color }}>{idx + 1}</div>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)', textAlign: 'left' }}>
          {area.name}
        </span>
        <span className={`agr-area-chip ok`}>{total.toFixed(1)} / {total.toFixed(1)}</span>
        {collapsed ? <ChevronRight size={13} color="var(--text-muted)" /> : <ChevronDown size={13} color="var(--text-muted)" />}
      </button>

      {!collapsed && (
        <div className="agr-area-body">
          <table className="agr-metric-table">
            <thead>
              <tr>
                <th className="th-num">#</th>
                <th>Minimum Performance Metrics Standard</th>
                <th className="th-w">Weight</th>
                <th className="th-period">Period</th>
                <th className="th-target">Target / Score</th>
              </tr>
            </thead>
            <tbody>
              {area.metrics.map((m, mi) => (
                <tr key={m.id}>
                  <td><span className="agr-row-num">{mi + 1}</span></td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.55 }}>
                    {m.description || <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13 }}>
                    {parseFloat(String(m.weight)).toFixed(1)}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {m.measurementPeriod.charAt(0) + m.measurementPeriod.slice(1).toLowerCase()}
                  </td>
                  <td style={{ fontSize: 12.5, fontWeight: 600 }}>
                    {m.targetScore != null ? String(m.targetScore) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="agr-area-footer">
            <span />
            <span className="agr-area-footer-total">
              Area total: <strong>{total.toFixed(1)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function KpiMyAgreement() {
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState<AgreementStatus | 'ALL'>('ALL');
  const [selectedId, setSelectedId]   = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Current user info
  const { data: meRaw }    = trpc['users.me'].useQuery();
  const me = meRaw as Me | undefined;

  const { data: usersRaw } = trpc['users.list'].useQuery({}, { staleTime: 120_000 });
  const users: User[] = (usersRaw as User[] | undefined) ?? [];

  // Own agreements — engineerId scopes for both ENGINEER (auto) and TEAM_LEAD (explicit)
  const { data: listData, isLoading } = trpc['kpi.agreements.list'].useQuery(
    { engineerId: me?.id },
    { enabled: !!me?.id, staleTime: 30_000 },
  );

  // Sort: latest first
  const allAgreements: Agreement[] = useMemo(() => {
    const raw = (listData as Agreement[] | undefined) ?? [];
    return [...raw].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [listData]);

  // Search + status filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allAgreements.filter(a => {
      if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
      if (!q) return true;
      const leadName = users.find(u => u.id === a.leadId)?.fullName ?? '';
      return (
        a.periodKey.toLowerCase().includes(q) ||
        periodLabel(a.periodKey).toLowerCase().includes(q) ||
        STATUS_PILL[a.status].label.toLowerCase().includes(q) ||
        leadName.toLowerCase().includes(q)
      );
    });
  }, [allAgreements, filterStatus, search, users]);

  // Selected agreement detail
  const { data: detailRaw } = trpc['kpi.agreements.get'].useQuery(
    { id: selectedId ?? '' },
    { enabled: !!selectedId, staleTime: 30_000 },
  );
  const areas: DbArea[] = (detailRaw as { areas?: DbArea[] } | undefined)?.areas ?? [];
  const selectedAgreement = allAgreements.find(a => a.id === selectedId);
  const lead = users.find(u => u.id === selectedAgreement?.leadId);

  const totalWeight = areas.reduce(
    (s, a) => s + a.metrics.reduce((ms, m) => ms + (parseFloat(String(m.weight)) || 0), 0),
    0,
  );

  // Accept / sign-off mutation
  const acceptMutation = trpc['kpi.agreements.accept'].useMutation({
    onSuccess: () => {
      utils['kpi.agreements.list'].invalidate();
      utils['kpi.agreements.get'].invalidate({ id: selectedId ?? '' });
    },
  });

  return (
    <div>
      {/* Page header */}
      <div className="v2-page-header">
        <div>
          <h1>My KPI Agreement</h1>
          <p>View your performance agreements across all periods and sign off when ready</p>
        </div>
      </div>

      {/* Agreements list */}
      <div className="v2-card" style={{ marginBottom: 20 }}>
        <div className="v2-card-header">
          <div className="v2-card-title">Agreements</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Search period, lead…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  paddingLeft: 28, paddingRight: 10, paddingTop: 5, paddingBottom: 5,
                  fontSize: 12.5, border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
                  background: 'var(--bg-subtle)', outline: 'none', width: 190,
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            {/* Status filters */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(['ALL', 'DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'CLOSED'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={filterStatus === s ? 'v2-btn v2-btn-primary v2-btn-sm' : 'v2-btn v2-btn-ghost v2-btn-sm'}
                  style={{ fontSize: 11, padding: '3px 9px' }}
                >
                  {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Status</th>
                <th>Lead / Manager</th>
                <th>Created</th>
                <th>Agreed On</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px 0' }}>
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                    {allAgreements.length === 0
                      ? 'No agreements have been set up for you yet.'
                      : 'No agreements match your search.'}
                  </td>
                </tr>
              )}
              {filtered.map(a => {
                const sp = STATUS_PILL[a.status] ?? { label: a.status, cls: 'status-pill draft' };
                const leadName = users.find(u => u.id === a.leadId)?.fullName ?? '—';
                const isSelected = selectedId === a.id;
                return (
                  <tr
                    key={a.id}
                    style={{ cursor: 'pointer', background: isSelected ? 'var(--indigo-dim)' : undefined }}
                    onClick={() => setSelectedId(isSelected ? null : a.id)}
                  >
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{periodLabel(a.periodKey)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.periodKey}</div>
                    </td>
                    <td>
                      <span className={sp.cls}><span className="dot" />{sp.label}</span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{leadName}</td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {a.acceptedAt
                        ? new Date(a.acceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td>
                      <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" style={{ fontSize: 11 }}>
                        {isSelected ? 'Close' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel — shown when a row is selected */}
      {selectedId && selectedAgreement && (
        <div>
          {/* Header bar */}
          <div className="agr-eng-bar">
            <div className="agr-eng-cell">
              <div className="agr-eng-label">Team Member</div>
              <div className="agr-eng-val">
                {me && (
                  <div className="agr-eng-avatar">{initials(me.fullName)}</div>
                )}
                <span>{me?.fullName ?? '—'}</span>
              </div>
            </div>
            <div className="agr-eng-cell">
              <div className="agr-eng-label">Job Role</div>
              <div className="agr-eng-val">{me?.roleName ?? '—'}</div>
            </div>
            <div className="agr-eng-cell">
              <div className="agr-eng-label">Review Period</div>
              <div className="agr-eng-val">
                <span className="v2-badge">{selectedAgreement.periodKey}</span>
              </div>
            </div>
            <div className="agr-eng-cell">
              <div className="agr-eng-label">Lead / Manager</div>
              <div className="agr-eng-val">
                {lead && (
                  <div className="agr-eng-avatar" style={{ background: '#dcfce7', color: '#16a34a' }}>
                    {initials(lead.fullName)}
                  </div>
                )}
                <span>{lead?.fullName ?? '—'}</span>
              </div>
            </div>
            <div className="agr-eng-cell">
              <div className="agr-eng-label">Agreed On</div>
              <div className="agr-eng-val" style={{ fontSize: 12.5 }}>
                {selectedAgreement.acceptedAt
                  ? new Date(selectedAgreement.acceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : selectedAgreement.submittedAt
                    ? new Date(selectedAgreement.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · Submitted'
                    : '—'}
              </div>
            </div>
            <div className="agr-eng-cell agr-eng-cell-last">
              {(() => {
                const sp = STATUS_PILL[selectedAgreement.status];
                return <span className={sp.cls}><span className="dot" />{sp.label}</span>;
              })()}
            </div>
          </div>

          {/* Two-column layout: areas left, sign-off right */}
          <div className="agr-layout">
            {/* Left: read-only KPI areas */}
            <div>
              {areas.length === 0 ? (
                <div className="v2-card" style={{ padding: '40px 32px', textAlign: 'center' }}>
                  <FilePenLine size={32} color="var(--text-light)" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                    No KPI areas defined yet
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-light)' }}>
                    Your lead is still setting up the performance standards.
                  </div>
                </div>
              ) : (
                areas.map((area, idx) => (
                  <ReadOnlyArea
                    key={area.id}
                    area={area}
                    idx={idx}
                    color={AREA_COLORS[idx % AREA_COLORS.length] ?? '#4F46E5'}
                  />
                ))
              )}
            </div>

            {/* Right: sign-off + summary */}
            <div className="agr-weight-sidebar">

              {/* Sign-off card */}
              <div className="v2-card" style={{ marginBottom: 14 }}>
                <div className="v2-card-header" style={{ padding: '12px 14px' }}>
                  <div className="v2-card-title" style={{ fontSize: '12.5px' }}>Sign-off</div>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Lead / manager row — signed once submitted */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="agr-avatar-sm" style={{ background: '#dcfce7', color: '#16a34a' }}>
                        {lead ? initials(lead.fullName) : '??'}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {lead?.fullName ?? '—'}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Team Lead / Manager</div>
                      </div>
                    </div>
                    {selectedAgreement.status !== 'DRAFT'
                      ? <span className="v2-badge v2-badge-green" style={{ fontSize: 10 }}>Signed</span>
                      : <span style={{ fontSize: 11, color: 'var(--text-light)', fontStyle: 'italic' }}>Pending</span>
                    }
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid var(--border)' }} />

                  {/* Member (me) row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="agr-avatar-sm" style={{ background: '#dbeafe', color: '#2563eb' }}>
                        {me ? initials(me.fullName) : '??'}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {me?.fullName ?? '—'}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Team Member</div>
                      </div>
                    </div>
                    {selectedAgreement.status === 'ACTIVE' || selectedAgreement.status === 'CLOSED'
                      ? <span className="v2-badge v2-badge-green" style={{ fontSize: 10 }}>Signed</span>
                      : <span style={{ fontSize: 11, color: 'var(--text-light)', fontStyle: 'italic' }}>Pending</span>
                    }
                  </div>

                  {/* Action / state message */}
                  {selectedAgreement.status === 'PENDING_REVIEW' && (
                    <div style={{ marginTop: 2 }}>
                      <button
                        type="button"
                        className="v2-btn v2-btn-primary v2-btn-sm"
                        style={{ width: '100%', justifyContent: 'center', gap: 7 }}
                        onClick={() => acceptMutation.mutate({ agreementId: selectedId })}
                        disabled={acceptMutation.isPending}
                      >
                        <ShieldCheck size={13} />
                        {acceptMutation.isPending ? 'Signing…' : 'Accept & Sign Off'}
                      </button>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
                        By accepting you confirm agreement to the performance standards above.
                      </div>
                    </div>
                  )}

                  {selectedAgreement.status === 'DRAFT' && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5,
                      color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a',
                      borderRadius: 'var(--radius-sm)', padding: '8px 10px',
                    }}>
                      <Clock size={13} style={{ flexShrink: 0 }} />
                      Waiting for your lead to finalise and send for review.
                    </div>
                  )}

                  {(selectedAgreement.status === 'ACTIVE' || selectedAgreement.status === 'CLOSED') && selectedAgreement.acceptedAt && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5,
                      color: '#166534', background: 'var(--green-bg)', border: '1px solid #bbf7d0',
                      borderRadius: 'var(--radius-sm)', padding: '8px 10px',
                    }}>
                      <CheckCircle2 size={13} style={{ flexShrink: 0 }} />
                      Agreed on {new Date(selectedAgreement.acceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}

                  {acceptMutation.error && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5,
                      color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca',
                      borderRadius: 'var(--radius-sm)', padding: '8px 10px',
                    }}>
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      {acceptMutation.error.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary card */}
              <div className="v2-card">
                <div className="v2-card-header" style={{ padding: '12px 14px' }}>
                  <div className="v2-card-title" style={{ fontSize: '12.5px' }}>Summary</div>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--text-muted)' }}>KPI Areas</span>
                    <span style={{ fontWeight: 700 }}>{areas.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Metrics</span>
                    <span style={{ fontWeight: 700 }}>{areas.reduce((s, a) => s + a.metrics.length, 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Weight</span>
                    <span style={{ fontWeight: 700, color: totalWeight === 100 ? 'var(--green)' : 'var(--text-primary)' }}>
                      {totalWeight.toFixed(1)}
                    </span>
                  </div>

                  {/* Weight bar */}
                  {areas.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
                        {areas.map((a, i) => {
                          const w = totalWeight > 0
                            ? (a.metrics.reduce((s, m) => s + (parseFloat(String(m.weight)) || 0), 0) / totalWeight) * 100
                            : 0;
                          return (
                            <div
                              key={a.id}
                              style={{ width: `${w}%`, background: AREA_COLORS[i % AREA_COLORS.length], borderRadius: 99 }}
                            />
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {areas.map((a, i) => {
                          const aTotal = a.metrics.reduce((s, m) => s + (parseFloat(String(m.weight)) || 0), 0);
                          return (
                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: AREA_COLORS[i % AREA_COLORS.length], flexShrink: 0 }} />
                              <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 600 }}>
                                {a.name || `Area ${i + 1}`}
                              </span>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{aTotal.toFixed(1)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Styles — duplicated here so this page works without the builder mounted */}
      <style>{`
        .agr-eng-bar {
          display: flex; align-items: stretch;
          background: white; border: 1px solid var(--border);
          border-radius: var(--radius-md); box-shadow: var(--shadow-xs);
          overflow: hidden; margin-bottom: 18px; flex-wrap: wrap;
        }
        .agr-eng-cell {
          padding: 10px 18px; border-right: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 3px; flex-shrink: 0;
        }
        .agr-eng-cell:last-child { border-right: none; }
        .agr-eng-cell-last {
          border-right: none; margin-left: auto; justify-content: center; padding: 10px 14px;
        }
        .agr-eng-avatar {
          width: 22px; height: 22px; border-radius: 50%;
          background: #dbeafe; color: #2563eb;
          font-size: 9px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .agr-avatar-sm {
          width: 26px; height: 26px; border-radius: 50%;
          font-size: 10px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .agr-eng-label {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5px; color: var(--text-light);
        }
        .agr-eng-val {
          font-size: 13px; font-weight: 700; color: var(--text-primary);
          display: flex; align-items: center; gap: 6px;
        }
        .status-pill {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11.5px; font-weight: 600;
          padding: 3px 8px; border-radius: 99px;
        }
        .status-pill .dot { width: 6px; height: 6px; border-radius: 50%; }
        .status-pill.draft   { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
        .status-pill.draft .dot { background: #f59e0b; }
        .status-pill.pending { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .status-pill.pending .dot { background: #2563eb; }
        .status-pill.active  { background: var(--green-bg); color: var(--green); border: 1px solid #bbf7d0; }
        .status-pill.active .dot { background: var(--green); }
        .status-pill.closed  { background: var(--bg-subtle); color: var(--text-muted); border: 1px solid var(--border); }
        .status-pill.closed .dot { background: var(--text-muted); }
        .agr-layout {
          display: grid; grid-template-columns: 1fr 272px;
          gap: 20px; align-items: start;
        }
        @media (max-width: 900px) { .agr-layout { grid-template-columns: 1fr; } }
        .agr-area-card {
          border: 1px solid var(--border); border-radius: var(--radius-md);
          overflow: hidden; margin-bottom: 12px;
          box-shadow: var(--shadow-xs); background: white;
        }
        .agr-area-header {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; background: var(--bg-subtle);
          border-bottom: 1px solid var(--border);
          cursor: pointer; user-select: none; width: 100%;
          border: none; text-align: left;
        }
        .agr-area-num {
          width: 22px; height: 22px; background: var(--indigo); color: white;
          border-radius: 50%; font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .agr-area-chip {
          font-size: 11.5px; font-weight: 700; padding: 3px 8px;
          border-radius: 4px; background: var(--bg); border: 1px solid var(--border);
          color: var(--text-muted); white-space: nowrap;
        }
        .agr-area-chip.ok { color: var(--green); background: var(--green-bg); border-color: #bbf7d0; }
        .agr-area-body { background: white; }
        .agr-metric-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .agr-metric-table th {
          padding: 7px 10px; background: white;
          font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase; color: var(--text-light);
          border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap;
        }
        .agr-metric-table .th-num    { width: 28px; }
        .agr-metric-table .th-w      { width: 66px; text-align: center; }
        .agr-metric-table .th-period { width: 108px; }
        .agr-metric-table .th-target { width: 100px; }
        .agr-metric-table td { padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
        .agr-metric-table tbody tr:last-child td { border-bottom: none; }
        .agr-metric-table tbody tr:hover td { background: #fafbff; }
        .agr-row-num {
          width: 18px; height: 18px; background: var(--bg-subtle);
          border: 1px solid var(--border); border-radius: 3px;
          font-size: 10px; font-weight: 700; color: var(--text-light);
          display: inline-flex; align-items: center; justify-content: center; margin-top: 3px;
        }
        .agr-area-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 14px; border-top: 1px solid var(--border); background: var(--bg-subtle);
        }
        .agr-area-footer-total {
          font-size: 12px; color: var(--text-muted);
          display: flex; align-items: center; gap: 4px;
        }
        .agr-area-footer-total strong { font-size: 13px; font-weight: 800; color: var(--text-primary); }
        .agr-weight-sidebar { position: sticky; top: calc(58px + 20px); }
      `}</style>
    </div>
  );
}
