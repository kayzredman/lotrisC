'use client';

import type { IncidentEntry } from '@lotris/types';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface IncidentLogProps {
  incidents: IncidentEntry[];
}

export function IncidentLog({ incidents }: IncidentLogProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
          Incident Log
        </div>
        <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
          View all
        </button>
      </div>

      {/* Entries */}
      {incidents.length === 0 ? (
        <div className="py-10 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          No incidents recorded
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {incidents.map((inc) => (
            <IncidentItem key={inc.id} inc={inc} />
          ))}
        </div>
      )}
    </div>
  );
}

function IncidentItem({ inc }: { inc: IncidentEntry }) {
  const dotColor = inc.resolvedAt ? 'bg-green-400' : 'bg-yellow-400';
  const isOpen   = !inc.resolvedAt;

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-200 mb-0.5">{inc.title}</div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="font-mono">{formatTs(inc.createdAt)}</span>
          <span className="text-slate-600">·</span>
          <span>{inc.service}</span>
          {isOpen ? (
            <span className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-red-950 text-red-400">
              Open
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-green-950 text-green-400">
              Resolved
            </span>
          )}
        </div>
        {inc.details && (
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{inc.details}</p>
        )}
      </div>
    </div>
  );
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
