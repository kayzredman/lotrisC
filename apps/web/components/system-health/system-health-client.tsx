'use client';

import { useState, useCallback } from 'react';
import { useEventSource } from '@/hooks/useEventSource';
import { ServiceTable } from './service-table';
import { QueueDepths } from './queue-depths';
import { IncidentLog } from './incident-log';
import { DetailPanel } from './detail-panel';
import { RestartModal } from './restart-modal';
import {
  useHealthSnapshot,
  useHealthIncidents,
  useStoreHealth,
  useRepairStore,
  useRestartService,
} from '@/lib/api/hooks/useHealth';
import type { HealthSnapshot, ServiceHealthEntry } from '@lotris/types';
import { Pause, Play, Globe, Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw, Package, Wrench } from 'lucide-react';

export function SystemHealthClient() {
  const [paused, setPaused]           = useState(false);
  const [selectedService, setSelected] = useState<ServiceHealthEntry | null>(null);
  const [restartTarget, setRestart]    = useState<ServiceHealthEntry | null>(null);

  // ── SSE live stream ──────────────────────────────────────────────────────
  const { data: liveSnapshot, status: sseStatus } = useEventSource<HealthSnapshot>(
    'health/sse',
    { enabled: !paused },
  );

  // ── Polling fallback via tRPC (also seeds initial data) ──────────────────
  const { data: polledSnapshot } = useHealthSnapshot({
    refetchInterval: paused ? false : 5000,
    staleTime: 1000,
  });

  const snapshot: HealthSnapshot | null = (liveSnapshot ?? polledSnapshot ?? null) as HealthSnapshot | null;

  const { data: incidents } = useHealthIncidents(
    { limit: 20 },
    { refetchInterval: 30_000 },
  );

  // ── Derived summary ──────────────────────────────────────────────────────
  const upCount       = snapshot?.services.filter((s) => s.status === 'UP').length   ?? 0;
  const degradedCount = snapshot?.services.filter((s) => s.status === 'DEGRADED').length ?? 0;
  const downCount     = snapshot?.services.filter((s) => s.status === 'DOWN').length ?? 0;

  // ── Store health ─────────────────────────────────────────────────────────
  const storeHealthQuery = useStoreHealth({
    refetchInterval: (query) => {
      const state = query.state.data as { repairState?: string } | undefined;
      return state?.repairState === 'running' ? 5_000 : 30_000;
    },
  });
  const storeHealth = storeHealthQuery.data as {
    healthy: boolean;
    corruptedPackages: string[];
    repairState: 'idle' | 'running' | 'done' | 'error';
    startedAt?: string;
  } | undefined;

  const repairMutation = useRepairStore();
  const restartMutation = useRestartService();

  const handleRestartConfirm = useCallback(
    (serviceName: string) => {
      restartMutation.mutate({ serviceName });
      setRestart(null);
    },
    [restartMutation],
  );

  const isLive = sseStatus === 'connected' && !paused;

  return (
    <div>
      {/* Page header */}
      <div className="v2-page-header">
        <div>
          <h1>System Health</h1>
          <p>Live monitoring of all services, queues and infrastructure</p>
        </div>
        <div className="v2-page-header-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isLive ? 'var(--green)' : 'var(--text-muted)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: isLive ? 'var(--green)' : 'var(--text-light)', display: 'inline-block' }} />
            {isLive ? 'Live' : 'Paused'}
          </div>
          <button
            className="v2-btn v2-btn-secondary v2-btn-sm"
            onClick={() => setPaused(!paused)}
          >
            {paused ? <><Play size={12} /> Resume</> : <><Pause size={12} /> Pause</>}
          </button>
        </div>
      </div>

      {/* Status overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="v2-stat-card green" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
          <div className="v2-stat-icon-box green"><CheckCircle size={15} /></div>
          <div>
            <div className="v2-stat-value" style={{ fontSize: 22 }}>{upCount}</div>
            <div className="v2-stat-label">Services Up</div>
          </div>
        </div>
        <div className="v2-stat-card yellow" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
          <div className="v2-stat-icon-box yellow"><AlertTriangle size={15} /></div>
          <div>
            <div className="v2-stat-value" style={{ fontSize: 22 }}>{degradedCount}</div>
            <div className="v2-stat-label">Degraded</div>
          </div>
        </div>
        <div className="v2-stat-card red" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
          <div className="v2-stat-icon-box red"><XCircle size={15} /></div>
          <div>
            <div className="v2-stat-value" style={{ fontSize: 22 }}>{downCount}</div>
            <div className="v2-stat-label">Down</div>
          </div>
        </div>
      </div>

      {/* Services + queues */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Services</div>
            {isLive && <span style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw size={10} className="animate-spin" /> Live</span>}
          </div>
          <ServiceTable
            services={snapshot?.services ?? []}
            selected={selectedService}
            onSelect={setSelected}
            onRestart={setRestart}
          />
        </div>
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Queue Depths</div>
          </div>
          <QueueDepths queues={snapshot?.queues ?? []} />
        </div>
      </div>

      {/* Incident log */}
      <div className="v2-card" style={{ marginBottom: 16 }}>
        <div className="v2-card-header">
          <div className="v2-card-title">Recent Incidents</div>
        </div>
        <IncidentLog incidents={incidents ?? []} />
      </div>

      {/* Package store health */}
      <div className="v2-card">
        <div className="v2-card-header">
          <div className="v2-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={15} />
            Package Store Health
          </div>
          {storeHealth && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              background: storeHealth.repairState === 'running'
                ? 'var(--yellow-muted, rgba(234,179,8,0.15))'
                : storeHealth.repairState === 'done'
                  ? 'var(--green-muted, rgba(34,197,94,0.15))'
                  : storeHealth.repairState === 'error'
                    ? 'var(--red-muted, rgba(239,68,68,0.15))'
                    : storeHealth.healthy
                      ? 'var(--green-muted, rgba(34,197,94,0.15))'
                      : 'var(--red-muted, rgba(239,68,68,0.15))',
              color: storeHealth.repairState === 'running'
                ? 'var(--yellow, #ca8a04)'
                : storeHealth.repairState === 'done'
                  ? 'var(--green, #16a34a)'
                  : storeHealth.repairState === 'error'
                    ? 'var(--red, #dc2626)'
                    : storeHealth.healthy
                      ? 'var(--green, #16a34a)'
                      : 'var(--red, #dc2626)',
            }}>
              {storeHealth.repairState === 'running' && '⏳ Repairing…'}
              {storeHealth.repairState === 'done' && '✓ Repair Complete'}
              {storeHealth.repairState === 'error' && '✗ Repair Failed'}
              {storeHealth.repairState === 'idle' && (storeHealth.healthy ? '✓ Healthy' : `✗ ${storeHealth.corruptedPackages.length} corrupted`)}
            </span>
          )}
        </div>

        <div style={{ padding: '12px 16px' }}>
          {storeHealthQuery.isPending && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Checking store status…</p>
          )}

          {storeHealth?.repairState === 'running' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
              <RefreshCw size={14} className="animate-spin" />
              Running <code style={{ fontSize: 12 }}>pnpm install --force</code> — started {storeHealth.startedAt ? new Date(storeHealth.startedAt).toLocaleTimeString() : '…'}. This takes 2–4 minutes.
            </div>
          )}

          {storeHealth?.repairState === 'done' && (
            <p style={{ fontSize: 13, color: 'var(--green, #16a34a)', margin: 0 }}>
              Store repair completed successfully. All packages are healthy.
            </p>
          )}

          {storeHealth?.repairState === 'error' && (
            <p style={{ fontSize: 13, color: 'var(--red, #dc2626)', margin: 0 }}>
              Repair failed — check API logs for details. You can retry below.
            </p>
          )}

          {(storeHealth?.repairState === 'idle' || storeHealth?.repairState === 'error') && !storeHealth?.healthy && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 0, marginBottom: 8 }}>
                The following packages have integrity issues in the pnpm store:
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 12, color: 'var(--text-muted)' }}>
                {storeHealth.corruptedPackages.slice(0, 10).map((pkg) => (
                  <li key={pkg} style={{ fontFamily: 'monospace', marginBottom: 2 }}>{pkg}</li>
                ))}
                {storeHealth.corruptedPackages.length > 10 && (
                  <li style={{ color: 'var(--text-muted)' }}>…and {storeHealth.corruptedPackages.length - 10} more</li>
                )}
              </ul>
            </div>
          )}

          {(storeHealth?.repairState === 'idle' || storeHealth?.repairState === 'error') && storeHealth?.healthy && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              No integrity issues detected. All packages in the pnpm store are intact.
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: storeHealth?.repairState === 'idle' || storeHealth?.repairState === 'error' ? 14 : 10 }}>
            {(storeHealth?.repairState === 'idle' || storeHealth?.repairState === 'error') && (
              <button
                type="button"
                className="v2-btn v2-btn-primary v2-btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => repairMutation.mutate(undefined, { onSuccess: () => void storeHealthQuery.refetch() })}
                disabled={repairMutation.isPending || storeHealth?.healthy === true}
                title={storeHealth?.healthy ? 'Store is healthy — no repair needed' : 'Run pnpm install --force to restore store integrity'}
              >
                <Wrench size={12} />
                {repairMutation.isPending ? 'Starting…' : 'Repair Store'}
              </button>
            )}
            {repairMutation.data !== undefined && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Repair started</span>
            )}
            {repairMutation.error && (
              <span style={{ fontSize: 12, color: 'var(--red, #dc2626)' }}>
                {repairMutation.error instanceof Error ? repairMutation.error.message : 'Failed to start repair'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Drawers / modals */}
      {selectedService && (
        <DetailPanel service={selectedService} onRestart={setRestart} />
      )}
      {restartTarget && (
        <RestartModal
          service={restartTarget}
          onConfirm={handleRestartConfirm}
          onCancel={() => setRestart(null)}
          isPending={restartMutation.isPending}
        />
      )}
    </div>
  );
}
