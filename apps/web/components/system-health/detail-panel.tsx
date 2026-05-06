'use client';

import type { ServiceHealthEntry } from '@lotris/types';
import { Activity, RefreshCw, TestTube2 } from 'lucide-react';
import { StatusBadge } from './service-table';

interface DetailPanelProps {
  service: ServiceHealthEntry | null;
  onRestart: (s: ServiceHealthEntry) => void;
}

const DB_SERVICES = new Set(['mssql-db', 'postgres-analytics']);

export function DetailPanel({ service, onRestart }: DetailPanelProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          {service ? service.name : 'Select a service'}
        </div>
        {service && <StatusBadge status={service.status} />}
      </div>

      {/* Body */}
      <div className="p-4">
        {!service ? (
          <p className="text-sm text-slate-500 text-center py-8">
            Click any row in the process table to view live metrics and controls.
          </p>
        ) : (
          <ServiceDetail service={service} onRestart={onRestart} />
        )}
      </div>
    </div>
  );
}

function ServiceDetail({
  service, onRestart,
}: {
  service: ServiceHealthEntry;
  onRestart: (s: ServiceHealthEntry) => void;
}) {
  const isDb    = DB_SERVICES.has(service.id);
  const memPct  = service.memTotalMb > 0 ? Math.round((service.memUsedMb / service.memTotalMb) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox label="CPU" value={service.cpu > 0 ? `${service.cpu}%` : '—'} />
        <StatBox
          label="Memory"
          value={service.memUsedMb > 0 ? `${service.memUsedMb} MB` : '—'}
          sub={service.memTotalMb > 0 && service.memUsedMb > 0 ? `${memPct}% of ${service.memTotalMb}MB` : undefined}
        />
        <StatBox
          label="Uptime"
          value={service.uptimeSeconds > 0 ? formatUptime(service.uptimeSeconds) : '—'}
        />
        <StatBox
          label="Last Ping"
          value={service.lastPingMs < 0 ? 'unreachable' : service.lastPingMs === 0 ? '—' : `${service.lastPingMs}ms`}
        />
      </div>

      {/* Checked at */}
      <div className="text-[10.5px] text-slate-600 text-center">
        Last checked {formatChecked(service.checkedAt)}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {!isDb && (
          <button
            onClick={() => onRestart(service)}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md text-xs font-semibold border border-red-800 bg-red-950 text-red-400 hover:bg-red-900 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Restart {service.name}
          </button>
        )}
        {isDb && (
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-blue-800 bg-blue-950 text-blue-400 hover:bg-blue-900 transition-colors">
              <TestTube2 className="w-3 h-3" /> Test Conn
            </button>
            <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors">
              Reset Pool
            </button>
          </div>
        )}
      </div>

      <p className="text-[10.5px] text-slate-600 text-center flex items-center justify-center gap-1">
        <span>60s cooldown enforced after restart</span>
      </p>
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800/60 rounded-lg p-3">
      <div className="text-sm font-bold text-slate-100 tabular-nums">{value}</div>
      <div className="text-[10.5px] text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60)  return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const d = Math.floor(h / 24);
  return d > 0 ? `${d}d ${h % 24}h` : `${h}h`;
}

function formatChecked(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}
