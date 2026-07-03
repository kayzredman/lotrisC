'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCurrentUser, useUsersList } from '@/lib/api/hooks/useAuth';
import {
  useAddRcaAction,
  useDelegateRca,
  usePublishRca,
  useRca,
  useSubmitRca,
  useUpdateRca,
} from '@/lib/api/hooks/useRca';
import { useRcaSuggest } from '@/lib/api/hooks/useIntelligence';
import { EmptyState } from '@/components/ui/empty-state';
import { ArrowLeft, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';

const STEPS = [
  { id: 'incident', label: 'Incident', sub: 'Summary & impact' },
  { id: 'root', label: 'Root Cause', sub: 'Brief analysis' },
  { id: 'capa', label: 'CAPA', sub: 'Corrective & preventive' },
  { id: 'review', label: 'Review', sub: 'Submit & publish' },
] as const;

const LEAD_ROLES = ['SUPERADMIN', 'ADMIN', 'IT_MANAGER', 'TEAM_LEAD'];

const STATUS_PIPELINE = ['DRAFT', 'IN_REVIEW', 'PUBLISHED'];

type RcaWizardProps = { rcaId: string };

export default function RcaWizard({ rcaId }: RcaWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({});
  const [actionForm, setActionForm] = useState({ actionType: 'CORRECTIVE', description: '', ownerId: '', dueAt: '' });
  const [delegateId, setDelegateId] = useState('');

  const { data: me } = useCurrentUser();
  const { data: users } = useUsersList();
  const { data: rca, isLoading, refetch } = useRca(rcaId);
  const updateMutation = useUpdateRca();
  const submitMutation = useSubmitRca();
  const publishMutation = usePublishRca();
  const delegateMutation = useDelegateRca();
  const addActionMutation = useAddRcaAction();
  const suggestMutation = useRcaSuggest();

  const isLead = LEAD_ROLES.includes(me?.roleName ?? '');
  const r = rca as Record<string, unknown> | undefined;
  const canEdit = isLead || r?.delegateId === me?.id;
  const status = String(r?.status ?? 'DRAFT');

  function field(name: string, fallback?: unknown) {
    return form[name] ?? String(fallback ?? '');
  }

  function setField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function saveFields(fields: Record<string, string | undefined>) {
    const body: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) body[k] = v || undefined;
    }
    await updateMutation.mutateAsync({ id: rcaId, ...body });
    void refetch();
  }

  function handleSaveIncident() {
    saveFields({
      incidentSummary: field('incidentSummary', r?.incidentSummary),
      businessImpact: field('businessImpact', r?.businessImpact),
      detectionMethod: field('detectionMethod', r?.detectionMethod),
      resolutionSummary: field('resolutionSummary', r?.resolutionSummary),
    });
  }

  function handleSaveRootCause() {
    saveFields({
      immediateCause: field('immediateCause', r?.immediateCause),
      rootCauseStatement: field('rootCauseStatement', r?.rootCauseStatement),
      contributingFactors: field('contributingFactors', r?.contributingFactors),
      lessonsLearned: field('lessonsLearned', r?.lessonsLearned),
    });
  }

  function handleAddAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionForm.description.trim() || !actionForm.ownerId) return;
    addActionMutation.mutate(
      {
        rcaId,
        actionType: actionForm.actionType,
        description: actionForm.description.trim(),
        ownerId: actionForm.ownerId,
        dueAt: actionForm.dueAt || undefined,
      },
      {
        onSuccess: () => {
          setActionForm({ actionType: 'CORRECTIVE', description: '', ownerId: '', dueAt: '' });
          void refetch();
        },
      },
    );
  }

  const actions = (r?.actions ?? []) as Array<Record<string, unknown>>;

  if (isLoading) {
    return <EmptyState title="Loading RCA…" />;
  }

  if (!r) {
    return <EmptyState title="RCA not found" message="This record may have been removed or you lack access." />;
  }

  return (
    <div>
      <div className="v2-page-header">
        <div>
          <Link href="/problems" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            <ArrowLeft size={12} /> Back to Problems
          </Link>
          <h1>{String(r.rcaRef)} — {String(r.problemTitle)}</h1>
          <p>Problem {String(r.problemRef)} · {status.replace('_', ' ')}</p>
        </div>
        <div className="v2-page-header-actions">
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_PIPELINE.map((s, i) => (
              <span
                key={s}
                className={`v2-badge ${status === s ? 'v2-badge-indigo' : i < STATUS_PIPELINE.indexOf(status) ? 'v2-badge-green' : 'v2-badge-gray'}`}
                style={{ fontSize: 10 }}
              >
                {s.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 280px', gap: 16, alignItems: 'start' }}>
        {/* Steps */}
        <div className="v2-card" style={{ padding: 0, overflow: 'hidden' }}>
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(i)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '12px 14px',
                border: 'none', borderLeft: step === i ? '3px solid var(--indigo)' : '3px solid transparent',
                background: step === i ? 'var(--indigo-dim)' : 'transparent', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
                background: i < step ? 'var(--green)' : step === i ? 'var(--indigo)' : 'transparent',
                color: i <= step ? '#fff' : 'var(--text-muted)',
              }}>
                {i < step ? <CheckCircle2 size={12} /> : i + 1}
              </span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Main panel */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">{STEPS[step].label}</div>
          </div>
          <div className="v2-card-body">
            {step === 0 && (
              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  { key: 'incidentSummary', label: 'Incident summary', rows: 3 },
                  { key: 'businessImpact', label: 'Business impact', rows: 2 },
                  { key: 'detectionMethod', label: 'How detected', rows: 2 },
                  { key: 'resolutionSummary', label: 'Resolution summary', rows: 3 },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>{f.label}</label>
                    <textarea
                      rows={f.rows}
                      disabled={!canEdit}
                      value={field(f.key, r[f.key])}
                      onChange={(e) => setField(f.key, e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, resize: 'vertical' }}
                    />
                  </div>
                ))}
                {canEdit && (
                  <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={handleSaveIncident} disabled={updateMutation.isPending}>
                    Save incident details
                  </button>
                )}
              </div>
            )}

            {step === 1 && (
              <div style={{ display: 'grid', gap: 14 }}>
                {canEdit && (
                  <button
                    type="button"
                    className="v2-btn v2-btn-secondary v2-btn-sm"
                    style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: 6 }}
                    disabled={suggestMutation.isPending}
                    onClick={() =>
                      suggestMutation.mutate(
                        { rcaId },
                        {
                          onSuccess: (s) => {
                            const data = s as Record<string, unknown>;
                            if (data.incidentSummary) setField('incidentSummary', String(data.incidentSummary));
                            if (data.immediateCause) setField('immediateCause', String(data.immediateCause));
                            if (data.rootCauseStatement) setField('rootCauseStatement', String(data.rootCauseStatement));
                            if (data.contributingFactors) setField('contributingFactors', String(data.contributingFactors));
                            if (data.resolutionSummary) setField('resolutionSummary', String(data.resolutionSummary));
                          },
                        },
                      )
                    }
                  >
                    <Sparkles size={12} /> {suggestMutation.isPending ? 'Suggesting…' : 'AI suggest (copilot)'}
                  </button>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Immediate cause</label>
                  <textarea
                    rows={2}
                    disabled={!canEdit}
                    value={field('immediateCause', r.immediateCause)}
                    onChange={(e) => setField('immediateCause', e.target.value)}
                    placeholder="What directly caused the incident?"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Root cause statement</label>
                  <textarea
                    rows={3}
                    disabled={!canEdit}
                    value={field('rootCauseStatement', r.rootCauseStatement)}
                    onChange={(e) => setField('rootCauseStatement', e.target.value)}
                    placeholder="Underlying reason this happened"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Contributing factors (optional)</label>
                  <textarea
                    rows={2}
                    disabled={!canEdit}
                    value={field('contributingFactors', r.contributingFactors)}
                    onChange={(e) => setField('contributingFactors', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Lessons learned</label>
                  <textarea
                    rows={2}
                    disabled={!canEdit}
                    value={field('lessonsLearned', r.lessonsLearned)}
                    onChange={(e) => setField('lessonsLearned', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
                  />
                </div>
                {canEdit && (
                  <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={handleSaveRootCause} disabled={updateMutation.isPending}>
                    Save root cause
                  </button>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                {canEdit && (
                  <form onSubmit={handleAddAction} style={{ marginBottom: 20, padding: 14, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Add CAPA action</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <select
                        value={actionForm.actionType}
                        onChange={(e) => setActionForm((p) => ({ ...p, actionType: e.target.value }))}
                        className="v2-select"
                      >
                        <option value="CORRECTIVE">Corrective</option>
                        <option value="PREVENTIVE">Preventive</option>
                      </select>
                      <select
                        value={actionForm.ownerId}
                        onChange={(e) => setActionForm((p) => ({ ...p, ownerId: e.target.value }))}
                        className="v2-select"
                      >
                        <option value="">— Owner —</option>
                        {users?.map((u) => (
                          <option key={u.id as string} value={u.id as string}>{u.fullName as string}</option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      value={actionForm.description}
                      onChange={(e) => setActionForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Action description"
                      style={{ width: '100%', marginBottom: 10, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
                    />
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        type="date"
                        value={actionForm.dueAt}
                        onChange={(e) => setActionForm((p) => ({ ...p, dueAt: e.target.value }))}
                        style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}
                      />
                      <button type="submit" className="v2-btn v2-btn-primary v2-btn-sm" disabled={addActionMutation.isPending}>Add action</button>
                    </div>
                  </form>
                )}
                {actions.length === 0 ? (
                  <EmptyState title="No CAPA actions yet" message="Add corrective and preventive actions with owners and due dates." />
                ) : (
                  <table className="v2-table">
                    <thead>
                      <tr><th>Type</th><th>Description</th><th>Owner</th><th>Due</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {actions.map((a) => (
                        <tr key={String(a.id)}>
                          <td><span className="v2-badge v2-badge-indigo" style={{ fontSize: 10 }}>{String(a.actionType)}</span></td>
                          <td style={{ fontSize: 12 }}>{String(a.description)}</td>
                          <td style={{ fontSize: 12 }}>{String(a.ownerName ?? '—')}</td>
                          <td style={{ fontSize: 12 }}>{a.dueAt ? new Date(String(a.dueAt)).toLocaleDateString() : '—'}</td>
                          <td><span className="v2-badge v2-badge-gray" style={{ fontSize: 10 }}>{String(a.status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {step === 3 && (
              <div style={{ display: 'grid', gap: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Submit for review when incident and root cause sections are complete. Publishing creates a Known Error entry in the knowledge base.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {canEdit && status === 'DRAFT' && (
                    <button
                      type="button"
                      className="v2-btn v2-btn-secondary v2-btn-sm"
                      disabled={submitMutation.isPending}
                      onClick={() => submitMutation.mutate({ id: rcaId }, { onSuccess: () => void refetch() })}
                    >
                      Submit for review
                    </button>
                  )}
                  {isLead && status === 'IN_REVIEW' && (
                    <button
                      type="button"
                      className="v2-btn v2-btn-primary v2-btn-sm"
                      disabled={publishMutation.isPending}
                      onClick={() => publishMutation.mutate({ id: rcaId }, { onSuccess: () => void refetch() })}
                    >
                      Publish to Knowledge Base
                    </button>
                  )}
                  {status === 'PUBLISHED' && (
                    <span className="v2-badge v2-badge-green">Published — visible in Knowledge</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-subtle)' }}>
            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Previous</button>
            <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm" disabled={step >= STEPS.length - 1} onClick={() => setStep((s) => s + 1)}>
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Context sidebar */}
        <div>
          <div className="v2-card" style={{ marginBottom: 12 }}>
            <div className="v2-card-header"><div className="v2-card-title" style={{ fontSize: 11 }}>Owners</div></div>
            <div className="v2-card-body" style={{ fontSize: 12 }}>
              <div style={{ marginBottom: 8 }}><span style={{ color: 'var(--text-muted)' }}>Process</span><br />{String(r.processOwnerName ?? '—')}</div>
              <div style={{ marginBottom: 8 }}><span style={{ color: 'var(--text-muted)' }}>Technical</span><br />{String(r.technicalOwnerName ?? '—')}</div>
              {r.delegateName ? (
                <div><span style={{ color: 'var(--text-muted)' }}>Delegate</span><br />{String(r.delegateName)}</div>
              ) : null}
              {isLead && status !== 'PUBLISHED' && (
                <div style={{ marginTop: 12 }}>
                  <select
                    value={delegateId}
                    onChange={(e) => setDelegateId(e.target.value)}
                    className="v2-select"
                    style={{ width: '100%', marginBottom: 6 }}
                  >
                    <option value="">Assign delegate…</option>
                    {users?.filter((u) => u.roleName === 'ENGINEER').map((u) => (
                      <option key={u.id as string} value={u.id as string}>{u.fullName as string}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="v2-btn v2-btn-secondary v2-btn-sm"
                    disabled={!delegateId || delegateMutation.isPending}
                    onClick={() => delegateMutation.mutate({ id: rcaId, delegateId }, { onSuccess: () => void refetch() })}
                  >
                    Delegate RCA
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="v2-card">
            <div className="v2-card-header"><div className="v2-card-title" style={{ fontSize: 11 }}>Linked tickets</div></div>
            <div className="v2-card-body" style={{ fontSize: 12 }}>
              {((r.linkedTickets ?? []) as Array<Record<string, unknown>>).length === 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>No linked tickets</span>
              ) : (
                ((r.linkedTickets ?? []) as Array<Record<string, unknown>>).map((t) => (
                  <div key={String(t.ticketId)} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 500 }}>{String(t.ticketTitle ?? t.ticketId)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{String(t.linkType)} · P{String(t.ticketPriority ?? '?')}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
