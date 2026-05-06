'use client';

import { useState, useEffect } from 'react';
import type { ServiceHealthEntry } from '@lotris/types';
import { AlertTriangle, X } from 'lucide-react';

interface RestartModalProps {
  service: ServiceHealthEntry;
  onConfirm: (serviceName: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function RestartModal({ service, onConfirm, onCancel, isPending }: RestartModalProps) {
  const [input, setInput] = useState('');
  const isReady = input === service.id;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[420px] max-w-[calc(100vw-2rem)] p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-red-950 border border-red-800 flex items-center justify-center mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>

        {/* Title */}
        <h2 className="text-base font-bold text-slate-100 mb-1.5">
          Restart {service.name}?
        </h2>
        <p className="text-sm text-slate-400 mb-5 leading-relaxed">
          This will terminate all active connections and restart the process.
          Type{' '}
          <strong className="font-semibold text-slate-200 font-mono">{service.id}</strong>{' '}
          to confirm.
        </p>

        {/* Input */}
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Service name
        </label>
        <input
          autoFocus
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={service.id}
          className="w-full px-3 py-2 mb-5 rounded-md border border-slate-700 bg-slate-800 text-slate-200 text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
        />

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-slate-700 bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!isReady || isPending}
            onClick={() => isReady && onConfirm(service.id)}
            className="px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-red-600 hover:bg-red-500 text-white"
          >
            {isPending ? 'Requesting…' : 'Restart'}
          </button>
        </div>
      </div>
    </div>
  );
}
