'use client';

import { useEffect, useState } from 'react';
import {
  ANALYTICS_JOB_LABELS,
  useAnalyticsJobConfig,
  useAnalyticsJobStatus,
  usePatchAnalyticsJobConfig,
  useRunAnalyticsJob,
  type PatchAnalyticsJobConfigInput,
} from '@/lib/api/hooks/useAnalyticsJobs';
import { BarChart3, Play, Save } from 'lucide-react';
import { StatusBadge } from './service-table';

const JOB_KEYS = Object.keys(ANALYTICS_JOB_LABELS);

export function AnalyticsJobsPanel() {
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useAnalyticsJobConfig();
  const { data: statuses, isLoading: statusLoading, refetch: refetchStatus } = useAnalyticsJobStatus();
  const patchMutation = usePatchAnalyticsJobConfig();
  const runMutation = useRunAnalyticsJob();

  const [form, setForm] = useState<PatchAnalyticsJobConfigInput>({});
  const [batchTimesText, setBatchTimesText] = useState('08:00, 18:00');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    setForm({
      incrementalRollupEnabled: config.incrementalRollupEnabled,
      incrementalRollupIntervalMinutes: config.incrementalRollupIntervalMinutes,
      dailyBatchEnabled: config.dailyBatchEnabled,
      kpiTrendScanEnabled: config.kpiTrendScanEnabled,
      kpiTrendIntervalMinutes: config.kpiTrendIntervalMinutes,
      slaPredictorEnabled: config.slaPredictorEnabled,
      slaPredictorIntervalMinutes: config.slaPredictorIntervalMinutes,
      dashboardCacheTtlSeconds: config.dashboardCacheTtlSeconds,
    });
    setBatchTimesText(config.dailyBatchTimesUtc.join(', '));
  }, [config]);

  const statusByKey = Object.fromEntries((statuses ?? []).map((s) => [s.jobKey, s]));

  function handleSave() {
    setSaveMessage(null);
    const times = batchTimesText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    patchMutation.mutate(
      { ...form, dailyBatchTimesUtc: times },
      {
        onSuccess: () => {
          setSaveMessage('Config saved — Hangfire schedules updated.');
          void refetchConfig();
          void refetchStatus();
        },
        onError: (err) => setSaveMessage(err.message),
      },
    );
  }

  function handleRunNow(jobKey: string) {
    setRunMessage(null);
    runMutation.mutate(jobKey, {
      onSuccess: () => {
        setRunMessage(`Enqueued ${ANALYTICS_JOB_LABELS[jobKey] ?? jobKey}.`);
        void refetchStatus();
      },
      onError: (err) => setRunMessage(err.message),
    });
  }

  const loading = configLoading || statusLoading;

  return (
    <div className="v2-card" style={{ marginBottom: 16 }}>
      <div className="v2-card-header">
        <div className="v2-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={15} />
          Analytics &amp; ETL Jobs
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Rollup intervals bounded by platform guardrails (2–60 min)
        </span>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {loading && !config && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Loading job config…</p>
        )}

        {config && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              <label style={{ fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={form.incrementalRollupEnabled ?? false}
                    onChange={(e) => setForm((f) => ({ ...f, incrementalRollupEnabled: e.target.checked }))}
                  />
                  Incremental rollup
                </span>
                <input
                  type="number"
                  min={2}
                  max={60}
                  className="v2-input"
                  style={{ width: '100%' }}
                  value={form.incrementalRollupIntervalMinutes ?? 5}
                  onChange={(e) => setForm((f) => ({ ...f, incrementalRollupIntervalMinutes: Number(e.target.value) }))}
                />
                <span style={{ color: 'var(--text-muted)' }}> minutes</span>
              </label>

              <label style={{ fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={form.dailyBatchEnabled ?? false}
                    onChange={(e) => setForm((f) => ({ ...f, dailyBatchEnabled: e.target.checked }))}
                  />
                  Daily batch (UTC times)
                </span>
                <input
                  type="text"
                  className="v2-input"
                  style={{ width: '100%' }}
                  placeholder="08:00, 18:00"
                  value={batchTimesText}
                  onChange={(e) => setBatchTimesText(e.target.value)}
                />
              </label>

              <label style={{ fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={form.kpiTrendScanEnabled ?? false}
                    onChange={(e) => setForm((f) => ({ ...f, kpiTrendScanEnabled: e.target.checked }))}
                  />
                  KPI trend scan
                </span>
                <input
                  type="number"
                  min={2}
                  max={60}
                  className="v2-input"
                  style={{ width: '100%' }}
                  value={form.kpiTrendIntervalMinutes ?? 30}
                  onChange={(e) => setForm((f) => ({ ...f, kpiTrendIntervalMinutes: Number(e.target.value) }))}
                />
                <span style={{ color: 'var(--text-muted)' }}> minutes</span>
              </label>

              <label style={{ fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={form.slaPredictorEnabled ?? false}
                    onChange={(e) => setForm((f) => ({ ...f, slaPredictorEnabled: e.target.checked }))}
                  />
                  SLA predictor scan
                </span>
                <input
                  type="number"
                  min={2}
                  max={60}
                  className="v2-input"
                  style={{ width: '100%' }}
                  value={form.slaPredictorIntervalMinutes ?? 5}
                  onChange={(e) => setForm((f) => ({ ...f, slaPredictorIntervalMinutes: Number(e.target.value) }))}
                />
                <span style={{ color: 'var(--text-muted)' }}> minutes</span>
              </label>

              <label style={{ fontSize: 12 }}>
                Dashboard cache TTL
                <input
                  type="number"
                  min={10}
                  max={300}
                  className="v2-input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={form.dashboardCacheTtlSeconds ?? 30}
                  onChange={(e) => setForm((f) => ({ ...f, dashboardCacheTtlSeconds: Number(e.target.value) }))}
                />
                <span style={{ color: 'var(--text-muted)' }}> seconds</span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                className="v2-btn v2-btn-primary v2-btn-sm"
                disabled={patchMutation.isPending}
                onClick={handleSave}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Save size={12} />
                {patchMutation.isPending ? 'Saving…' : 'Save config'}
              </button>
              {saveMessage && (
                <span style={{ fontSize: 12, color: saveMessage.startsWith('Config') ? 'var(--green)' : 'var(--red)' }}>
                  {saveMessage}
                </span>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="w-full" style={{ fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px' }}>Job</th>
                    <th style={{ padding: '6px 8px' }}>Status</th>
                    <th style={{ padding: '6px 8px' }}>Last run</th>
                    <th style={{ padding: '6px 8px' }}>Duration</th>
                    <th style={{ padding: '6px 8px' }}>Error</th>
                    <th style={{ padding: '6px 8px' }} />
                  </tr>
                </thead>
                <tbody>
                  {JOB_KEYS.map((key) => {
                    const row = statusByKey[key];
                    const enabled = row?.enabled ?? false;
                    return (
                      <tr key={key} style={{ borderBottom: '1px solid var(--border-subtle, var(--border))' }}>
                        <td style={{ padding: '8px' }}>{ANALYTICS_JOB_LABELS[key]}</td>
                        <td style={{ padding: '8px' }}>
                          <StatusBadge status={enabled ? (row?.lastError ? 'DEGRADED' : 'UP') : 'DOWN'} />
                        </td>
                        <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                          {row?.lastRunAt ? new Date(row.lastRunAt).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                          {row?.lastDurationMs != null ? `${row.lastDurationMs}ms` : '—'}
                        </td>
                        <td style={{ padding: '8px', color: 'var(--red)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row?.lastError ?? '—'}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <button
                            type="button"
                            className="v2-btn v2-btn-sm"
                            disabled={runMutation.isPending || !enabled}
                            onClick={() => handleRunNow(key)}
                            title={enabled ? 'Run now (60s cooldown per job)' : 'Enable job in config first'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Play size={10} /> Run now
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {runMessage && (
              <p style={{ fontSize: 12, marginTop: 10, marginBottom: 0, color: 'var(--text-muted)' }}>{runMessage}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
