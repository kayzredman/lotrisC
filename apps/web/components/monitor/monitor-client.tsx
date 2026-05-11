'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { MonitorProviders } from '@/components/monitor/monitor-providers';
import {
  AlertTriangle, CheckCircle2, Activity,
  TrendingUp, Layers, RefreshCw, Zap, Sun, Moon,
} from 'lucide-react';

// ── Theme ──────────────────────────────────────────────────────────────────

type TC = {
  bg: string; cardBg: string; topbarBg: string;
  text: string; textMuted: string; textDim: string;
  border: string; borderSub: string;
  barTrack: string; skeletonBg: string;
  dim: (hex: string) => string;
  cardBorder: (hex: string) => string;
};

const DARK: TC = {
  bg: '#080d1a', cardBg: 'rgba(15,23,42,0.85)', topbarBg: 'rgba(8,13,26,0.96)',
  text: '#e2e8f0', textMuted: '#64748b', textDim: '#475569',
  border: 'rgba(255,255,255,0.07)', borderSub: 'rgba(255,255,255,0.04)',
  barTrack: 'rgba(255,255,255,0.06)', skeletonBg: 'rgba(255,255,255,0.05)',
  dim: (hex) => `${hex}22`,
  cardBorder: (hex) => `${hex}30`,
};

const LIGHT: TC = {
  bg: '#c8d3e0', cardBg: '#ffffff', topbarBg: 'rgba(255,255,255,0.97)',
  text: '#0f172a', textMuted: '#64748b', textDim: '#94a3b8',
  border: '#b0bccc', borderSub: '#c8d3e0',
  barTrack: '#d4dce8', skeletonBg: '#d4dce8',
  dim: (hex) => `${hex}20`,
  cardBorder: (hex) => `${hex}66`,
};

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  NEW: '#6366f1', TEAM_ASSIGNED: '#8b5cf6', UNASSIGNED: '#f59e0b',
  ASSIGNED: '#3b82f6', IN_PROGRESS: '#06b6d4', ESCALATED: '#ef4444',
  RESOLVED: '#10b981', CLOSED: '#6b7280',
};

const P_LABEL: Record<number, string> = {
  1: 'P1 CRITICAL', 2: 'P2 HIGH', 3: 'P3 MEDIUM', 4: 'P4 LOW',
};
const P_COLOR: Record<number, string> = {
  1: '#ef4444', 2: '#f97316', 3: '#f59e0b', 4: '#6b7280',
};

const REFRESH_MS = 30_000;

// ── Dashboard ──────────────────────────────────────────────────────────────

