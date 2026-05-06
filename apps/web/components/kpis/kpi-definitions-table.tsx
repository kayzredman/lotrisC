'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Badge, Button } from '@lotris/ui';

type MetricType = 'PERCENTAGE' | 'TIME_HOURS' | 'TIME_MINUTES' | 'COUNT' | 'SCORE';
type Direction = 'HIGHER_BETTER' | 'LOWER_BETTER';
type Scope = 'ORG' | 'TEAM' | 'INDIVIDUAL';
type Status = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

const METRIC_TYPE_LABELS: Record<MetricType, string> = {
  PERCENTAGE: 'Percentage',
  TIME_HOURS: 'Hours',
  TIME_MINUTES: 'Minutes',
  COUNT: 'Count',
  SCORE: 'Score',
};

const SCOPE_LABELS: Record<Scope, string> = {
  ORG: 'Org-wide',
  TEAM: 'Team',
  INDIVIDUAL: 'Individual',
};

const STATUS_VARIANTS: Record<Status, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  ACTIVE: 'default',
  ARCHIVED: 'destructive',
};

interface DefinitionForm {
  name: string;
  description: string;
  metricType: MetricType;
  direction: Direction;
  scope: Scope;
  defaultTarget: string;
  weight: string;
}

const EMPTY_FORM: DefinitionForm = {
  name: '',
  description: '',
  metricType: 'PERCENTAGE',
  direction: 'HIGHER_BETTER',
  scope: 'INDIVIDUAL',
  defaultTarget: '80',
  weight: '1.0',
};

export default function KpiDefinitionsTable() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DefinitionForm>(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<Status | 'ALL'>('ALL');

  const utils = trpc.useUtils();
  const { data, isLoading, isError } = trpc['kpi.definitions.list'].useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const definitions = (data?.definitions ?? []).filter(
    (d: { status: Status }) => filterStatus === 'ALL' || d.status === filterStatus,
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowCreate(true);
  }

  function openEdit(def: { id: string; name: string; description: string; metricType: string; direction: string; scope: string; defaultTarget: number; weight: number; status: Status }) {
    setForm({
      name: def.name,
      description: def.description ?? '',
      metricType: def.metricType as MetricType,
      direction: def.direction as Direction,
      scope: def.scope as Scope,
      defaultTarget: String(def.defaultTarget ?? '80'),
      weight: String(def.weight ?? '1.0'),
    });
    setEditingId(def.id);
    setShowCreate(true);
  }

  function handleChange(field: keyof DefinitionForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name: form.name,
      description: form.description,
      metricType: form.metricType,
      direction: form.direction,
      scope: form.scope,
      defaultTarget: Number(form.defaultTarget),
      weight: Number(form.weight),
    };

    const url = editingId
      ? `/api/v1/kpi/definitions/${editingId}`
      : '/api/v1/kpi/definitions';
    const method = editingId ? 'PATCH' : 'POST';

    const resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      setShowCreate(false);
      utils['kpi.definitions.list'].invalidate();
    }
  }

  async function handleArchive(id: string) {
    await fetch(`/api/v1/kpi/definitions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ARCHIVED' }),
    });
    utils['kpi.definitions.list'].invalidate();
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1">
          {(['ALL', 'DRAFT', 'ACTIVE', 'ARCHIVED'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filterStatus === s
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={openCreate}>
          + New Definition
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scope</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Default Target</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Weight</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-destructive">
                  Failed to load definitions.
                </td>
              </tr>
            )}
            {!isLoading && !isError && definitions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No KPI definitions found.
                </td>
              </tr>
            )}
            {definitions.map((def: {
              id: string;
              name: string;
              description: string;
              metricType: MetricType;
              direction: Direction;
              scope: Scope;
              defaultTarget: number;
              weight: number;
              status: Status;
            }) => (
              <tr key={def.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium">{def.name}</div>
                  {def.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                      {def.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {METRIC_TYPE_LABELS[def.metricType]}
                  <span className="ml-1 text-xs">
                    ({def.direction === 'HIGHER_BETTER' ? '↑' : '↓'})
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{SCOPE_LABELS[def.scope]}</td>
                <td className="px-4 py-3 text-right font-mono">{def.defaultTarget}</td>
                <td className="px-4 py-3 text-right font-mono">{def.weight}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANTS[def.status]}>
                    {def.status.charAt(0) + def.status.slice(1).toLowerCase()}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(def)}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit
                    </button>
                    {def.status !== 'ARCHIVED' && (
                      <button
                        type="button"
                        onClick={() => handleArchive(def.id)}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl border w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {editingId ? 'Edit KPI Definition' : 'New KPI Definition'}
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <label className="block">
                  <span className="text-sm font-medium">Name *</span>
                  <input
                    className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Description</span>
                  <textarea
                    className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background resize-none"
                    rows={2}
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-medium">Metric Type</span>
                    <select
                      className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background"
                      value={form.metricType}
                      onChange={(e) => handleChange('metricType', e.target.value)}
                    >
                      {Object.entries(METRIC_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Direction</span>
                    <select
                      className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background"
                      value={form.direction}
                      onChange={(e) => handleChange('direction', e.target.value)}
                    >
                      <option value="HIGHER_BETTER">Higher is Better ↑</option>
                      <option value="LOWER_BETTER">Lower is Better ↓</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Scope</span>
                    <select
                      className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background"
                      value={form.scope}
                      onChange={(e) => handleChange('scope', e.target.value)}
                    >
                      {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Default Target</span>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background"
                      value={form.defaultTarget}
                      onChange={(e) => handleChange('defaultTarget', e.target.value)}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Weight</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background"
                      value={form.weight}
                      onChange={(e) => handleChange('weight', e.target.value)}
                    />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingId ? 'Save Changes' : 'Create Definition'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
