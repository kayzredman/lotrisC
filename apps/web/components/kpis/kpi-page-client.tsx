'use client';

import { trpc } from '@/lib/trpc/client';
import { CheckCircle, XCircle, BarChart2, Users } from 'lucide-react';

// ── Marketing demo fallback data (match 04-kpis-v2.html exactly) ─────────────
const DEMO_KPI_CARDS = [
  { name: 'First Response Time',    value: '1.4 hrs',  target: '≤ 2 hrs',   status: 'on',   badge: 'v2-badge-green',  color: 'var(--green)'  },
  { name: 'SLA Compliance',         value: '92%',      target: '≥ 95%',     status: 'below',badge: 'v2-badge-yellow', color: 'var(--yellow)' },
  { name: 'Resolution Rate',        value: '98%',      target: '≥ 95%',     status: 'on',   badge: 'v2-badge-green',  color: 'var(--green)'  },
  { name: 'CSAT Score',             value: '4.7 / 5',  target: '≥ 4.2',     status: 'on',   badge: 'v2-badge-green',  color: 'var(--green)'  },
  { name: 'Avg Resolution Time',    value: '3.2 hrs',  target: '≤ 4 hrs',   status: 'on',   badge: 'v2-badge-green',  color: 'var(--green)'  },
  { name: 'Reopen Rate',            value: '2.1%',     target: '≤ 5%',      status: 'on',   badge: 'v2-badge-green',  color: 'var(--green)'  },
];

const DEPT_SCORES = [
  { dept: 'IT Support',   score: 97, color: 'var(--green)'  },
  { dept: 'Network Ops',  score: 95, color: 'var(--green)'  },
  { dept: 'Security',     score: 93, color: 'var(--blue)'   },
  { dept: 'Service Desk', score: 91, color: 'var(--blue)'   },
  { dept: 'DB Team',      score: 88, color: 'var(--yellow)' },
];

const SLA_PRIORITY = [
  { priority: 'Critical', pct: 84, target: 95, color: 'var(--red)'    },
  { priority: 'High',     pct: 91, target: 95, color: 'var(--orange)' },
  { priority: 'Medium',   pct: 96, target: 95, color: 'var(--green)'  },
  { priority: 'Low',      pct: 99, target: 95, color: 'var(--green)'  },
];

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
  const { data: definitions } = trpc['kpi.definitions.list'].useQuery(undefined, { staleTime: 60_000 });
  const { data: actuals }     = trpc['kpi.actuals.list'].useQuery({}, { staleTime: 30_000 });
  const { data: summary }     = trpc['dashboard.summary'].useQuery(undefined, { staleTime: 30_000 });

  // Average actuals per kpiDefinitionId
  const avgByDefInit: Record<string, { sum: number; count: number }> = {};
  const avgByDef = (actuals ?? []).reduce((acc, a) => {
    if (!a.kpiDefinitionId) return acc;
    const k = a.kpiDefinitionId;
    if (!acc[k]) acc[k] = { sum: 0, count: 0 };
    (acc[k] as { sum: number; count: number }).sum += Number(a.value);
    (acc[k] as { sum: number; count: number }).count += 1;
    return acc;
  }, avgByDefInit);

  // Build KPI cards from live definitions + actuals; fall back to DEMO
  const kpiCards = (definitions && definitions.length > 0)
    ? definitions.map((def) => {
        const agg = avgByDef[def.id];
        const avg = agg ? agg.sum / agg.count : null;
        const target = Number(def.defaultTarget);
        const onTarget = avg !== null
          ? (def.direction === 'LOWER_BETTER' ? avg <= target : avg >= target)
          : true;
        return {
          name: def.name,
          value: avg !== null ? formatKpiValue(avg, def.metricType, def.direction) : '–',
          target: formatKpiTarget(target, def.metricType, def.direction),
          status: onTarget ? 'on' : 'below',
          badge: onTarget ? 'v2-badge-green' : 'v2-badge-yellow',
          color: onTarget ? 'var(--green)' : 'var(--yellow)',
        };
      })
    : DEMO_KPI_CARDS;

  const overallScore   = summary?.kpiScore ?? 94;
  const onTargetCount  = kpiCards.filter(k => k.status === 'on').length;
  const belowCount     = kpiCards.filter(k => k.status === 'below').length;

  // Hero sub-stats — from averages or DEMO
  const firstResponse  = kpiCards.find(k => k.name.toLowerCase().includes('first'))?.value  ?? '1.4 hrs';
  const slaCompliance  = kpiCards.find(k => k.name.toLowerCase().includes('sla'))?.value    ?? '92%';
  const csat           = kpiCards.find(k => k.name.toLowerCase().includes('csat'))?.value   ?? '4.7';
  const resolutionTime = kpiCards.find(k => k.name.toLowerCase().includes('resolution time'))?.value ?? '3.2h';

  return (
    <div>
      {/* Page header */}
      <div className="v2-page-header">
        <div>
          <h1>KPI Performance</h1>
          <p>May 2026 — real-time performance metrics and SLA compliance</p>
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
            <div style={{ fontSize: 48, fontWeight: 900, color: 'white', letterSpacing: -2, lineHeight: 1 }}>{Math.round(overallScore)}<span style={{ fontSize: 28 }}>%</span></div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: '#86efac', fontWeight: 700 }}>▲ +2.1%</span> vs April 2026
            </div>
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
        {kpiCards.map(kpi => (
          <div className="v2-card" key={kpi.name}>
            <div className="v2-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{kpi.name}</span>
                <span className={`v2-badge ${kpi.badge}`}>{kpi.status === 'on' ? '✓ On Target' : '⚠ Below'}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color, letterSpacing: -0.8, marginBottom: 4 }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Target: <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{kpi.target}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row: Dept scores + SLA by priority */}
      <div className="v2-grid-2">
        {/* Dept scores */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">Score by Department</div>
            <span className="v2-card-subtitle">May 2026</span>
          </div>
          <div className="v2-card-body">
            {DEPT_SCORES.map(d => (
              <div key={d.dept} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div className="v2-avatar-sm" style={{ background: `${d.color}22`, color: d.color }}>
                      <Users size={10} />
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{d.dept}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: d.color }}>{d.score}%</span>
                </div>
                <div className="v2-progress-bg">
                  <div className="v2-progress-fill" style={{ width: `${d.score}%`, background: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SLA by priority */}
        <div className="v2-card">
          <div className="v2-card-header">
            <div className="v2-card-title">SLA Compliance by Priority</div>
            <span className="v2-card-subtitle">Target ≥ 95%</span>
          </div>
          <div className="v2-card-body">
            {SLA_PRIORITY.map(s => {
              const met = s.pct >= s.target;
              return (
                <div key={s.priority} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`v2-dot v2-dot-${s.priority.toLowerCase()}`} />
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{s.priority}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.pct}%</span>
                      <span className={`v2-badge ${met ? 'v2-badge-green' : 'v2-badge-red'}`} style={{ fontSize: 9.5 }}>
                        {met ? 'On track' : 'Below'}
                      </span>
                    </div>
                  </div>
                  <div className="v2-progress-bg">
                    <div className="v2-progress-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