function MonitorDashboard() {
  const [isDark, setIsDark] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [tick, setTick] = useState(0);
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000);

  // Persist theme
  useEffect(() => {
    const saved = localStorage.getItem('lotris-monitor-theme');
    if (saved === 'light') setIsDark(false);
  }, []);
  useEffect(() => {
    localStorage.setItem('lotris-monitor-theme', isDark ? 'dark' : 'light');
    document.body.style.background = isDark ? '#080d1a' : '#f1f5f9';
  }, [isDark]);

  const t = isDark ? DARK : LIGHT;

  const { data, isLoading, refetch } = trpc['monitor.stats'].useQuery(undefined, {
    refetchInterval: REFRESH_MS,
    onSuccess: () => setLastRefresh(new Date()),
  } as Parameters<typeof trpc['monitor.stats']['useQuery']>[1]);

  // Countdown
  useEffect(() => {
    setCountdown(REFRESH_MS / 1000);
    const iv = setInterval(() => setCountdown((c) => (c <= 1 ? REFRESH_MS / 1000 : c - 1)), 1000);
    return () => clearInterval(iv);
  }, [lastRefresh]);

  // Blink
  useEffect(() => {
    const iv = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const totalOpen   = data?.totalOpen   ?? 0;
  const slaBreach   = data?.slaBreach   ?? 0;
  const resolved24h = data?.resolved24h ?? 0;
  const teams       = data?.teams       ?? [];
  const topTickets  = data?.topTickets  ?? [];

  const maxTeamLoad = Math.max(...teams.map((tm) => tm.open + tm.inProgress + tm.escalated), 1);
  // Duration: 5 s per ticket so all cards are readable at a slow scroll
  const tickerDuration = `${Math.max(topTickets.length * 5, 25)}s`;

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Topbar ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 28px',
        borderBottom: `1px solid ${t.border}`,
        background: t.topbarBg,
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: isDark ? 'none' : '0 1px 12px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: t.text }}>Lotris Ops Monitor</div>
            <div style={{ fontSize: 10.5, color: t.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live Operations Wall</div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: tick % 2 === 0 ? '#10b981' : '#059669',
              boxShadow: '0 0 6px #10b981',
            }} />
            <span style={{ fontSize: 11.5, color: '#10b981', fontWeight: 600 }}>LIVE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: t.textMuted, fontSize: 12 }}>
            <RefreshCw size={12} />
            <span>Refresh in {countdown}s</span>
          </div>
          <span style={{ fontSize: 12, color: t.textDim }}>Updated {lastRefresh.toLocaleTimeString()}</span>
          <button onClick={() => refetch()} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 11px', borderRadius: 6,
            background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.35)',
            color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            <RefreshCw size={11} /> Refresh
          </button>

          {/* Light / Dark toggle */}
          <button
            onClick={() => setIsDark((d) => !d)}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 8,
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              border: `1px solid ${t.border}`,
              color: isDark ? '#fbbf24' : '#6366f1',
              cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
            }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>

      <div style={{ padding: '18px 28px', maxWidth: 1600, margin: '0 auto' }}>

        {/* ── Hero KPI cards ────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
          <StatCard icon={<Layers size={20} />}       label="Open Tickets"    value={totalOpen}   accent="#6366f1" t={t} loading={isLoading} />
          <StatCard icon={<AlertTriangle size={20} />} label="SLA Breached"   value={slaBreach}   accent="#ef4444" t={t} loading={isLoading} pulse={slaBreach > 0} />
          <StatCard icon={<CheckCircle2 size={20} />}  label="Resolved (24h)" value={resolved24h} accent="#10b981" t={t} loading={isLoading} />
          <StatCard icon={<Zap size={20} />}           label="Total in Queue"
            value={teams.reduce((s, tm) => s + tm.open + tm.inProgress, 0)}
            accent="#f97316" t={t} loading={isLoading} />
        </div>

        {/* ── Main grid ─────────────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20,
          height: 'calc(100vh - 305px)',
        }}>
          {/* Left: Team queue bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', paddingRight: 2 }}>
            <SectionTitle icon={<TrendingUp size={14} />} label="Queue Depth by Team" t={t} />
            {isLoading && <SkeletonRows n={4} t={t} />}
            {!isLoading && teams.length === 0 && <EmptyState message="No active teams found" t={t} />}
            {teams.map((team) => {
              const openPct  = (team.open       / maxTeamLoad) * 100;
              const progPct  = (team.inProgress / maxTeamLoad) * 100;
              const escalPct = (team.escalated  / maxTeamLoad) * 100;
              return (
                <div key={team.teamName} style={{
                  background: t.cardBg, borderRadius: 12,
                  border: `1px solid ${t.border}`, padding: '14px 18px', flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5, color: t.text }}>{team.teamName}</span>
                    <div style={{ display: 'flex', gap: 7 }}>
                      <Chip label={`${team.open} open`}             color="#6366f1" />
                      <Chip label={`${team.inProgress} active`}     color="#06b6d4" />
                      {team.escalated > 0 && <Chip label={`${team.escalated} escalated`} color="#ef4444" />}
                    </div>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: t.barTrack, display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: `${openPct}%`,  background: '#6366f1', transition: 'width 0.7s ease' }} />
                    <div style={{ width: `${progPct}%`,  background: '#06b6d4', transition: 'width 0.7s ease' }} />
                    <div style={{ width: `${escalPct}%`, background: '#ef4444', transition: 'width 0.7s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Animated priority ticker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
            <SectionTitle icon={<AlertTriangle size={14} />} label={`Priority Tickets (${topTickets.length})`} t={t} />

            {isLoading && <SkeletonRows n={5} height={76} t={t} />}
            {!isLoading && topTickets.length === 0 && <EmptyState message="No open tickets — all clear!" t={t} />}

            {!isLoading && topTickets.length > 0 && (
              <div
                style={{
                  flex: 1, overflow: 'hidden', position: 'relative',
                  // Fade edges for smooth in/out
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
                }}
                onMouseEnter={(e) => {
                  const inner = e.currentTarget.firstElementChild as HTMLElement | null;
                  if (inner) inner.style.animationPlayState = 'paused';
                }}
                onMouseLeave={(e) => {
                  const inner = e.currentTarget.firstElementChild as HTMLElement | null;
                  if (inner) inner.style.animationPlayState = 'running';
                }}
              >
                {/* Duplicate list for seamless loop: -50% = one full set */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 9,
                  animation: `tickerScroll ${tickerDuration} linear infinite`,
                }}>
                  {[...topTickets, ...topTickets].map((tk, i) => (
                    <div key={`${tk.id}-${i}`} style={{
                      background: t.cardBg, borderRadius: 9,
                      border: `1px solid ${t.cardBorder(P_COLOR[tk.priority] ?? '#334155')}`,
                      padding: '10px 13px',
                      borderLeft: `3px solid ${P_COLOR[tk.priority] ?? '#334155'}`,
                      flexShrink: 0,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12.5, fontWeight: 600, color: t.text,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {tk.title}
                          </div>
                          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>
                            {tk.teamName} · {tk.id.slice(-6).toUpperCase()}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                          background: t.dim(P_COLOR[tk.priority] ?? '#334155'),
                          color: P_COLOR[tk.priority] ?? '#94a3b8',
                          letterSpacing: '0.03em', flexShrink: 0,
                        }}>
                          {P_LABEL[tk.priority] ?? `P${tk.priority}`}
                        </span>
                      </div>
                      <div style={{ marginTop: 7 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                          background: t.dim(STATUS_COLORS[tk.status] ?? '#334155'),
                          color: STATUS_COLORS[tk.status] ?? '#94a3b8',
                        }}>
                          {tk.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Status legend ─────────────────────────────────────────── */}
        <div style={{
          marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 12,
          padding: '11px 18px',
          background: t.cardBg, border: `1px solid ${t.border}`,
          borderRadius: 10,
        }}>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
              <span style={{ color: t.textMuted, textTransform: 'capitalize' }}>{status.replace(/_/g, ' ')}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 11, color: t.textDim }}>
            Auto-refreshes every {REFRESH_MS / 1000}s · Hover ticker to pause
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, accent, t, loading = false, pulse = false,
}: {
  icon: React.ReactNode; label: string; value: number;
  accent: string; t: TC; loading?: boolean; pulse?: boolean;
}) {
  return (
    <div style={{
      background: t.cardBg, border: `1px solid ${t.cardBorder(accent)}`,
      borderRadius: 14, padding: '18px 20px',
      position: 'relative', overflow: 'hidden',
    }}>
      {pulse && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 14,
          background: `${accent}07`, animation: 'pulse 2s infinite',
        }} />
      )}
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: t.dim(accent),
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent,
      }}>
        {icon}
      </div>
      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ height: 32, width: 68, borderRadius: 6, background: t.skeletonBg }} />
        ) : (
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, color: accent, letterSpacing: '-0.03em' }}>
            {value}
          </div>
        )}
        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, label, t }: { icon: React.ReactNode; label: string; t: TC }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      fontSize: 11.5, fontWeight: 700, color: t.textMuted,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      paddingBottom: 6, borderBottom: `1px solid ${t.borderSub}`,
      flexShrink: 0,
    }}>
      <span style={{ color: '#6366f1' }}>{icon}</span>
      {label}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
      background: `${color}20`, color,
    }}>
      {label}
    </span>
  );
}

function SkeletonRows({ n, height = 78, t }: { n: number; height?: number; t: TC }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{
          height, borderRadius: 12, flexShrink: 0,
          background: t.skeletonBg, animation: 'pulse 1.5s infinite',
        }} />
      ))}
    </>
  );
}

function EmptyState({ message, t }: { message: string; t: TC }) {
  return (
    <div style={{ padding: '28px 0', textAlign: 'center', color: t.textDim, fontSize: 13 }}>
      {message}
    </div>
  );
}

// ── Page export ────────────────────────────────────────────────────────────

export default function MonitorClient() {
  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
        @keyframes tickerScroll { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
      <MonitorProviders>
        <MonitorDashboard />
      </MonitorProviders>
    </>

  );
}
