'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Badge, Button } from '@lotris/ui';

interface Assignment {
  id: string;
  engineerId: string;
  kpiDefinitionId: string;
  periodKey: string;
  measurementPeriod: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  targetOverride: number | null;
  assignedBy: string;
  createdAt: string;
}

interface Definition {
  id: string;
  name: string;
  defaultTarget: number;
  metricType: string;
}

interface AssignForm {
  engineerId: string;
  kpiDefinitionId: string;
  periodKey: string;
  measurementPeriod: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  targetOverride: string;
}

const EMPTY_FORM: AssignForm = {
  engineerId: '',
  kpiDefinitionId: '',
  periodKey: '',
  measurementPeriod: 'QUARTERLY',
  targetOverride: '',
};

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUALLY: 'Annually',
};

export default function KpiAssignmentsPanel() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<AssignForm>(EMPTY_FORM);
  const [filterEngineerId, setFilterEngineerId] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');

  const utils = trpc.useUtils();

  const { data: assignData, isLoading } = trpc['kpi.assignments.list'].useQuery(
    {
      engineerId: filterEngineerId || undefined,
      periodKey: filterPeriod || undefined,
    },
    { refetchInterval: 60_000 },
  );

  const { data: defData } = trpc['kpi.definitions.list'].useQuery(undefined);

  const assignments: Assignment[] = assignData?.assignments ?? [];
  const definitions: Definition[] = defData?.definitions ?? [];

  function handleChange(field: keyof AssignForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      engineerId: form.engineerId,
      kpiDefinitionId: form.kpiDefinitionId,
      periodKey: form.periodKey,
      measurementPeriod: form.measurementPeriod,
      targetOverride: form.targetOverride ? Number(form.targetOverride) : undefined,
    };

    const resp = await fetch('/api/v1/kpi/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      setShowCreate(false);
      setForm(EMPTY_FORM);
      utils['kpi.assignments.list'].invalidate();
    }
  }

  const selectedDef = definitions.find((d) => d.id === form.kpiDefinitionId);

  return (
    <div className="space-y-4">
      {/* Filters + action */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            placeholder="Filter by engineer ID…"
            value={filterEngineerId}
            onChange={(e) => setFilterEngineerId(e.target.value)}
            className="text-sm border rounded-md px-3 py-1.5 bg-background w-48"
          />
          <input
            placeholder="Period (e.g. 2026-Q2)…"
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="text-sm border rounded-md px-3 py-1.5 bg-background w-40"
          />
        </div>
        <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setShowCreate(true); }}>
          + Assign KPI
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Engineer</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">KPI</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Frequency</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Target Override</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned By</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td>
              </tr>
            )}
            {!isLoading && assignments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No assignments found.
                </td>
              </tr>
            )}
            {assignments.map((a) => {
              const def = definitions.find((d) => d.id === a.kpiDefinitionId);
              return (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{a.engineerId}</td>
                  <td className="px-4 py-3">{def?.name ?? a.kpiDefinitionId}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{a.periodKey}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {PERIOD_LABELS[a.measurementPeriod]}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {a.targetOverride != null ? (
                      <span className="font-semibold">{a.targetOverride}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">default ({def?.defaultTarget})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {a.assignedBy}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Assign modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl border w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-base font-semibold">Assign KPI to Engineer</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <label className="block">
                <span className="text-sm font-medium">Engineer ID *</span>
                <input
                  className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background"
                  value={form.engineerId}
                  onChange={(e) => handleChange('engineerId', e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">KPI Definition *</span>
                <select
                  className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background"
                  value={form.kpiDefinitionId}
                  onChange={(e) => handleChange('kpiDefinitionId', e.target.value)}
                  required
                >
                  <option value="">Select a definition…</option>
                  {definitions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium">Period Key *</span>
                  <input
                    placeholder="e.g. 2026-Q2"
                    className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background"
                    value={form.periodKey}
                    onChange={(e) => handleChange('periodKey', e.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Frequency</span>
                  <select
                    className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background"
                    value={form.measurementPeriod}
                    onChange={(e) => handleChange('measurementPeriod', e.target.value)}
                  >
                    {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium">
                  Target Override
                  {selectedDef && (
                    <span className="text-muted-foreground font-normal ml-1">
                      (default: {selectedDef.defaultTarget})
                    </span>
                  )}
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Leave blank to use default"
                  className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background"
                  value={form.targetOverride}
                  onChange={(e) => handleChange('targetOverride', e.target.value)}
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit">Assign KPI</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
