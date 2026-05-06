'use client';

import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Badge, Button } from '@lotris/ui';

interface Agreement {
  id: string;
  engineerId: string;
  leadId: string;
  periodKey: string;
  status: AgreementStatus;
  createdAt: string;
}

type AgreementStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'CLOSED';

const STATUS_VARIANTS: Record<AgreementStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_REVIEW: 'secondary',
  ACTIVE: 'default',
  CLOSED: 'destructive',
};

interface MetricRow {
  description: string;
  measurementPeriod: string;
  weight: string;
  targetScore: string;
}

interface AreaRow {
  name: string;
  weight: string;
  metrics: MetricRow[];
}

function emptyMetric(): MetricRow {
  return { description: '', measurementPeriod: 'QUARTERLY', weight: '10', targetScore: '80' };
}

function emptyArea(): AreaRow {
  return { name: '', weight: '50', metrics: [emptyMetric()] };
}

export default function KpiAgreementBuilder() {
  const [selectedAgreementId, setSelectedAgreementId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAreaBuilder, setShowAreaBuilder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [newEngineerId, setNewEngineerId] = useState('');
  const [newPeriodKey, setNewPeriodKey] = useState('');
  const [areas, setAreas] = useState<AreaRow[]>([emptyArea()]);
  const [uploadColumns, setUploadColumns] = useState<string[] | null>(null);
  const [colMapping, setColMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterStatus, setFilterStatus] = useState<AgreementStatus | 'ALL'>('ALL');

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc['kpi.agreements.list'].useQuery(
    {},
    { refetchInterval: 60_000 },
  );

  const agreements: Agreement[] = (data?.agreements ?? []).filter(
    (a: Agreement) => filterStatus === 'ALL' || a.status === filterStatus,
  );

  // --- weight sum validation ---
  const totalAreaWeight = areas.reduce((s, a) => s + Number(a.weight || 0), 0);
  const areaWeightValid = Math.abs(totalAreaWeight - 100) < 0.01;

  // --- create agreement ---
  async function handleCreateAgreement(e: React.FormEvent) {
    e.preventDefault();
    const resp = await fetch('/api/v1/kpi/agreements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engineerId: newEngineerId, periodKey: newPeriodKey }),
    });
    if (resp.ok) {
      const d = await resp.json();
      setShowCreate(false);
      setSelectedAgreementId(d.id);
      setShowAreaBuilder(true);
      utils['kpi.agreements.list'].invalidate();
    }
  }

  // --- upsert areas ---
  async function handleSaveAreas(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAgreementId) return;
    const body = {
      areas: areas.map((a) => ({
        name: a.name,
        weight: Number(a.weight),
        metrics: a.metrics.map((m) => ({
          description: m.description,
          measurementPeriod: m.measurementPeriod,
          weight: Number(m.weight),
          targetScore: Number(m.targetScore),
        })),
      })),
    };
    const resp = await fetch(`/api/v1/kpi/agreements/${selectedAgreementId}/areas`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      setShowAreaBuilder(false);
      utils['kpi.agreements.list'].invalidate();
    }
  }

  // --- submit / accept ---
  async function handleAction(id: string, action: 'submit' | 'accept') {
    await fetch(`/api/v1/kpi/agreements/${id}/${action}`, { method: 'POST' });
    utils['kpi.agreements.list'].invalidate();
  }

  // --- file upload for column mapping ---
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0] || !selectedAgreementId) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    const resp = await fetch(`/api/v1/kpi/agreements/${selectedAgreementId}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (resp.ok) {
      const d = await resp.json();
      setUploadColumns(d.columns ?? []);
      const initMap: Record<string, string> = {};
      (d.columns ?? []).forEach((c: string) => { initMap[c] = ''; });
      setColMapping(initMap);
    }
  }

  async function handleImport() {
    if (!selectedAgreementId) return;
    const resp = await fetch(`/api/v1/kpi/agreements/${selectedAgreementId}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnMapping: colMapping }),
    });
    if (resp.ok) {
      setShowUpload(false);
      setUploadColumns(null);
    }
  }

  // --- area builder helpers ---
  function addArea() {
    setAreas((prev) => [...prev, emptyArea()]);
  }

  function removeArea(i: number) {
    setAreas((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateArea(i: number, field: keyof Pick<AreaRow, 'name' | 'weight'>, value: string) {
    setAreas((prev) => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  }

  function addMetric(areaIdx: number) {
    setAreas((prev) =>
      prev.map((a, idx) =>
        idx === areaIdx ? { ...a, metrics: [...a.metrics, emptyMetric()] } : a,
      ),
    );
  }

  function removeMetric(areaIdx: number, metricIdx: number) {
    setAreas((prev) =>
      prev.map((a, idx) =>
        idx === areaIdx
          ? { ...a, metrics: a.metrics.filter((_, mi) => mi !== metricIdx) }
          : a,
      ),
    );
  }

  function updateMetric(areaIdx: number, metricIdx: number, field: keyof MetricRow, value: string) {
    setAreas((prev) =>
      prev.map((a, ai) =>
        ai === areaIdx
          ? {
              ...a,
              metrics: a.metrics.map((m, mi) =>
                mi === metricIdx ? { ...m, [field]: value } : m,
              ),
            }
          : a,
      ),
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1">
          {(['ALL', 'DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'CLOSED'] as const).map((s) => (
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
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => { setNewEngineerId(''); setNewPeriodKey(''); setShowCreate(true); }}>
          + New Agreement
        </Button>
      </div>

      {/* Agreement list */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Engineer</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lead</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && agreements.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No agreements found.</td></tr>
            )}
            {agreements.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{a.engineerId}</td>
                <td className="px-4 py-3"><Badge variant="outline">{a.periodKey}</Badge></td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.leadId}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANTS[a.status]}>
                    {a.status.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {a.status === 'DRAFT' && (
                      <>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => { setSelectedAgreementId(a.id); setAreas([emptyArea()]); setShowAreaBuilder(true); }}
                        >
                          Edit Areas
                        </button>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => { setSelectedAgreementId(a.id); setShowUpload(true); }}
                        >
                          Upload
                        </button>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleAction(a.id, 'submit')}
                        >
                          Submit
                        </button>
                      </>
                    )}
                    {a.status === 'PENDING_REVIEW' && (
                      <button
                        type="button"
                        className="text-xs text-green-600 hover:underline"
                        onClick={() => handleAction(a.id, 'accept')}
                      >
                        Accept
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create agreement modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl border w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-base font-semibold">New KPI Agreement</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleCreateAgreement} className="p-6 space-y-4">
              <label className="block">
                <span className="text-sm font-medium">Engineer ID *</span>
                <input
                  className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background"
                  value={newEngineerId}
                  onChange={(e) => setNewEngineerId(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Period Key *</span>
                <input
                  placeholder="e.g. 2026-Q2"
                  className="mt-1 block w-full text-sm border rounded-md px-3 py-2 bg-background"
                  value={newPeriodKey}
                  onChange={(e) => setNewPeriodKey(e.target.value)}
                  required
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit">Create &amp; Build Areas</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Area builder modal */}
      {showAreaBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-background rounded-xl shadow-xl border w-full max-w-2xl mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-base font-semibold">Build Agreement Areas</h2>
              <button type="button" onClick={() => setShowAreaBuilder(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleSaveAreas} className="p-6 space-y-6">
              {/* Weight sum indicator */}
              <div className={`text-sm font-medium ${areaWeightValid ? 'text-green-600' : 'text-destructive'}`}>
                Area weight total: {totalAreaWeight}% {areaWeightValid ? '✓' : '(must equal 100%)'}
              </div>

              {areas.map((area, ai) => (
                <div key={ai} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 text-sm border rounded-md px-3 py-2 bg-background font-medium"
                      placeholder="Area name *"
                      value={area.name}
                      onChange={(e) => updateArea(ai, 'name', e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="w-20 text-sm border rounded-md px-3 py-2 bg-background text-right"
                      placeholder="Weight %"
                      value={area.weight}
                      onChange={(e) => updateArea(ai, 'weight', e.target.value)}
                    />
                    <span className="text-muted-foreground text-sm">%</span>
                    {areas.length > 1 && (
                      <button type="button" onClick={() => removeArea(ai)} className="text-destructive text-xs hover:underline">Remove</button>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="space-y-2 pl-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Metrics</div>
                    {area.metrics.map((m, mi) => (
                      <div key={mi} className="flex items-center gap-2 flex-wrap">
                        <input
                          className="flex-1 min-w-32 text-xs border rounded-md px-2 py-1.5 bg-background"
                          placeholder="Description *"
                          value={m.description}
                          onChange={(e) => updateMetric(ai, mi, 'description', e.target.value)}
                          required
                        />
                        <select
                          className="text-xs border rounded-md px-2 py-1.5 bg-background"
                          value={m.measurementPeriod}
                          onChange={(e) => updateMetric(ai, mi, 'measurementPeriod', e.target.value)}
                        >
                          <option value="MONTHLY">Monthly</option>
                          <option value="QUARTERLY">Quarterly</option>
                          <option value="ANNUALLY">Annually</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          className="w-16 text-xs border rounded-md px-2 py-1.5 bg-background text-right"
                          placeholder="Wt%"
                          value={m.weight}
                          onChange={(e) => updateMetric(ai, mi, 'weight', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="w-16 text-xs border rounded-md px-2 py-1.5 bg-background text-right"
                          placeholder="Target"
                          value={m.targetScore}
                          onChange={(e) => updateMetric(ai, mi, 'targetScore', e.target.value)}
                        />
                        {area.metrics.length > 1 && (
                          <button type="button" onClick={() => removeMetric(ai, mi)} className="text-destructive text-xs">✕</button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addMetric(ai)}
                      className="text-xs text-primary hover:underline mt-1"
                    >
                      + Add Metric
                    </button>
                  </div>
                </div>
              ))}

              <button type="button" onClick={addArea} className="text-sm text-primary hover:underline">
                + Add Area
              </button>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAreaBuilder(false)}>Cancel</Button>
                <Button type="submit" disabled={!areaWeightValid}>Save Areas</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload / column mapping modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl border w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-base font-semibold">Import Metrics from File</h2>
              <button type="button" onClick={() => { setShowUpload(false); setUploadColumns(null); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {!uploadColumns ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV or Excel (.xlsx) file containing KPI metrics. After upload you will map the columns.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Select File
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Map the file columns to KPI metric fields:
                  </p>
                  <div className="space-y-2">
                    {uploadColumns.map((col) => (
                      <div key={col} className="flex items-center gap-3">
                        <span className="text-sm font-mono w-36 truncate">{col}</span>
                        <span className="text-muted-foreground">→</span>
                        <select
                          className="flex-1 text-sm border rounded-md px-3 py-1.5 bg-background"
                          value={colMapping[col] ?? ''}
                          onChange={(e) => setColMapping((prev) => ({ ...prev, [col]: e.target.value }))}
                        >
                          <option value="">(skip)</option>
                          <option value="description">Description</option>
                          <option value="measurementPeriod">Measurement Period</option>
                          <option value="weight">Weight</option>
                          <option value="targetScore">Target Score</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setUploadColumns(null)}>Back</Button>
                    <Button onClick={handleImport}>Import Metrics</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
