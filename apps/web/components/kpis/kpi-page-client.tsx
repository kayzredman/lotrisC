'use client';

import type { KpiTrendRow } from '@lotris/types';
import { useCurrentUser } from '@/lib/api/hooks/useAuth';
import { useDashboardSummary } from '@/lib/api/hooks/useDashboard';
import { useKpiTrends, useMyKpiTrends } from '@/lib/api/hooks/useAnalytics';
import { useKpiActuals, useKpiDefinitions } from '@/lib/api/hooks/useKpi';
import { EmptyState } from '@/components/ui/empty-state';
import { CheckCircle, XCircle, BarChart2, Users } from 'lucide-react';

// ── Sparkline component (SVG, 7-point) ────────────────────────────────────────
interface SparklineProps {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}
function Sparkline({ values, color = '#6366f1', width = 80, height = 28 }: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height * 0.85 - height * 0.075;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Warning level pill ────────────────────────────────────────────────────────
function WarningPill({ level }: { level: 'NONE' | 'AMBER' | 'RED' }) {
  if (level === 'NONE') return null;
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    borderRadius: 10,
    padding: '2px 8px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.3px',
    background: level === 'RED' ? '#fee2e2' : '#fef3c7',
    color:      level === 'RED' ? '#dc2626' : '#d97706',
  };
  return <span style={style}>{level === 'RED' ? '🔴 At risk' : '🟡 Trending low'}</span>;
}

// ── Format a numeric actual value for display ──────────────────────────────────
function formatKpiValue(value: number, metricType: string, _direction: string): string {
  if (metricType === 'TIME_HOURS') return `${value.toFixed(1)} hrs`;
  if (metricType === 'TIME_MINUTES') return `${Math.round(value)}m`;
  if (metricType === 'SCORE') return `${value.toFixed(1)} / 5`;
  if (metricType === 'PERCENTAGE') return `${value.toFixed(1)}%`;
  return String(value);
}

function formatKpiTarget(target: number, metricType: string, direction: string): string {
  const op = direction === 'LOWER_BETTER' ? '≤' : '≥';
  if (metricType === 'TIME_HOURS') return `${op} ${target} hrs`;
  if (metricType === 'TIME_MINUTES') return `${op} ${target}m`;
  if (metricType === 'SCORE') return `${op} ${target}`;
  if (metricType === 'PERCENTAGE') return `${op} ${target}%`;
  return `${op} ${target}`;
}

