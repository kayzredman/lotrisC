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
import { Pause, Play, Globe, Activity } from 'lucide-react';

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
            onSelectService={setSelected}
            onRestartService={setRestart}
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
        <DetailPanel service={selectedService} onClose={() => setSelected(null)} />
      )}
      {restartTarget && (
        <RestartModal
          service={restartTarget}
          onConfirm={handleRestartConfirm}
          onCancel={() => setRestart(null)}
        />
      )}
    </div>
  );
}

      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">System Health</h1>
          <p className="text-xs text-slate-500 mt-0.5">Admin / System Health</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live · 1s refresh
            </span>
          )}
          {paused && (
            <span className="text-xs text-slate-500 font-medium">Paused</span>
          )}
          <button
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
          >
            {paused
              ? <><Play className="w-3.5 h-3.5" /> Resume</>
              : <><Pause className="w-3.5 h-3.5" /> Pause</>
            }
          </button>
          <a
            href="https://status.lotris.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            <Globe className="w-3.5 h-3.5" /> Status Page
          </a>
        </div>
      </div>

      {/* ── Summary chips ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-5">
        {upCount > 0 && (
          <SummaryChip color="green" label={`${upCount} Service${upCount !== 1 ? 's' : ''} UP`} />
        )}
        {degradedCount > 0 && (
          <SummaryChip color="yellow" label={`${degradedCount} Degraded`} />
        )}
        {downCount > 0 && (
          <SummaryChip color="red" label={`${downCount} Down`} />
        )}
        {!snapshot && (
          <SummaryChip color="gray" label="Loading…" />
        )}
      </div>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <ServiceTable
            services={snapshot?.services ?? []}
            selected={selectedService}
            onSelect={setSelected}
            onRestart={setRestart}
          />
          <QueueDepths queues={snapshot?.queues ?? []} />
          <IncidentLog incidents={incidents ?? []} />
        </div>

        {/* Right column — Detail panel */}
        <div>
          <DetailPanel
            service={selectedService}
            onRestart={setRestart}
          />
        </div>
      </div>

      {/* ── Restart confirm modal ─────────────────────────────────────────── */}
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

// ── Summary chip ──────────────────────────────────────────────────────────────

function SummaryChip({ color, label }: { color: 'green' | 'yellow' | 'red' | 'gray'; label: string }) {
  const colors = {
    green:  'bg-green-950 text-green-400 border-green-800',
    yellow: 'bg-yellow-950 text-yellow-400 border-yellow-800',
    red:    'bg-red-950   text-red-400   border-red-800',
    gray:   'bg-slate-800 text-slate-400 border-slate-700',
  };
  const dotColors = {
    green: 'bg-green-400', yellow: 'bg-yellow-400', red: 'bg-red-400', gray: 'bg-slate-400',
  };
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[color]}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[color]}`} />
      {label}
    </div>
  );
}
