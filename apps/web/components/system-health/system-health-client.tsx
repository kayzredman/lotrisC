'use client';

import { useState, useCallback } from 'react';
import { useEventSource } from '@/hooks/useEventSource';
import { ServiceTable } from './service-table';
import { QueueDepths } from './queue-depths';
import { IncidentLog } from './incident-log';
import { DetailPanel } from './detail-panel';
import { RestartModal } from './restart-modal';
import { trpc } from '@/lib/trpc';
import type { HealthSnapshot, ServiceHealthEntry } from '@lotris/types';
import { Pause, Play, Globe, Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

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
  const { data: polledSnapshot } = (trpc as any)['health.getSnapshot'].useQuery(undefined, {
    refetchInterval: paused ? false : 5000,
    staleTime: 1000,
  });

  // Prefer SSE data; fall back to polled
  const snapshot: HealthSnapshot | null = liveSnapshot ?? polledSnapshot ?? null;

  // ── Incident log ─────────────────────────────────────────────────────────
  const { data: incidents } = (trpc as any)['health.getIncidents'].useQuery(
    { limit: 20 },
    { refetchInterval: 30_000 },
  );

  // ── Derived summary ──────────────────────────────────────────────────────
  const upCount       = snapshot?.services.filter((s) => s.status === 'UP').length   ?? 0;
  const degradedCount = snapshot?.services.filter((s) => s.status === 'DEGRADED').length ?? 0;
  const downCount     = snapshot?.services.filter((s) => s.status === 'DOWN').length ?? 0;

  // ── Restart mutation ─────────────────────────────────────────────────────
  const restartMutation = (trpc as any)['health.restartService'].useMutation();

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
      <div className="v2-card">
        <div className="v2-card-header">
          <div className="v2-card-title">Recent Incidents</div>
        </div>
        <IncidentLog incidents={incidents ?? []} />
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
