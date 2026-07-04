'use client';

import type { ServiceHealthEntry } from '@lotris/types';
import { RefreshCw, TestTube2, Server } from 'lucide-react';
import { cn } from '@lotris/ui';

interface ServiceTableProps {
  services: ServiceHealthEntry[];
  selected: ServiceHealthEntry | null;
  onSelect: (s: ServiceHealthEntry) => void;
  onRestart: (s: ServiceHealthEntry) => void;
}

const SERVICE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  'lotris-api':         ({ className }) => <Server className={className} />,
  'nextjs-web':         ({ className }) => <Server className={className} />,
  'hangfire-workers':   ({ className }) => <Server className={className} />,
  'mssql-db':           ({ className }) => <Server className={className} />,
  'redis':              ({ className }) => <Server className={className} />,
  'qdrant':             ({ className }) => <Server className={className} />,
};

const NO_RESTART_SERVICES = new Set(['mssql-db', 'qdrant']);

export function ServiceTable({ services, selected, onSelect, onRestart }: ServiceTableProps) {
  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <TableHeader />
        <div className="py-12 text-center text-slate-500 text-sm">Connecting to health stream…</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <TableHeader />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {['Service', 'Status', 'CPU', 'Memory', 'Uptime', 'Last Ping', ''].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {services.map((svc) => (
              <ServiceRow
                key={svc.id}
                svc={svc}
                isSelected={selected?.id === svc.id}
                onSelect={() => onSelect(svc)}
                onRestart={() => onRestart(svc)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHeader() {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Server className="w-3.5 h-3.5 text-indigo-400" />
        Service Processes
      </div>
      <span className="text-xs text-slate-500">Click row for details</span>
    </div>
  );
}

function ServiceRow({
  svc, isSelected, onSelect, onRestart,
}: {
  svc: ServiceHealthEntry;
  isSelected: boolean;
  onSelect: () => void;
  onRestart: () => void;
}) {
  const isDb = svc.id === 'mssql-db';
  const noRestart = NO_RESTART_SERVICES.has(svc.id);
  const cpuPct = svc.cpu;
  const memPct = svc.memTotalMb > 0 ? Math.round((svc.memUsedMb / svc.memTotalMb) * 100) : 0;

  return (
    <tr
      onClick={onSelect}
      className={cn(
        'cursor-pointer border-b border-slate-800 last:border-0 transition-colors',
        isSelected ? 'bg-indigo-950/60' : 'hover:bg-slate-800/40',
      )}
    >
      {/* Service name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
            <Server className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-200">{svc.name}</div>
            <div className="text-xs text-slate-500">{svc.sub}</div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={svc.status} />
      </td>

      {/* CPU */}
      <td className="px-4 py-3">
        {svc.cpu > 0 ? (
          <MetricCell value={cpuPct} unit="%" warn={cpuPct > 70} crit={cpuPct > 90} barPct={cpuPct} />
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>

      {/* Memory */}
      <td className="px-4 py-3">
        {svc.memTotalMb > 0 && svc.memUsedMb > 0 ? (
          <MetricCell
            value={svc.memUsedMb}
            unit={` / ${svc.memTotalMb} MB`}
            warn={memPct > 70}
            crit={memPct > 90}
            barPct={memPct}
          />
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>

      {/* Uptime */}
      <td className="px-4 py-3">
        {svc.uptimeSeconds > 0 ? (
          <span className={cn('text-xs font-medium', svc.uptimeSeconds < 60 ? 'text-yellow-400' : 'text-green-400')}>
            {formatUptime(svc.uptimeSeconds)}
          </span>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>

      {/* Last ping */}
      <td className="px-4 py-3">
        <PingCell ms={svc.lastPingMs} />
      </td>

      {/* Actions */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          {!noRestart && (
            <ActionBtn
              label="Restart"
              icon={<RefreshCw className="w-2.5 h-2.5" />}
              variant="danger"
              onClick={onRestart}
            />
          )}
          {isDb && (
            <ActionBtn
              label="Test"
              icon={<TestTube2 className="w-2.5 h-2.5" />}
              variant="db"
              onClick={() => {/* test conn */ }}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: 'UP' | 'DEGRADED' | 'DOWN' }) {
  const cfg = {
    UP:       { cls: 'bg-green-950 text-green-400',  pulse: 'bg-green-400 animate-pulse', label: 'UP' },
    DEGRADED: { cls: 'bg-yellow-950 text-yellow-400', pulse: 'bg-yellow-400 animate-pulse', label: 'Degraded' },
    DOWN:     { cls: 'bg-red-950 text-red-400',      pulse: 'bg-red-400',                  label: 'Down' },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.pulse}`} />
      {cfg.label}
    </span>
  );
}

function MetricCell({
  value, unit, warn, crit, barPct,
}: { value: number; unit: string; warn: boolean; crit: boolean; barPct: number }) {
  const barColor = crit ? 'bg-red-400' : warn ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="flex flex-col gap-1">
      <span className={cn('text-xs font-semibold', crit ? 'text-red-400' : warn ? 'text-yellow-400' : 'text-slate-200')}>
        {value}{unit}
      </span>
      <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(100, barPct)}%` }} />
      </div>
    </div>
  );
}

function PingCell({ ms }: { ms: number }) {
  if (ms < 0) return <span className="text-xs text-red-400 font-medium">unreachable</span>;
  if (ms === 0) return <span className="text-xs text-slate-600">—</span>;
  const warn = ms > 200;
  const crit = ms > 1000;
  return (
    <span className={cn('text-xs font-mono', crit ? 'text-red-400' : warn ? 'text-yellow-400' : 'text-slate-400')}>
      {ms}ms
    </span>
  );
}

function ActionBtn({
  label, icon, variant, onClick,
}: {
  label: string;
  icon: React.ReactNode;
  variant: 'danger' | 'db';
  onClick: () => void;
}) {
  const cls = variant === 'danger'
    ? 'hover:border-red-700 hover:text-red-400 hover:bg-red-950'
    : 'hover:border-blue-700 hover:text-blue-400 hover:bg-blue-950';
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border border-slate-700 bg-slate-800 text-slate-400 transition-colors',
        cls,
      )}
    >
      {icon} {label}
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  if (seconds < 60)  return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h < 24) return `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
