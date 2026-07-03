'use client';

import { useState } from 'react';
import { useKpiAgreements, useKpiResult } from '@/lib/api/hooks/useKpi';
import { useAuth } from '@/lib/auth/auth-context';
import { Badge, Button } from '@lotris/ui';

interface AreaScore {
  areaId: string;
  areaName: string;
  score: number;
  weight: number;
}

interface KpiResult {
  id: string;
  engineerId: string;
  agreementId: string;
  periodKey: string;
  overallScore: number;
  areaScores: AreaScore[];
  computedAt: string;
}

interface Agreement {
  id: string;
  engineerId: string;
  periodKey: string;
  status: string;
}

function ragClass(actual: number, target: number): string {
  const ratio = actual / Math.max(target, 0.01);
  if (ratio >= 1) return 'text-green-600 bg-green-50 border-green-200';
  if (ratio >= 0.9) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

function ragLabel(actual: number, target: number): string {
  const ratio = actual / Math.max(target, 0.01);
  if (ratio >= 1) return 'On Target';
  if (ratio >= 0.9) return 'Near Target';
  return 'Below Target';
}

function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = Math.min(Math.max(score / 100, 0), 1) * circ;
  const color = score >= 100 ? '#16a34a' : score >= 90 ? '#ca8a04' : '#dc2626';

  return (
    <div className="relative" style={{ width: 76, height: 76, flexShrink: 0 }}>
      <svg width="76" height="76" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="38" cy="38" r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-extrabold leading-none" style={{ color: '#111' }}>
          {Math.round(score)}
        </span>
        <span className="text-[8.5px] text-muted-foreground uppercase tracking-wide mt-0.5">Score</span>
      </div>
    </div>
  );
}

export default function KpiDashboard() {
  const [selectedAgreementId, setSelectedAgreementId] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);

  const { accessToken } = useAuth();
  const { data: agDataRaw } = useKpiAgreements({}, { refetchInterval: 60_000 });
  const agList = (Array.isArray(agDataRaw) ? agDataRaw : (agDataRaw as { agreements?: Agreement[] } | undefined)?.agreements ?? []) as Agreement[];
  const activeAgreements = agList.filter((a) => a.status === 'ACTIVE');

  const agreementId = selectedAgreementId ?? activeAgreements[0]?.id ?? null;

  const { data: resultData, isLoading, refetch } = useKpiResult(
    agreementId ?? '',
    { enabled: !!agreementId, refetchInterval: 60_000 },
  );

  const result: KpiResult | null = ((resultData as { result?: KpiResult } | undefined)?.result ?? resultData ?? null) as KpiResult | null;

  async function handleCompute() {
    if (!agreementId) return;
    setComputing(true);
    await fetch(`/api/v1/kpi/agreements/${agreementId}/score`, {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    await refetch();
    setComputing(false);
  }

  const overallScore = result?.overallScore ?? 0;
  const areaScores: AreaScore[] = (() => {
    if (!result?.areaScores) return [];
    if (typeof result.areaScores === 'string') {
      try { return JSON.parse(result.areaScores); } catch { return []; }
    }
    return result.areaScores;
  })();

  return (
    <div className="space-y-6">
      {/* Agreement selector */}
      {activeAgreements.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Agreement:</span>
          <select
            className="text-sm border rounded-md px-3 py-1.5 bg-background"
            value={agreementId ?? ''}
            onChange={(e) => setSelectedAgreementId(e.target.value)}
          >
            {activeAgreements.map((a) => (
              <option key={a.id} value={a.id}>
                {a.engineerId} — {a.periodKey}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Score Hero */}
      {agreementId && (
        <div className="flex items-center gap-6 p-5 bg-white border rounded-xl shadow-sm border-l-4 border-l-indigo-500">
          {result ? (
            <>
              <ScoreRing score={overallScore} />
              <div className="w-px h-14 bg-border" />
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-extrabold tracking-tight leading-none">
                  {Math.round(overallScore)}
                </span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Overall KPI Score
                </span>
              </div>
              <div className="ml-auto flex flex-col items-end gap-1">
                <Badge
                  variant={overallScore >= 100 ? 'default' : overallScore >= 90 ? 'secondary' : 'destructive'}
                >
                  {ragLabel(overallScore, 100)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {result.periodKey} · computed {new Date(result.computedAt).toLocaleDateString()}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Loading score…' : 'No score computed yet for this agreement.'}
              </p>
              {!isLoading && (
                <Button size="sm" onClick={handleCompute} disabled={computing}>
                  {computing ? 'Computing…' : 'Compute Score Now'}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* No active agreements */}
      {!agreementId && !isLoading && (
        <div className="rounded-lg border bg-muted/30 px-6 py-10 text-center text-muted-foreground text-sm">
          No active KPI agreements. Create and accept an agreement to view your dashboard.
        </div>
      )}

      {/* Per-area breakdown */}
      {areaScores.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Area Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {areaScores.map((area) => {
              const pct = Math.min(Math.round(area.score), 100);
              const ragCls = ragClass(area.score, 100);
              return (
                <div key={area.areaId} className={`rounded-lg border p-4 space-y-3 ${ragCls}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {area.areaName}
                    </span>
                    <span className="text-xs">Wt: {area.weight}%</span>
                  </div>
                  <div className="text-3xl font-extrabold tracking-tight leading-none">
                    {Math.round(area.score)}
                    <span className="text-base font-semibold ml-1 opacity-60">/100</span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="h-1.5 rounded-full bg-current opacity-20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-current opacity-100"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs opacity-75">{ragLabel(area.score, 100)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Re-compute button (when result exists) */}
      {result && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={handleCompute} disabled={computing}>
            {computing ? 'Recomputing…' : 'Recompute Score'}
          </Button>
        </div>
      )}
    </div>
  );
}
