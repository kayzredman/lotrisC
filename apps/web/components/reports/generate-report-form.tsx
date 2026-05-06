'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

const REPORT_TYPES = [
  { key: 'TICKET_SUMMARY', label: 'Ticket Summary' },
  { key: 'SLA_COMPLIANCE', label: 'SLA Compliance' },
  { key: 'KPI_REPORT', label: 'KPI Report' },
  { key: 'ENGINEER_PERF', label: 'Engineer Performance' },
];

interface Props {
  initialType?: string;
}

type JobStatus = 'idle' | 'queued' | 'processing' | 'done' | 'failed';

export function GenerateReportForm({ initialType = 'TICKET_SUMMARY' }: Props) {
  const { getToken } = useAuth();

  const [reportType, setReportType] = useState(initialType);
  const [format, setFormat] = useState<'PDF' | 'EXCEL'>('PDF');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState<JobStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setStatus('queued');
    setError(null);
    setJobId(null);

    try {
      const token = await getToken();
      const res = await fetch('/api/v1/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportType,
          format,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { jobId: string };
      setJobId(data.jobId);
      setStatus('processing');

      // Poll job status
      const pollInterval = setInterval(async () => {
        const token2 = await getToken();
        const statusRes = await fetch(`/api/v1/reports/${data.jobId}/status`, {
          headers: { Authorization: `Bearer ${token2}` },
        });
        if (!statusRes.ok) return;
        const job = (await statusRes.json()) as { status: string };
        if (job.status === 'DONE') {
          clearInterval(pollInterval);
          setStatus('done');
        } else if (job.status === 'FAILED') {
          clearInterval(pollInterval);
          setStatus('failed');
          setError('Report generation failed. Please try again.');
        }
      }, 2000);
    } catch (err) {
      setStatus('failed');
      setError(String(err));
    }
  }

  async function handleDownload() {
    if (!jobId) return;
    const token = await getToken();
    window.open(
      `/api/v1/reports/${jobId}/download`,
      '_blank',
    );
  }

  return (
    <div className="max-w-lg space-y-5">
      <h2 className="text-base font-semibold text-slate-100">Generate Report</h2>

      {/* Report type */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Report Type</label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {REPORT_TYPES.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Format */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Format</label>
        <div className="flex gap-3">
          {(['PDF', 'EXCEL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                format === f
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-violet-500'
              }`}
            >
              {f === 'PDF' ? 'PDF' : 'Excel (.xlsx)'}
            </button>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={status === 'queued' || status === 'processing'}
        className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium text-sm transition"
      >
        {status === 'processing' ? 'Generating…' : status === 'queued' ? 'Queued…' : 'Generate Report'}
      </button>

      {/* Status feedback */}
      {status === 'done' && (
        <div className="rounded-lg bg-emerald-900/30 border border-emerald-700 p-4 flex items-center justify-between">
          <p className="text-sm text-emerald-300">Report ready!</p>
          <button
            onClick={handleDownload}
            className="text-sm font-medium text-emerald-400 hover:text-emerald-300 underline"
          >
            Download {format}
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="rounded-lg bg-rose-900/30 border border-rose-700 p-4">
          <p className="text-sm text-rose-300">{error ?? 'Generation failed.'}</p>
        </div>
      )}

      {status === 'processing' && (
        <div className="rounded-lg bg-slate-800 border border-slate-600 p-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Generating report… this may take a few seconds.</p>
          </div>
        </div>
      )}
    </div>
  );
}
