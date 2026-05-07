'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { trpc } from '@/lib/trpc/client';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Save,
  FilePenLine,
  Upload,
  X,
  PlusCircle,
  Eye,
  Printer,
  Send,
  Copy,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricRow {
  id: string;
  description: string;
  measurementPeriod: string;
  weight: number;
  targetScore: string;
}

interface AreaRow {
  id: string;
  name: string;
  collapsed: boolean;
  metrics: MetricRow[];
}

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

interface User {
  id: string;
  fullName: string;
  email: string;
  roleName: string;
  teamId: string | null;
}

// DB shapes from getAgreementWithAreas
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AREA_COLORS = ['#4F46E5', '#2563EB', '#16A34A', '#EA580C', '#7C3AED', '#CA8A04'];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyMetric(): MetricRow {
  return { id: uid(), description: '', measurementPeriod: 'QUARTERLY', weight: 10, targetScore: '' };
}

function emptyArea(): AreaRow {
  return { id: uid(), name: '', collapsed: false, metrics: [emptyMetric()] };
}

function areaTotal(area: AreaRow) {
  return area.metrics.reduce((s, m) => s + (Number(m.weight) || 0), 0);
}

function initials(name: string): string {
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase();
}

function dbAreaToRow(a: DbArea): AreaRow {
  return {
    id: a.id,
    name: a.name,
    collapsed: false,
    metrics: (a.metrics ?? []).map(m => ({
      id: m.id,
      description: m.description ?? '',
      measurementPeriod: m.measurementPeriod ?? 'QUARTERLY',
      weight: parseFloat(String(m.weight)) || 0,
      targetScore: m.targetScore != null ? String(m.targetScore) : '',
    })),
  };
}

const STATUS_PILL: Record<AgreementStatus, { label: string; cls: string }> = {
  DRAFT:          { label: 'Draft',          cls: 'status-pill draft'   },
  PENDING_REVIEW: { label: 'Pending Review', cls: 'status-pill pending' },
  ACTIVE:         { label: 'Active',         cls: 'status-pill active'  },
  CLOSED:         { label: 'Closed',         cls: 'status-pill closed'  },
};

// ─── Sub-component: metric row ─────────────────────────────────────────────────

function AgrMetricRow({
  metric, rowNum,
  onChange, onDelete,
}: {
  metric: MetricRow;
  rowNum: number;
  onChange: (field: keyof MetricRow, val: string | number) => void;
  onDelete: () => void;
}) {
  return (
    <tr>
      <td><span className="agr-row-num">{rowNum}</span></td>
      <td>
        <textarea
          className="agr-metric-desc"
          rows={2}
          placeholder="Describe the performance standard…"
          value={metric.description}
          onChange={e => onChange('description', e.target.value)}
        />
      </td>
      <td style={{ textAlign: 'center' }}>
        <input
          className="agr-weight-inp"
          type="number"
          step={0.5}
          min={0}
          max={100}
          value={metric.weight}
          onChange={e => onChange('weight', parseFloat(e.target.value) || 0)}
        />
      </td>
      <td>
        <select
          className="agr-period-sel"
          value={metric.measurementPeriod}
          onChange={e => onChange('measurementPeriod', e.target.value)}
        >
          <option value="MONTHLY">Monthly</option>
          <option value="QUARTERLY">Quarterly</option>
          <option value="ANNUALLY">Annually</option>
        </select>
      </td>
      <td>
        <input
          className="agr-target-inp"
          type="text"
          placeholder="e.g. ≥ 95%"
          value={metric.targetScore}
          onChange={e => onChange('targetScore', e.target.value)}
        />
      </td>
      <td>
        <button type="button" className="agr-del-row-btn" onClick={onDelete} title="Remove metric">
          <X size={12} />
        </button>
      </td>
    </tr>
  );
}

// ─── Sub-component: area card ──────────────────────────────────────────────────

