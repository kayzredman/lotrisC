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
    return <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-5 animate-pulse h-40" />;
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
        className={`flex items-center gap-1 ${active ? 'text-violet-400' : 'text-slate-400'} hover:text-slate-200 transition`}
      >
        {label}
        <span className="text-xs">{active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    );
  }

  function kpiColor(score: string | null) {
    if (!score) return 'text-slate-500';
    const n = parseFloat(score);
    return n >= 80 ? 'text-emerald-400' : n >= 60 ? 'text-amber-400' : 'text-rose-400';
  }

  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">Engineer Performance — Current Week</h2>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500 p-5">No performance data for this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs">
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
                <tr key={`${r.engineerId}-${r.weekKey}`} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                  <td className="px-4 py-2.5 text-slate-300 font-mono text-xs">{r.engineerId.slice(0, 8)}…</td>
                  <td className="px-4 py-2.5 text-right text-slate-200">{r.ticketsResolved}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={r.slaBreaches > 0 ? 'text-rose-400' : 'text-slate-400'}>
                      {r.slaBreaches}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-400">
                    {r.avgResolutionHours ? `${parseFloat(r.avgResolutionHours).toFixed(1)}h` : '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${kpiColor(r.kpiScore)}`}>
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