export default function KpiPageClient() {
  // Live data
  const { data: definitionsRaw } = useKpiDefinitions({ staleTime: 60_000 });
  const { data: actuals } = useKpiActuals({}, { staleTime: 30_000 });
  const { data: summary } = useDashboardSummary({ staleTime: 30_000 });
  const { data: me } = useCurrentUser({ staleTime: 300_000 });

  const definitions = (Array.isArray(definitionsRaw)
    ? definitionsRaw
    : (definitionsRaw as { definitions?: unknown[] } | undefined)?.definitions ?? []) as Array<Record<string, unknown>>;

  const isManager = me?.roleName === 'IT_MANAGER' || me?.roleName === 'ADMIN' || me?.roleName === 'SUPERADMIN' || me?.roleName === 'TEAM_LEAD';
  const { data: myTrendsRaw } = useMyKpiTrends({ staleTime: 120_000, enabled: !isManager });
  const { data: allTrendsRaw } = useKpiTrends({ staleTime: 120_000, enabled: !!isManager });
  const trends = (isManager
    ? (Array.isArray(allTrendsRaw) ? allTrendsRaw : (allTrendsRaw as { trends?: KpiTrendRow[] } | undefined)?.trends ?? [])
    : (Array.isArray(myTrendsRaw) ? myTrendsRaw : (myTrendsRaw as { trends?: KpiTrendRow[] } | undefined)?.trends ?? [])) as KpiTrendRow[];

  // Map kpiDefId → trend row for quick lookup
  const trendByKpiId = new Map(trends.map((t) => [t.kpiDefId, t]));

  // Average actuals per kpiDefinitionId
  const avgByDefInit: Record<string, { sum: number; count: number }> = {};
  const avgByDef = ((actuals ?? []) as Array<Record<string, unknown>>).reduce((acc, a) => {
    if (!a.kpiDefinitionId) return acc;
    const k = a.kpiDefinitionId as string;
    if (!acc[k]) acc[k] = { sum: 0, count: 0 };
    (acc[k] as { sum: number; count: number }).sum += Number(a.value);
    (acc[k] as { sum: number; count: number }).count += 1;
    return acc;
  }, avgByDefInit) as Record<string, { sum: number; count: number }>;

  const kpiCards = definitions.map((def) => {
        const agg = avgByDef[def.id as string];
        const avg = agg ? agg.sum / agg.count : null;
        const target = Number(def.defaultTarget);
        const onTarget = avg !== null
          ? (def.direction === 'LOWER_BETTER' ? avg <= target : avg >= target)
          : true;
        const trend = trendByKpiId.get(def.id as string);
        return {
          id: def.id as string,
          name: def.name as string,
          value: avg !== null ? formatKpiValue(avg, def.metricType as string, def.direction as string) : '–',
          target: formatKpiTarget(target, def.metricType as string, def.direction as string),
          status: onTarget ? 'on' : 'below',
          badge: onTarget ? 'v2-badge-green' : 'v2-badge-yellow',
          color: onTarget ? 'var(--green)' : 'var(--yellow)',
          warningLevel: (trend?.warningLevel ?? 'NONE') as 'NONE' | 'AMBER' | 'RED',
          sparkValues: trend
            ? [trend.actualToDate * 0.90, trend.actualToDate * 0.94, trend.actualToDate * 0.97, trend.actualToDate, trend.projectedEop * 0.99, trend.projectedEop]
            : null,
          sparkColor: trend?.warningLevel === 'RED' ? '#dc2626' : trend?.warningLevel === 'AMBER' ? '#d97706' : '#6366f1',
        };
      });

  const overallScoreRaw = (summary as { kpiScore?: number } | undefined)?.kpiScore;
  const overallScore   = overallScoreRaw != null ? Math.round(overallScoreRaw) : '—';
  const onTargetCount  = kpiCards.filter(k => k.status === 'on').length;
  const belowCount     = kpiCards.filter(k => k.status === 'below').length;

  const firstResponse  = kpiCards.find(k => k.name.toLowerCase().includes('first'))?.value  ?? '—';
  const slaCompliance  = kpiCards.find(k => k.name.toLowerCase().includes('sla'))?.value    ?? '—';
  const csat           = kpiCards.find(k => k.name.toLowerCase().includes('csat'))?.value   ?? '—';
  const resolutionTime = kpiCards.find(k => k.name.toLowerCase().includes('resolution time'))?.value ?? '—';

  return (
    <div>
      {/* Page header */}
      <div className="v2-page-header">
        <div>
          <h1>KPI Performance</h1>
          <p>Live performance metrics and SLA compliance</p>
        </div>
        <div className="v2-page-header-actions">
          <select className="v2-select">
            <option>May 2026</option>
            <option>April 2026</option>
            <option>Q1 2026</option>
          </select>
          <button type="button" className="v2-btn v2-btn-secondary v2-btn-sm">
            <BarChart2 size={12} /> Export Report
          </button>
        </div>
      </div>

      {/* Score hero */}
      <div
        className="v2-card"
        style={{ background: 'linear-gradient(135deg,#4F46E5 0%,#6366F1 100%)', marginBottom: 20, border: 'none' }}
      >
        <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Overall KPI Score</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: 'white', letterSpacing: -2, lineHeight: 1 }}>{overallScore}{typeof overallScore === 'number' && <span style={{ fontSize: 28 }}>%</span>}</div>
            {typeof overallScore === 'number' && (
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
                Based on {kpiCards.length} active KPI{kpiCards.length === 1 ? '' : 's'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'SLA Compliance',     value: slaCompliance  },
              { label: 'Avg CSAT',           value: csat.split(' ')[0] ?? csat },
              { label: 'Avg Resolution',     value: resolutionTime },
              { label: 'First Contact Res.', value: firstResponse  },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: -0.5 }}>{s.value}</div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', marginTop: 2, whiteSpace: 'nowrap' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle size={12} /> {onTargetCount} on target
            </span>
            <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#fca5a5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <XCircle size={12} /> {belowCount} below target
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards grid */}
      <div className="v2-grid-3" style={{ marginBottom: 20 }}>
        {kpiCards.length === 0 ? (
          <div className="v2-card" style={{ gridColumn: '1 / -1' }}>
            <EmptyState title="No KPI definitions configured" message="KPI metrics will appear once definitions and actuals are set up." />
          </div>
        ) : kpiCards.map(kpi => (
          <div className="v2-card" key={kpi.name} style={
            kpi.warningLevel === 'RED'   ? { borderLeft: '3px solid #dc2626' } :
            kpi.warningLevel === 'AMBER' ? { borderLeft: '3px solid #d97706' } :
            undefined
          }>
            <div className="v2-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{kpi.name}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className={`v2-badge ${kpi.badge}`}>{kpi.status === 'on' ? '✓ On Target' : '⚠ Below'}</span>
                  <WarningPill level={kpi.warningLevel} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color, letterSpacing: -0.8, marginBottom: 4 }}>{kpi.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Target: <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{kpi.target}</span></div>
                </div>
                {kpi.sparkValues && (
                  <div style={{ opacity: 0.85, marginBottom: 4 }}>
                    <Sparkline values={kpi.sparkValues} color={kpi.sparkColor} />
                    <div style={{ fontSize: 9, color: 'var(--text-light)', textAlign: 'right', marginTop: 2 }}>trend →</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="v2-grid-2">
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Score by Department</div>
            <span className="v2-card-subtitle">Current period</span>
          </div>
          <div className="v2-card-body">
            <EmptyState
              icon={<Users size={20} style={{ color: 'var(--text-light)' }} />}
              title="Department scores coming soon"
              message="Team-level KPI rollups will appear here once configured."
            />
          </div>
        </div>

        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">SLA Compliance by Priority</div>
            <span className="v2-card-subtitle">Target ≥ 95%</span>
          </div>
          <div className="v2-card-body">
            <EmptyState
              title="Priority SLA breakdown coming soon"
              message="Per-priority compliance will be sourced from analytics rollups."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
