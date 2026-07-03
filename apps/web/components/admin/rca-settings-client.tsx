'use client';

import { useEffect, useState } from 'react';
import { useRcaSettings, useUpdateRcaSettings } from '@/lib/api/hooks/useRcaSettings';

export default function RcaSettingsClient() {
  const { data: settings, isLoading } = useRcaSettings();
  const updateMutation = useUpdateRcaSettings();
  const [form, setForm] = useState({
    autoP1: true,
    autoP2: false,
    autoP2SlaBreach: false,
    autoSecurity: false,
    recurrenceThreshold: 3,
    recurrenceWindowDays: 90,
    rcaCompletionDays: 5,
  });

  useEffect(() => {
    if (settings) {
      const s = settings as Record<string, unknown>;
      setForm({
        autoP1: Boolean(s.autoP1 ?? true),
        autoP2: Boolean(s.autoP2),
        autoP2SlaBreach: Boolean(s.autoP2SlaBreach),
        autoSecurity: Boolean(s.autoSecurity),
        recurrenceThreshold: Number(s.recurrenceThreshold ?? 3),
        recurrenceWindowDays: Number(s.recurrenceWindowDays ?? 90),
        rcaCompletionDays: Number(s.rcaCompletionDays ?? 5),
      });
    }
  }, [settings]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate(form);
  }

  return (
    <div>
      <div className="v2-page-header">
        <div>
          <h1>RCA Settings</h1>
          <p>Configure auto-trigger rules and completion SLAs for root cause analysis</p>
        </div>
      </div>

      <form className="v2-card" onSubmit={handleSave}>
        <div className="v2-card-header">
          <div className="v2-card-title">Trigger rules</div>
        </div>
        <div className="v2-card-body">
          {isLoading ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading settings…</p>
          ) : (
            <div style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
              {[
                { key: 'autoP1', label: 'Auto-create RCA on P1 (Critical) ticket close', hint: 'Default on — only P1 triggers automatically' },
                { key: 'autoP2', label: 'Auto-create RCA on P2 (High) ticket close', hint: 'Off by default' },
                { key: 'autoP2SlaBreach', label: 'Auto-create RCA on P2 SLA breach', hint: '' },
                { key: 'autoSecurity', label: 'Auto-create RCA on security incidents', hint: 'Future: security category flag' },
              ].map((item) => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form[item.key as keyof typeof form] as boolean}
                    onChange={(e) => setForm((p) => ({ ...p, [item.key]: e.target.checked }))}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                    {item.hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.hint}</div>}
                  </div>
                </label>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 8 }}>
                {[
                  { key: 'recurrenceThreshold', label: 'Recurrence threshold' },
                  { key: 'recurrenceWindowDays', label: 'Recurrence window (days)' },
                  { key: 'rcaCompletionDays', label: 'RCA completion SLA (days)' },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>{f.label}</label>
                    <input
                      type="number"
                      min={1}
                      value={form[f.key as keyof typeof form] as number}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
                    />
                  </div>
                ))}
              </div>

              <button type="submit" className="v2-btn v2-btn-primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save settings'}
              </button>
              {updateMutation.isSuccess && (
                <p style={{ fontSize: 12, color: 'var(--green)' }}>Settings saved.</p>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
