'use client';

import type { QueueDepthEntry } from '@lotris/types';
import { Layers } from 'lucide-react';

interface QueueDepthsProps {
  queues: QueueDepthEntry[];
}

export function QueueDepths({ queues }: QueueDepthsProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          BullMQ Queue Depths
        </div>
        <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-4 py-2 text-left text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide">Queue</th>
              <th className="px-4 py-2 text-right text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide">Waiting</th>
              <th className="px-4 py-2 text-right text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide">Active</th>
              <th className="px-4 py-2 text-right text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide">Failed</th>
              <th className="px-4 py-2 text-right text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide">Delayed</th>
              <th className="px-4 py-2 text-right text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Completed (1h)</th>
            </tr>
          </thead>
          <tbody>
            {queues.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                  Loading queue data…
                </td>
              </tr>
            ) : (
              queues.map((q) => <QueueRow key={q.name} q={q} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QueueRow({ q }: { q: QueueDepthEntry }) {
  return (
    <tr className="border-b border-slate-800 last:border-0">
      <td className="px-4 py-3">
        <div className="text-sm font-semibold text-slate-200">{q.name}</div>
        <div className="text-xs text-slate-500">{q.sub}</div>
      </td>
      <td className="px-4 py-3 text-right">
        <NumCell value={q.waiting} variant="muted" />
      </td>
      <td className="px-4 py-3 text-right">
        <NumCell value={q.active} variant="blue" />
      </td>
      <td className="px-4 py-3 text-right">
        <NumCell value={q.failed} variant="red" />
      </td>
      <td className="px-4 py-3 text-right">
        <NumCell value={q.delayed} variant="yellow" />
      </td>
      <td className="px-4 py-3 text-right">
        <NumCell value={q.completedLastHour} variant="muted" />
      </td>
    </tr>
  );
}

function NumCell({ value, variant }: { value: number; variant: 'muted' | 'blue' | 'red' | 'yellow' }) {
  if (value === 0) {
    return <span className="text-xs font-mono text-slate-600">0</span>;
  }
  const colors = {
    muted:  'text-slate-400',
    blue:   'text-blue-400 font-semibold',
    red:    'text-red-400 font-semibold',
    yellow: 'text-yellow-400 font-semibold',
  };
  return <span className={`text-xs font-mono ${colors[variant]}`}>{value}</span>;
}
