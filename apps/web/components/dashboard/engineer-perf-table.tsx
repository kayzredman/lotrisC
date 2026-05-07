'use client';

import { useState } from 'react';

interface EngineerRow {
  engineerId: string;
  weekKey: string;
  ticketsResolved: number;
  tasksCompleted: number;
  slaBreaches: number;
  avgResolutionHours: string | null;
  kpiScore: string | null;
}

interface EngineerPerfTableProps {
  rows?: EngineerRow[];
  isLoading?: boolean;
}

type SortKey = 'engineerId' | 'ticketsResolved' | 'slaBreaches' | 'avgResolutionHours' | 'kpiScore';

export function EngineerPerfTable({ rows, isLoading }: EngineerPerfTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('ticketsResolved');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (isLoading) {
    return <div className="rounded-xl p-5 animate-pulse h-40" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }} />;
  }

  const data = rows ?? [];

  const sorted = [...data].sort((a, b) => {
    const aVal = sortKey === 'avgResolutionHours' || sortKey === 'kpiScore'
      ? parseFloat(a[sortKey] ?? '0')
      : (a[sortKey] as number | string);
    const bVal = sortKey === 'avgResolutionHours' || sortKey === 'kpiScore'
      ? parseFloat(b[sortKey] ?? '0')
      : (b[sortKey] as number | string);

    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col;
    return (
      <button
        onClick={() => handleSort(col)}
        style={{ color: active ? '#f57f20' : 'var(--text-secondary)' }}
        className="flex items-center gap-1 hover:opacity-80 transition"
      >
        {label}
        <span className="text-xs">{active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    );
  }

  function kpiColor(score: string | null): string {
    if (!score) return 'var(--text-muted)';
    const n = parseFloat(score);
    return n >= 80 ? '#22c55e' : n >= 60 ? '#f59e0b' : '#f87171';
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Engineer Performance — Current Week</h2>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm p-5" style={{ color: 'var(--text-muted)' }}>No performance data for this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs" style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-4 py-2.5">
                  <SortBtn col="engineerId" label="Engineer" />
                </th>
                <th className="text-right px-4 py-2.5">
                  <SortBtn col="ticketsResolved" label="Resolved" />
                </th>
                <th className="text-right px-4 py-2.5">
                  <SortBtn col="slaBreaches" label="SLA Breaches" />
                </th>
                <th className="text-right px-4 py-2.5">
                  <SortBtn col="avgResolutionHours" label="Avg Res (h)" />
                </th>
                <th className="text-right px-4 py-2.5">
                  <SortBtn col="kpiScore" label="KPI Score" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={`${r.engineerId}-${r.weekKey}`} className="hover:opacity-80 transition" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{r.engineerId.slice(0, 8)}…</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: 'var(--text-primary)' }}>{r.ticketsResolved}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span style={{ color: r.slaBreaches > 0 ? '#f87171' : 'var(--text-secondary)' }}>
                      {r.slaBreaches}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>
                    {r.avgResolutionHours ? `${parseFloat(r.avgResolutionHours).toFixed(1)}h` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold" style={{ color: kpiColor(r.kpiScore) }}>
                    {r.kpiScore ? parseFloat(r.kpiScore).toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