function AreaCard({
  area, idx, color,
  onUpdate, onDelete, onAddMetric, onRemoveMetric, onUpdateMetric, onToggle,
}: {
  area: AreaRow;
  idx: number;
  color: string;
  onUpdate: (field: keyof Pick<AreaRow, 'name'>, val: string) => void;
  onDelete: () => void;
  onAddMetric: () => void;
  onRemoveMetric: (mi: number) => void;
  onUpdateMetric: (mi: number, field: keyof MetricRow, val: string | number) => void;
  onToggle: () => void;
}) {
  const total = areaTotal(area);

  return (
    <div className="agr-area-card">
      {/* Header */}
      <button
        type="button"
        className="agr-area-header"
        onClick={onToggle}
      >
        <div className="agr-area-num" style={{ background: color }}>{idx + 1}</div>
        <input
          className="agr-area-name-inp"
          type="text"
          placeholder="KPI Area name…"
          value={area.name}
          onClick={e => e.stopPropagation()}
          onChange={e => onUpdate('name', e.target.value)}
        />
        <span className={`agr-area-chip${total > 0 ? ' ok' : ''}`}>{total.toFixed(1)} / {total.toFixed(1)}</span>
        <button
          type="button"
          className="agr-area-hdr-btn"
          onClick={e => { e.stopPropagation(); onDelete(); }}
          title="Delete area"
        >
          <Trash2 size={12} />
        </button>
        <button type="button" className="agr-area-hdr-btn" title="Toggle">
          {area.collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
      </button>

      {/* Body */}
      {!area.collapsed && (
        <div className="agr-area-body">
          <table className="agr-metric-table">
            <thead>
              <tr>
                <th className="th-num">#</th>
                <th>Minimum Performance Metrics Standard</th>
                <th className="th-w">Weight</th>
                <th className="th-period">Period</th>
                <th className="th-target">Target / Score</th>
                <th className="th-del" />
              </tr>
            </thead>
            <tbody>
              {area.metrics.map((m, mi) => (
                <AgrMetricRow
                  key={m.id}
                  metric={m}
                  rowNum={mi + 1}
                  onChange={(f, v) => onUpdateMetric(mi, f, v)}
                  onDelete={() => onRemoveMetric(mi)}
                />
              ))}
            </tbody>
          </table>
          <div className="agr-area-footer">
            <button type="button" className="agr-add-metric-btn" onClick={onAddMetric}>
              <Plus size={11} /> Add metric
            </button>
            <span className="agr-area-footer-total">
              Area total: <strong>{total.toFixed(1)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function KpiAgreementBuilder() {
  const { getToken } = useAuth();

  async function apiFetch(path: string, init: RequestInit = {}) {
    const token = await getToken();
    const base = process.env.NEXT_PUBLIC_API_URL ?? '';
    return fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  }

  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [areas, setAreas] = useState<AreaRow[]>([emptyArea()]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [engineerId, setEngineerId] = useState<string>('');
  const [periodKey, setPeriodKey] = useState('JAN-DEC-2026');
  const [leadNotes, setLeadNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<AgreementStatus | 'ALL'>('ALL');
  const [showNewForm, setShowNewForm] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // ── tRPC queries ─────────────────────────────────────────────────────────
  const utils = trpc.useUtils();

  const { data: usersRaw } = trpc['users.list'].useQuery({}, { staleTime: 120_000 });
  const users: User[] = (usersRaw as User[] | undefined) ?? [];

  const { data: listData, isLoading } = trpc['kpi.agreements.list'].useQuery(
    {},
    { staleTime: 60_000 },
  );
  const allAgreements: Agreement[] = (listData as Agreement[] | undefined) ?? [];
  const agreements = allAgreements.filter(
    a => filterStatus === 'ALL' || a.status === filterStatus,
  );

  // Load areas when agreement selected
  const { data: agreementDetail } = trpc['kpi.agreements.get'].useQuery(
    { id: selectedId ?? '' },
    { enabled: !!selectedId, staleTime: 30_000 },
  );

  useEffect(() => {
    if (!agreementDetail) return;
    const ag = agreementDetail as { areas?: DbArea[] };
    if (ag.areas?.length) {
      setAreas(ag.areas.map(dbAreaToRow));
    } else {
      setAreas([emptyArea()]);
    }
  }, [agreementDetail]);

  // ── Resolved names ────────────────────────────────────────────────────────
  const selectedAgreement = allAgreements.find(a => a.id === selectedId);
  const selectedEngineer = users.find(u => u.id === selectedAgreement?.engineerId);
  const selectedLead = users.find(u => u.id === selectedAgreement?.leadId);

  function userName(id: string) {
    return users.find(u => u.id === id)?.fullName ?? id.slice(0, 8) + '…';
  }

  // ── Weight calculations ───────────────────────────────────────────────────
  const totalWeight = areas.reduce((s, a) => s + areaTotal(a), 0);
  const weightOk = Math.abs(totalWeight - 100) < 0.01;

  // ── Area mutations ───────────────────────────────────────────────────────
  function addArea() {
    setAreas(p => [...p, emptyArea()]);
  }

  function removeArea(i: number) {
    setAreas(p => p.filter((_, idx) => idx !== i));
  }

  function updateArea(i: number, field: keyof Pick<AreaRow, 'name'>, val: string) {
    setAreas(p => p.map((a, idx) => idx === i ? { ...a, [field]: val } : a));
  }

  function toggleArea(i: number) {
    setAreas(p => p.map((a, idx) => idx === i ? { ...a, collapsed: !a.collapsed } : a));
  }

  function addMetric(ai: number) {
    setAreas(p => p.map((a, idx) => idx === ai ? { ...a, metrics: [...a.metrics, emptyMetric()] } : a));
  }

  function removeMetric(ai: number, mi: number) {
    setAreas(p => p.map((a, idx) => idx === ai ? { ...a, metrics: a.metrics.filter((_, i) => i !== mi) } : a));
  }

  function updateMetric(ai: number, mi: number, field: keyof MetricRow, val: string | number) {
    setAreas(p => p.map((a, idx) => idx === ai
      ? { ...a, metrics: a.metrics.map((m, i) => i === mi ? { ...m, [field]: val } : m) }
      : a));
  }

  // ── Save/activate ────────────────────────────────────────────────────────
  async function handleSave(activate = false) {
    if (!selectedId) return;
    setSaving(true);
    try {
      const body = {
        areas: areas.map(a => ({
          name: a.name,
          weight: areaTotal(a),
          metrics: a.metrics.map(m => ({
            description: m.description,
            measurementPeriod: m.measurementPeriod,
            weight: m.weight,
            targetScore: parseFloat(m.targetScore) || 0,
          })),
        })),
      };
      await apiFetch(`/api/v1/kpi/agreements/${selectedId}/areas`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (activate) {
        await apiFetch(`/api/v1/kpi/agreements/${selectedId}/submit`, { method: 'POST' });
      }
      utils['kpi.agreements.list'].invalidate();
      utils['kpi.agreements.get'].invalidate({ id: selectedId });
    } finally {
      setSaving(false);
    }
  }

  // ── Submit for review ────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!selectedId) return;
    await apiFetch(`/api/v1/kpi/agreements/${selectedId}/submit`, { method: 'POST' });
    utils['kpi.agreements.list'].invalidate();
    utils['kpi.agreements.get'].invalidate({ id: selectedId });
  }

  // ── New agreement ────────────────────────────────────────────────────────
  async function handleNewAgreement() {
    if (!engineerId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const resp = await apiFetch('/api/v1/kpi/agreements', {
        method: 'POST',
        body: JSON.stringify({ engineerId, periodKey }),
      });
      if (resp.ok) {
        const d = await resp.json() as { id: string };
        setSelectedId(d.id);
        setAreas([emptyArea()]);
        setShowNewForm(false);
        setCreateError(null);
        utils['kpi.agreements.list'].invalidate();
        setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      } else {
        const err = await resp.json().catch(() => ({})) as { message?: string };
        setCreateError(err.message ?? `Server error (${resp.status})`);
      }
    } catch (_e) {
      setCreateError('Network error — check the API is running');
    } finally {
      setCreating(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div className="v2-page-header">
        <div>
          <h1>KPI Agreement Builder</h1>
          <p>Define KPI areas, performance standards, and weights for a team member&apos;s review period</p>
        </div>
        <div className="v2-page-header-actions">
          <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm">
            <Eye size={12} /> Preview
          </button>
          <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm">
            <Printer size={12} /> Print / Export
          </button>
          {selectedId && (
            <>
              <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm" onClick={() => handleSave(false)} disabled={saving}>
                <Save size={12} /> Save draft
              </button>
              <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => handleSave(true)} disabled={saving || !weightOk}>
                <CheckCircle2 size={12} /> Activate agreement
              </button>
            </>
          )}
        </div>
      </div>

      {/* Agreements list */}
      <div className="v2-card" style={{ marginBottom: 20 }}>
        <div className="v2-card-header">
          <div className="v2-card-title">Agreements</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            <button
              type="button"
              className="v2-btn v2-btn-primary v2-btn-sm"
              onClick={() => setShowNewForm(p => !p)}
            >
              <Plus size={12} /> New Agreement
            </button>
          </div>
        </div>

        {/* Inline new-agreement form */}
        {showNewForm && (
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            background: 'var(--indigo-dim)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)' }}>Team Member</span>
              <select
                className="agr-eng-select"
                style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', padding: '5px 8px', background: 'white', minWidth: 180 }}
                value={engineerId}
                onChange={e => setEngineerId(e.target.value)}
              >
                <option value="">— select engineer —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName} · {u.roleName}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)' }}>Review Period</span>
              <select
                className="agr-eng-select"
                style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', padding: '5px 8px', background: 'white' }}
                value={periodKey}
                onChange={e => setPeriodKey(e.target.value)}
              >
                <option value="JAN-DEC-2026">Jan – Dec 2026</option>
                <option value="Q2-2026">Q2 2026 (Apr – Jun)</option>
                <option value="Q3-2026">Q3 2026 (Jul – Sep)</option>
                <option value="JAN-DEC-2025">Jan – Dec 2025</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
              <button
                type="button"
                className="v2-btn v2-btn-primary v2-btn-sm"
                disabled={!engineerId || creating}
                onClick={handleNewAgreement}
              >
                <CheckCircle2 size={12} /> {creating ? 'Creating…' : 'Create'}
              </button>
              <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => { setShowNewForm(false); setCreateError(null); }}>
                Cancel
              </button>
            </div>
            {createError && (
              <div style={{ width: '100%', marginTop: 8, fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-xs)', padding: '6px 10px' }}>
                {createError}
              </div>
            )}
          </div>
        )}

        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>Engineer</th>
                <th>Period</th>
                <th>Lead</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px 0' }}>Loading…</td></tr>
              )}
              {!isLoading && agreements.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px 0' }}>No agreements found. Create one to get started.</td></tr>
              )}
              {agreements.map(a => {
                const sp = STATUS_PILL[a.status] ?? { label: a.status, cls: 'status-pill draft' };
                return (
                  <tr
                    key={a.id}
                    style={{ cursor: 'pointer', background: selectedId === a.id ? 'var(--indigo-dim)' : undefined }}
                    onClick={() => { setSelectedId(a.id); setLeadNotes(''); setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
                  >
                    <td style={{ fontWeight: 600 }}>{userName(a.engineerId)}</td>
                    <td><span className="v2-badge">{a.periodKey}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{userName(a.leadId)}</td>
                    <td><span className={sp.cls}><span className="dot" />{sp.label}</span></td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        style={{ fontSize: 11 }}
                        onClick={e => { e.stopPropagation(); setSelectedId(a.id); setLeadNotes(''); setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state — shown when no agreement is open */}
      {!selectedId && (
        <div className="v2-card" style={{ padding: '48px 32px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)',
            background: 'var(--indigo-dim)', border: '1px solid #c7d2fe',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <FilePenLine size={22} color="var(--indigo)" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            No agreement open
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 380, margin: '0 auto 20px' }}>
            Click any row in the Agreements table above to open the builder, or create a new agreement to get started.
          </div>
          <button
            type="button"
            className="v2-btn v2-btn-primary v2-btn-sm"
            onClick={() => setShowNewForm(true)}
          >
            <Plus size={13} /> New Agreement
          </button>
        </div>
      )}

      {/* Builder (only when agreement selected) */}
      {selectedId && (
        <div ref={editorRef}>
          {/* Eng-bar */}
          <div className="agr-eng-bar">
            {/* Team Member */}
            <div className="agr-eng-cell">
              <div className="agr-eng-label">Team Member</div>
              <div className="agr-eng-val">
                {selectedEngineer && (
                  <div className="agr-eng-avatar">{initials(selectedEngineer.fullName)}</div>
                )}
                <span>{selectedEngineer?.fullName ?? '—'}</span>
              </div>
            </div>
            {/* Job Role */}
            <div className="agr-eng-cell">
              <div className="agr-eng-label">Job Role</div>
              <div className="agr-eng-val">{selectedEngineer?.roleName ?? '—'}</div>
            </div>
            {/* Review Period */}
            <div className="agr-eng-cell">
              <div className="agr-eng-label">Review Period</div>
              <div className="agr-eng-val">
                <select
                  className="agr-eng-select"
                  value={periodKey}
                  onChange={e => setPeriodKey(e.target.value)}
                >
                  <option value="JAN-DEC-2026">Jan – Dec 2026</option>
                  <option value="Q2-2026">Q2 2026 (Apr – Jun)</option>
                  <option value="Q3-2026">Q3 2026 (Jul – Sep)</option>
                  <option value="JAN-DEC-2025">Jan – Dec 2025</option>
                </select>
              </div>
            </div>
            {/* Agreed On */}
            <div className="agr-eng-cell">
              <div className="agr-eng-label">Agreed on</div>
              <div className="agr-eng-val" style={{ fontSize: 12.5 }}>
                {selectedAgreement?.acceptedAt
                  ? new Date(selectedAgreement.acceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · Lead + Engineer'
                  : selectedAgreement?.submittedAt
                    ? new Date(selectedAgreement.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · Submitted'
                    : '—'}
              </div>
            </div>
            {/* Status */}
            <div className="agr-eng-cell">
              <div className="agr-eng-label">Status</div>
              <div className="agr-eng-val">
                {(() => {
                  const ag = allAgreements.find(a => a.id === selectedId);
                  if (!ag) return null;
                  const sp = STATUS_PILL[ag.status];
                  return <span className={sp.cls}><span className="dot" />{sp.label}</span>;
                })()}
              </div>
            </div>
            {/* Load template */}
            <div className="agr-eng-cell agr-eng-cell-last">
              <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm">
                <Copy size={11} /> Load template
              </button>
            </div>
          </div>

          {/* Tab strip */}
          <div className="agr-tabs">
            <button type="button" className={`agr-tab${activeTab === 'manual' ? ' active' : ''}`} onClick={() => setActiveTab('manual')}>
              <FilePenLine size={13} />
              Manual Entry
              <span className="agr-tab-count">{areas.length}</span>
            </button>
            <button type="button" className={`agr-tab${activeTab === 'upload' ? ' active' : ''}`} onClick={() => setActiveTab('upload')}>
              <Upload size={13} />
              Upload Document
            </button>
          </div>

          {/* Manual tab */}
          {activeTab === 'manual' && (
            <div className="agr-layout">
              {/* Left: area cards */}
              <div>
                {areas.map((area, idx) => (
                  <AreaCard
                    key={area.id}
                    area={area}
                    idx={idx}
                    color={AREA_COLORS[idx % AREA_COLORS.length] ?? '#4F46E5'}
                    onUpdate={(f, v) => updateArea(idx, f, v)}
                    onDelete={() => removeArea(idx)}
                    onAddMetric={() => addMetric(idx)}
                    onRemoveMetric={mi => removeMetric(idx, mi)}
                    onUpdateMetric={(mi, f, v) => updateMetric(idx, mi, f, v)}
                    onToggle={() => toggleArea(idx)}
                  />
                ))}
                <button type="button" className="agr-add-area-btn" onClick={addArea}>
                  <PlusCircle size={14} /> Add KPI Area
                </button>
              </div>

              {/* Right: weight sidebar */}
              <div className="agr-weight-sidebar">
                <div className="v2-card" style={{ marginBottom: 14 }}>
                  <div className="v2-card-header" style={{ padding: '12px 14px' }}>
                    <div className="v2-card-title" style={{ fontSize: '12.5px' }}>Weight Summary</div>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>/ 100.0 total</span>
                  </div>
                  <div className="v2-card-body" style={{ padding: 14 }}>
                    {/* Big total */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{
                          fontSize: 28, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1,
                          color: weightOk ? 'var(--green)' : totalWeight > 100 ? 'var(--red)' : '#ca8a04',
                        }}>
                          {totalWeight.toFixed(1)}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                          Total weight
                        </div>
                      </div>
                      {weightOk && (
                        <span className="v2-badge v2-badge-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={10} /> Balanced
                        </span>
                      )}
                    </div>

                    {/* Segmented bar */}
                    <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
                      {areas.map((a, i) => {
                        const w = totalWeight > 0 ? (areaTotal(a) / totalWeight) * 100 : 0;
                        return (
                          <div key={a.id} style={{ width: `${w}%`, background: AREA_COLORS[i % AREA_COLORS.length], borderRadius: 99 }} />
                        );
                      })}
                    </div>

                    {/* Per-area rows */}
                    {areas.map((a, i) => {
                      const total = areaTotal(a);
                      const pct = (total / 100) * 100;
                      const color = AREA_COLORS[i % AREA_COLORS.length] ?? '#4F46E5';
                      return (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 4 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {a.name || `Area ${i + 1}`}
                              </span>
                              <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-primary)' }}>{total.toFixed(1)}</span>
                            </div>
                            <div style={{ width: '100%', height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginTop: 3 }}>
                              <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 99 }} />
                            </div>
                            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{a.metrics.length} metric{a.metrics.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Validation note */}
                    <div
                      className={weightOk ? 'agr-weight-note ok' : 'agr-weight-note warn'}
                      style={{ marginTop: 12 }}
                    >
                      {weightOk
                        ? <><CheckCircle2 size={13} /> All weights sum to <strong>100.0</strong>. Ready to activate.</>
                        : <><AlertCircle size={13} /> Total is <strong>{totalWeight.toFixed(1)}</strong>. Weights must sum to 100.</>
                      }
                    </div>
                  </div>
                </div>

                {/* Sign-off */}
                <div className="v2-card" style={{ marginBottom: 14 }}>
                  <div className="v2-card-header" style={{ padding: '12px 14px' }}>
                    <div className="v2-card-title" style={{ fontSize: '12.5px' }}>Sign-off</div>
                  </div>
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Engineer row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="agr-avatar-sm" style={{ background: '#dbeafe', color: '#2563eb' }}>
                          {selectedEngineer ? initials(selectedEngineer.fullName) : '??'}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {selectedEngineer?.fullName ?? '—'}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Team Member</div>
                        </div>
                      </div>
                      {selectedAgreement?.status === 'ACTIVE' || selectedAgreement?.status === 'CLOSED'
                        ? <span className="v2-badge v2-badge-green" style={{ fontSize: 10 }}>Signed</span>
                        : <span style={{ fontSize: 11, color: 'var(--text-light)', fontStyle: 'italic' }}>Pending</span>
                      }
                    </div>
                    {/* Lead row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="agr-avatar-sm" style={{ background: '#dcfce7', color: '#16a34a' }}>
                          {selectedLead ? initials(selectedLead.fullName) : '??'}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {selectedLead?.fullName ?? '—'}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Team Lead</div>
                        </div>
                      </div>
                      <span className="v2-badge v2-badge-green" style={{ fontSize: 10 }}>Signed</span>
                    </div>
                    {/* Send for review button */}
                    {(selectedAgreement?.status === 'DRAFT' || selectedAgreement?.status === 'PENDING_REVIEW') && (
                      <button
                        type="button"
                        className="v2-btn v2-btn-secondary v2-btn-sm"
                        style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                        onClick={handleSubmit}
                      >
                        <Send size={11} /> Send to member for review
                      </button>
                    )}
                  </div>
                </div>

                {/* Lead Notes */}
                <div className="v2-card">
                  <div className="v2-card-header" style={{ padding: '12px 14px' }}>
                    <div className="v2-card-title" style={{ fontSize: '12.5px' }}>Lead Notes</div>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>private</span>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    <textarea
                      style={{
                        width: '100%', boxSizing: 'border-box', resize: 'none', height: 88,
                        fontSize: 12, padding: '7px 9px',
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-subtle)', fontFamily: 'inherit',
                        color: 'var(--text-primary)', outline: 'none',
                      }}
                      placeholder="Private notes visible only to you…"
                      value={leadNotes}
                      onChange={e => setLeadNotes(e.target.value)}
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Upload tab */}
          {activeTab === 'upload' && (
            <div className="v2-card" style={{ padding: 32, textAlign: 'center', marginTop: 0 }}>
              <div style={{
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '48px 32px',
                background: 'var(--bg-subtle)',
                cursor: 'pointer',
              }}>
                <div style={{
                  width: 44, height: 44,
                  background: 'white', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <Upload size={20} color="var(--indigo)" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Drop a file or click to browse
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Upload an existing KPI agreement document to extract metrics automatically
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                  {['.xlsx', '.csv', '.pdf', '.docx'].map(f => (
                    <span key={f} style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 4, background: 'white', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scoped styles */}
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
        .agr-eng-select {
          font-size: 13px; font-weight: 700;
          border: none; background: transparent; padding: 0;
          color: var(--text-primary); cursor: pointer;
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
        .agr-tabs {
          display: flex; border-bottom: 2px solid var(--border); margin-bottom: 20px;
        }
        .agr-tab {
          padding: 9px 18px; font-size: 13px; font-weight: 500;
          color: var(--text-muted); cursor: pointer; border: none; background: none;
          border-bottom: 2px solid transparent; margin-bottom: -2px;
          display: flex; align-items: center; gap: 6px; transition: color 0.13s;
        }
        .agr-tab.active { color: var(--indigo); font-weight: 700; border-bottom-color: var(--indigo); }
        .agr-tab:hover:not(.active) { color: var(--text-primary); }
        .agr-tab-count {
          font-size: 10.5px; font-weight: 700;
          background: var(--indigo); color: white;
          padding: 1px 6px; border-radius: 99px;
        }
        .agr-tab:not(.active) .agr-tab-count { background: var(--bg-subtle); color: var(--text-muted); }
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
          cursor: pointer; user-select: none;
        }
        .agr-area-num {
          width: 22px; height: 22px; background: var(--indigo); color: white;
          border-radius: 50%; font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .agr-area-name-inp {
          flex: 1; font-size: 13.5px; font-weight: 700;
          border: none; background: transparent; color: var(--text-primary);
          outline: none; cursor: text;
        }
        .agr-area-name-inp:focus {
          background: white; border: 1px solid var(--indigo);
          border-radius: var(--radius-xs); padding: 2px 8px;
          box-shadow: 0 0 0 3px #e0e7ff;
        }
        .agr-area-chip {
          font-size: 11.5px; font-weight: 700; padding: 3px 8px;
          border-radius: 4px; background: var(--bg); border: 1px solid var(--border);
          color: var(--text-muted); white-space: nowrap;
        }
        .agr-area-chip.ok { color: var(--green); background: var(--green-bg); border-color: #bbf7d0; }
        .agr-area-hdr-btn {
          width: 24px; height: 24px; border: none; background: none; cursor: pointer;
          color: var(--text-muted); display: flex; align-items: center; justify-content: center;
          border-radius: var(--radius-xs); flex-shrink: 0;
        }
        .agr-area-hdr-btn:hover { background: var(--border); color: var(--text-primary); }
        .agr-metric-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .agr-metric-table th {
          padding: 7px 10px; background: white;
          font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase; color: var(--text-light);
          border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap;
        }
        .agr-metric-table .th-num  { width: 28px; }
        .agr-metric-table .th-w    { width: 66px; text-align: center; }
        .agr-metric-table .th-period { width: 108px; }
        .agr-metric-table .th-target { width: 100px; }
        .agr-metric-table .th-del  { width: 32px; }
        .agr-metric-table td { padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
        .agr-metric-table tbody tr:last-child td { border-bottom: none; }
        .agr-metric-table tbody tr:hover td { background: #fafbff; }
        .agr-row-num {
          width: 18px; height: 18px; background: var(--bg-subtle);
          border: 1px solid var(--border); border-radius: 3px;
          font-size: 10px; font-weight: 700; color: var(--text-light);
          display: inline-flex; align-items: center; justify-content: center; margin-top: 3px;
        }
        .agr-metric-desc {
          width: 100%; box-sizing: border-box; resize: vertical;
          border: 1px solid transparent; border-radius: var(--radius-xs);
          padding: 4px 6px; font-size: 12.5px; color: var(--text-primary);
          background: transparent; font-family: inherit; line-height: 1.55;
          min-height: 48px; outline: none;
        }
        .agr-metric-desc:focus { border-color: var(--indigo); background: white; box-shadow: 0 0 0 2px #e0e7ff; }
        .agr-metric-desc::placeholder { color: var(--text-light); font-style: italic; }
        .agr-weight-inp {
          width: 52px; padding: 5px 6px; text-align: center;
          font-size: 13px; font-weight: 700; color: var(--text-primary);
          border: 1px solid var(--border); border-radius: var(--radius-xs); background: white;
        }
        .agr-period-sel, .agr-target-inp {
          font-size: 11.5px; padding: 5px 6px; width: 100%;
          border: 1px solid var(--border); border-radius: var(--radius-xs);
          background: white; color: var(--text-primary);
        }
        .agr-del-row-btn {
          width: 24px; height: 24px; border: none; background: none; cursor: pointer;
          color: var(--text-light); border-radius: var(--radius-xs);
          display: flex; align-items: center; justify-content: center; margin-top: 3px;
        }
        .agr-del-row-btn:hover { background: #fef2f2; color: #dc2626; }
        .agr-area-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 14px; border-top: 1px solid var(--border); background: var(--bg-subtle);
        }
        .agr-add-metric-btn {
          font-size: 12px; font-weight: 600; color: var(--indigo); background: none;
          border: 1px dashed #c7d2fe; border-radius: var(--radius-sm);
          padding: 5px 12px; cursor: pointer;
          display: flex; align-items: center; gap: 5px;
        }
        .agr-add-metric-btn:hover { background: var(--indigo-dim); }
        .agr-area-footer-total {
          font-size: 12px; color: var(--text-muted);
          display: flex; align-items: center; gap: 4px;
        }
        .agr-area-footer-total strong { font-size: 13px; font-weight: 800; color: var(--text-primary); }
        .agr-add-area-btn {
          width: 100%; padding: 14px;
          border: 2px dashed var(--border); background: none;
          border-radius: var(--radius-md); cursor: pointer;
          font-size: 13px; font-weight: 600; color: var(--text-muted);
          display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: all 0.13s; margin-bottom: 20px;
        }
        .agr-add-area-btn:hover { border-color: var(--indigo); color: var(--indigo); background: var(--indigo-dim); }
        .agr-weight-sidebar { position: sticky; top: calc(58px + 20px); }
        .agr-weight-note {
          font-size: 11.5px; padding: 9px 11px; border-radius: var(--radius-sm);
          display: flex; align-items: flex-start; gap: 7px; line-height: 1.5;
        }
        .agr-weight-note svg { flex-shrink: 0; margin-top: 1px; }
        .agr-weight-note.ok   { background: var(--green-bg); color: #166534; border: 1px solid #bbf7d0; }
        .agr-weight-note.warn { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
      `}</style>
    </div>
  );
}

