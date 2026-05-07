'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

const FREQUENCIES = [
  { key: 'WEEKLY', label: 'Weekly' },
  { key: 'MONTHLY', label: 'Monthly' },
  { key: 'QUARTERLY', label: 'Quarterly' },
];

const REPORT_TYPES = [
  { key: 'TICKET_SUMMARY', label: 'Ticket Summary' },
  { key: 'SLA_COMPLIANCE', label: 'SLA Compliance' },
  { key: 'KPI_REPORT', label: 'KPI Report' },
  { key: 'ENGINEER_PERF', label: 'Engineer Performance' },
];

interface Schedule {
  id: string;
  reportType: string;
  format: string;
  frequency: string;
  recipients: string;
  isActive: string;
}

export function ScheduledReports() {
  const { getToken } = useAuth();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [reportType, setReportType] = useState('TICKET_SUMMARY');
  const [format, setFormat] = useState('PDF');
  const [frequency, setFrequency] = useState('WEEKLY');
  const [recipients, setRecipients] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadSchedules() {
    const token = await getToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/reports/schedules`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as Schedule[];
      setSchedules(data);
      setLoaded(true);
    }
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const token = await getToken();
      const emails = recipients.split(',').map((e) => e.trim()).filter(Boolean);
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/reports/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reportType, format, frequency, recipients: JSON.stringify(emails) }),
      });
      setShowCreate(false);
      await loadSchedules();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/reports/schedules/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setSchedules((s) => s.filter((x) => x.id !== id));
  }

  if (!loaded) {
    return (
      <div>
        <h2 className="text-base font-semibold text-slate-100 mb-4">Scheduled Reports</h2>
        <button
          onClick={loadSchedules}
          className="text-sm text-violet-400 hover:underline"
        >
          Load schedules
        </button>
      </div>
    );
  }

  const freqColor: Record<string, string> = {
    WEEKLY: 'bg-violet-900/40 text-violet-300 border border-violet-700',
    MONTHLY: 'bg-blue-900/40 text-blue-300 border border-blue-700',
    QUARTERLY: 'bg-amber-900/40 text-amber-300 border border-amber-700',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-100">Scheduled Reports</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition"
        >
          + New Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <p className="text-sm text-slate-500">No scheduled reports configured.</p>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => {
            let emails: string[] = [];
            try { emails = JSON.parse(s.recipients) as string[]; } catch { /* ignore */ }
            return (
              <div key={s.id} className="rounded-xl bg-slate-800/60 border border-slate-700 p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">
                      {REPORT_TYPES.find((r) => r.key === s.reportType)?.label ?? s.reportType}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${freqColor[s.frequency] ?? ''}`}>
                      {s.frequency}
                    </span>
                    <span className="text-xs text-slate-500">{s.format}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate max-w-sm">
                    Recipients: {emails.join(', ') || '—'}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-xs text-rose-400 hover:text-rose-300 transition"
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-slate-100">New Schedule</h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Report Type</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm">
                {REPORT_TYPES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Format</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="PDF">PDF</option>
                  <option value="EXCEL">Excel</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Frequency</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm">
                  {FREQUENCIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Recipients (comma-separated emails)</label>
              <input
                type="text"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="alice@acme.com, bob@acme.com"
                className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !recipients.trim()}
                className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition"
              >
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
