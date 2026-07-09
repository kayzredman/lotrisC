'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, AnimatePresence, type Variants } from 'framer-motion';
import Link from 'next/link';
import { LotrisMark } from '@/components/brand/lotris-mark';

// ─── Animation Variants ──────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: EASE } },
};

const fadeRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: EASE } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

// ─── Brand Mark ──────────────────────────────────────────────────────────────
// LotrisMark is imported from @/components/brand/lotris-mark

const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─── CSS Mockup: Ticket Queue ─────────────────────────────────────────────────

function TicketQueueMockup() {
  const tickets = [
    { id: 'TK-4821', priority: 'CRITICAL', color: '#ef4444', label: 'VPN unreachable — HQ', sla: '0:47', badge: 'BREACH' },
    { id: 'TK-4820', priority: 'HIGH', color: '#f59e0b', label: 'Outlook crashes on sign-in', sla: '2:14', badge: null },
    { id: 'TK-4819', priority: 'MEDIUM', color: '#eab308', label: 'Printer offline — Floor 3', sla: '6:30', badge: null },
    { id: 'TK-4818', priority: 'LOW', color: '#22c55e', label: 'New user account setup', sla: '18:00', badge: null },
  ];

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.10)', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ background: '#0c0e1a', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>TICKET QUEUE</span>
        <div style={{ background: '#ef444433', borderRadius: 20, padding: '2px 8px', fontSize: 10, color: '#ef4444', fontWeight: 700 }}>1 BREACH</div>
      </div>
      {/* Tickets */}
      {tickets.map((t, i) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 + 0.3 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
            borderBottom: i < tickets.length - 1 ? '1px solid #f1f5f9' : 'none',
            background: t.badge ? '#fff5f5' : '#fff',
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{t.label}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{t.id}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {t.badge && (
              <span style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 800, color: '#ef4444', letterSpacing: '0.05em' }}>{t.badge}</span>
            )}
            <span style={{ fontSize: 10, color: t.badge ? '#ef4444' : '#64748b', fontWeight: t.badge ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>⏱ {t.sla}</span>
          </div>
        </motion.div>
      ))}
      {/* Footer bar */}
      <div style={{ padding: '8px 16px', background: '#f8fafc', display: 'flex', gap: 8 }}>
        <button style={{ flex: 1, padding: '5px 0', background: '#4f46e5', border: 'none', borderRadius: 6, fontSize: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Pick Up</button>
        <button style={{ flex: 1, padding: '5px 0', background: '#f1f5f9', border: 'none', borderRadius: 6, fontSize: 10, color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Assign</button>
      </div>
    </div>
  );
}

// ─── CSS Mockup: KPI Dashboard ────────────────────────────────────────────────

function KpiDashboardMockup() {
  const bars = [65, 80, 72, 88, 76, 94, 91];
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];

  return (
    <div style={{ background: '#0c0e1a', borderRadius: 14, border: '1px solid #1e293b', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', fontFamily: 'inherit' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
        <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>KPI DASHBOARD</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4f46e5', background: 'rgba(79,70,229,0.15)', borderRadius: 20, padding: '2px 8px' }}>Live</span>
      </div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 12px 8px' }}>
        {[
          { label: 'SLA Rate', value: '94%', trend: '+2%', up: true },
          { label: 'Resolved', value: '247', trend: '+18', up: true },
          { label: 'CSAT', value: '4.7★', trend: '+0.2', up: true },
        ].map((s) => (
          <div key={s.label} style={{ background: '#1e293b', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 500, marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#22c55e', marginTop: 2 }}>↑ {s.trend}</div>
          </div>
        ))}
      </div>
      {/* Bar chart */}
      <div style={{ padding: '4px 12px 12px' }}>
        <div style={{ fontSize: 9, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>SLA Compliance — Last 7 Months</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 50 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <motion.div
                initial={{ height: 0 }}
                whileInView={{ height: `${h * 0.5}px` }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 + 0.4, duration: 0.5, ease: 'easeOut' }}
                style={{
                  width: '100%', borderRadius: 3,
                  background: i === bars.length - 1 ? '#4f46e5' : '#334155',
                }}
              />
              <span style={{ fontSize: 7, color: '#475569' }}>{months[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CSS Mockup: Workload Balancer ────────────────────────────────────────────

function WorkloadMockup() {
  const engineers = [
    { initials: 'JD', name: 'James D.', pct: 80, tickets: 8, max: 10, status: 'warn' },
    { initials: 'SK', name: 'Sarah K.', pct: 40, tickets: 4, max: 10, status: 'ok' },
    { initials: 'MT', name: 'Mike T.', pct: 100, tickets: 10, max: 10, status: 'over' },
    { initials: 'PL', name: 'Priya L.', pct: 20, tickets: 2, max: 10, status: 'ok' },
  ];

  const barColor = (s: string) => s === 'over' ? '#ef4444' : s === 'warn' ? '#f59e0b' : '#4f46e5';

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.10)', fontFamily: 'inherit' }}>
      <div style={{ background: '#0c0e1a', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>WORKLOAD BALANCER</span>
        <div style={{ background: '#f59e0b33', borderRadius: 20, padding: '2px 8px', fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>1 OVERLOADED</div>
      </div>
      <div style={{ padding: '8px 0' }}>
        {engineers.map((e, i) => (
          <motion.div
            key={e.initials}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 + 0.2 }}
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: barColor(e.status) + '22', border: `1.5px solid ${barColor(e.status)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: barColor(e.status), flexShrink: 0 }}>{e.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{e.name}</span>
                <span style={{ fontSize: 10, color: barColor(e.status), fontWeight: 700 }}>{e.tickets}/{e.max}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: '#f1f5f9', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${e.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.4, duration: 0.6 }}
                  style={{ height: '100%', borderRadius: 2, background: barColor(e.status) }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div style={{ margin: '0 16px 12px', padding: '8px 12px', background: 'rgba(79,70,229,0.06)', borderRadius: 8, border: '1px solid rgba(79,70,229,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f46e5', flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: '#4f46e5', fontWeight: 500 }}>Auto-reassigning 2 tickets from Mike T. → Priya L.</span>
      </div>
    </div>
  );
}

// ─── CSS Mockup: Reports ──────────────────────────────────────────────────────

function ReportsMockup() {
  const metrics = [
    { label: 'Resolution Rate', pct: 87, color: '#4f46e5' },
    { label: 'SLA Compliance', pct: 94, color: '#22c55e' },
    { label: 'First Response', pct: 91, color: '#0ea5e9' },
    { label: 'CSAT Score', pct: 94, color: '#f59e0b' },
  ];

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.10)', fontFamily: 'inherit' }}>
      <div style={{ background: 'linear-gradient(135deg, #0c0e1a 0%, #1e1b4b 100%)', padding: '16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, color: '#c7d2fe', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>Q2 2026 · ACME CORP</div>
          <div style={{ fontSize: 14, color: '#fff', fontWeight: 700 }}>Performance Report</div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>Generated automatically · Apr 1 – Jun 30</div>
        </div>
        <div style={{ background: 'rgba(79,70,229,0.25)', border: '1px solid rgba(199,210,254,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 9, color: '#c7d2fe', fontWeight: 600 }}>PDF READY</div>
      </div>
      <div style={{ padding: '12px 16px' }}>
        {metrics.map((m, i) => (
          <div key={m.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#334155', fontWeight: 500 }}>{m.label}</span>
              <span style={{ fontSize: 11, color: m.color, fontWeight: 700 }}>{m.pct}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${m.pct}%` }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 + 0.3, duration: 0.7 }}
                style={{ height: '100%', borderRadius: 3, background: m.color }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 8 }}>
        <button style={{ flex: 1, padding: '6px 0', background: '#4f46e5', border: 'none', borderRadius: 6, fontSize: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Export PDF</button>
        <button style={{ flex: 1, padding: '6px 0', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 10, color: '#334155', fontWeight: 600, cursor: 'pointer' }}>Email Team</button>
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'Intelligence', href: '#intelligence' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Security', href: '#security' },
] as const;

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Close drawer when user scrolls (they've committed to the page)
  useEffect(() => {
    if (!menuOpen) return;
    const fn = () => setMenuOpen(false);
    window.addEventListener('scroll', fn, { passive: true, once: true });
    return () => window.removeEventListener('scroll', fn);
  }, [menuOpen]);

  const frosted = scrolled || menuOpen;

  return (
    <>
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', padding: '0 24px', height: 64,
          background: frosted ? 'rgba(12,14,26,0.92)' : 'transparent',
          backdropFilter: frosted ? 'blur(18px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
          transition: 'background 0.3s, backdrop-filter 0.3s, border-color 0.3s',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
          <LotrisMark height={28} uid="nav" />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.04em' }}>Lotris</span>
        </div>

        {/* Desktop links — hidden on mobile */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 32, marginRight: 32 }}>
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href}
              style={{ fontSize: 14, color: '#94a3b8', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >{link.label}</a>
          ))}
        </div>

        {/* Desktop CTAs — hidden on mobile */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 10 }}>
          <Link href="/login"
            style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none', padding: '6px 14px', fontWeight: 500, transition: 'color 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >Sign in</Link>
          <Link href="/request-access"
            style={{ fontSize: 13, background: '#4f46e5', color: '#fff', textDecoration: 'none', padding: '7px 18px', borderRadius: 8, fontWeight: 600, transition: 'background 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#4338ca')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#4f46e5')}
          >Request Access</Link>
        </div>

        {/* Hamburger button — visible on mobile only */}
        <button
          className="md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {menuOpen ? (
              <motion.svg key="x" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
                initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.15 }}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </motion.svg>
            ) : (
              <motion.svg key="burger" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
                initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }} transition={{ duration: 0.15 }}>
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </motion.svg>
            )}
          </AnimatePresence>
        </button>
      </motion.nav>

      {/* Mobile drawer — slides down from nav bar */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-nav-drawer"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="md:hidden"
            style={{
              position: 'fixed', top: 64, left: 0, right: 0, zIndex: 99,
              background: 'rgba(10,12,24,0.97)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: '8px 24px 28px',
            }}
          >
            {/* Nav links */}
            <nav aria-label="Mobile navigation">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.2, ease: EASE }}
                  style={{
                    display: 'block', fontSize: 17, color: '#cbd5e1', textDecoration: 'none',
                    fontWeight: 500, padding: '14px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >{link.label}</motion.a>
              ))}
            </nav>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.22, ease: EASE }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}
            >
              <Link href="/request-access" onClick={() => setMenuOpen(false)}
                style={{ fontSize: 15, background: '#4f46e5', color: '#fff', textDecoration: 'none', padding: '13px 0', borderRadius: 10, fontWeight: 600, textAlign: 'center', display: 'block' }}
              >Request Access →</Link>
              <Link href="/login" onClick={() => setMenuOpen(false)}
                style={{ fontSize: 14, color: '#94a3b8', textDecoration: 'none', fontWeight: 500, textAlign: 'center', padding: '10px 0', display: 'block' }}
              >Sign in to your account</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Hero product preview (sample workspace — not live metrics) ───────────────

const HERO_QUEUE_ROWS = [
  { id: 'TKT-0491', title: 'VPN unreachable — HQ', priority: 'critical' as const, sla: '47m', highlight: true },
  { id: 'TKT-0488', title: 'Outlook sign-in failure', priority: 'high' as const, sla: '2h 14m', highlight: false },
  { id: 'TKT-0486', title: 'Printer offline — Floor 3', priority: 'medium' as const, sla: '6h 30m', highlight: false },
];

const PRIORITY_COLOR = { critical: '#ef4444', high: '#f59e0b', medium: '#eab308' };

function HeroProductPreview() {
  const stats = [
    { label: 'Open', value: '12', color: '#fff' },
    { label: 'SLA at risk', value: '2', color: '#f59e0b' },
    { label: 'Resolved MTD', value: '48', color: '#22c55e' },
    { label: 'KPI score', value: '91%', color: '#fff' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, delay: 0.4, ease: EASE }}
      style={{ width: '100%' }}
    >
      <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', background: '#0a0d18' }}>
        <div style={{ padding: '10px 14px', background: '#161b2e', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {(['#ef4444', '#f59e0b', '#22c55e'] as const).map((c) => (
              <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.75 }} />
            ))}
          </div>
          <div style={{ flex: 1, maxWidth: 280, margin: '0 auto', padding: '4px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
            app.yourcompany.local/dashboard
          </div>
        </div>
        <div style={{ padding: 14 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {stats.map((s) => (
              <div key={s.label} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Queue — sample workspace
          </div>
          {HERO_QUEUE_ROWS.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                borderTop: row.highlight ? '1px solid rgba(255,255,255,0.06)' : undefined,
                background: row.highlight ? 'rgba(239,68,68,0.06)' : 'transparent',
                fontSize: 12,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[row.priority], flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>{row.title}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{row.id}</div>
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{row.sla}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TrustChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
      {children}
    </span>
  );
}

function CapabilityPill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', fontSize: 12, color: '#cbd5e1' }}>
      {children}
    </span>
  );
}

// ─── Trust strip (replaces stock-photo marquee) ───────────────────────────────

function TrustStrip() {
  const verticals = ['Banking & finance', 'Telecom', 'Public sector', 'Enterprise IT', 'Managed services'];
  return (
    <div style={{ background: '#070a14', padding: '32px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
          Built for regulated IT operations
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {verticals.map((v) => (
            <TrustChip key={v}>{v}</TrustChip>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section style={{ position: 'relative', background: '#0c0e1a', overflow: 'hidden', padding: '110px 20px 56px' }}>
      {[
        { top: '8%', left: '3%', size: 480, color: 'rgba(79,70,229,0.16)', dur: 12 },
        { top: '50%', right: '3%', size: 380, color: 'rgba(139,92,246,0.12)', dur: 16 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.12, 1], x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', width: orb.size, height: orb.size, borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            top: orb.top, left: (orb as { left?: string }).left, right: (orb as { right?: string }).right,
            pointerEvents: 'none',
          }}
        />
      ))}

      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

      <div className="relative z-[1] max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">
        <div className="text-center md:text-left">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 100, padding: '5px 14px', fontSize: 12, color: '#a5b4fc', fontWeight: 600, marginBottom: 20 }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} />
            On-prem ITSM · Production-ready
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: EASE }}
            style={{ fontSize: 'clamp(32px, 4vw, 42px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 16px' }}
          >
            IT helpdesk operations you can prove — on your infrastructure.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            style={{ fontSize: 'clamp(16px, 2vw, 17px)', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 480 }}
          >
            Lotris structures tickets, SLAs, KPI agreements, workload balancing, and root-cause intelligence for regulated IT teams.
            Deploy on MSSQL with Entra ID, LDAP, or local identity — no cloud lock-in.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.34 }}
            className="flex flex-wrap gap-3 justify-center md:justify-start mb-6"
          >
            <Link href="/request-access"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#4f46e5', color: '#fff', textDecoration: 'none', padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#4338ca'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#4f46e5'; e.currentTarget.style.transform = 'none'; }}
            >
              Request access →
            </Link>
            <a href="#platform"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', textDecoration: 'none', padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 600, border: '1px solid rgba(255,255,255,0.12)', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            >
              View product tour
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="flex flex-wrap gap-2 justify-center md:justify-start mb-4"
          >
            {['MSSQL + Redis', 'Entra ID / LDAP', 'Docker on-prem', 'OpenAPI 3.1'].map((c) => (
              <TrustChip key={c}>{c}</TrustChip>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.52, duration: 0.6 }}
            className="flex flex-wrap gap-2 justify-center md:justify-start mb-3"
          >
            {['SLA queue engine', 'RCA & knowledge', 'KPI agreements', 'Ops & analytics'].map((c) => (
              <CapabilityPill key={c}>{c}</CapabilityPill>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.58, duration: 0.5 }}
            style={{ fontSize: 11, color: '#64748b' }}
          >
            Sample workspace shown · metrics reflect demo data, not live claims
          </motion.p>
        </div>

        <div className="w-full">
          <HeroProductPreview />
        </div>
      </div>
    </section>
  );
}

// ─── Pain Points Section ──────────────────────────────────────────────────────

const painPoints = [
  {
    img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&h=280&q=80',
    alt: 'IT support agent overwhelmed at desk with multiple screens',
    title: 'Tickets pile up with no structure',
    body: 'No queue ownership means the loudest request wins — not the most critical one.',
  },
  {
    img: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=600&h=280&q=80',
    alt: 'Alarm clock showing missed deadline',
    title: 'SLA breaches discovered too late',
    body: 'You only find out after the breach. By then the client is already unhappy.',
  },
  {
    img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&h=280&q=80',
    alt: 'IT team working together at computers',
    title: 'Engineer workloads invisible',
    body: 'Some engineers are drowning while others sit idle. Nobody has visibility to fix it.',
  },
  {
    img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&h=280&q=80',
    alt: 'Analyst staring at spreadsheet on laptop',
    title: 'KPIs living in spreadsheets',
    body: 'Data is stale by the time it lands in the report. Real-time tracking is impossible.',
  },
  {
    img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&h=280&q=80',
    alt: 'Business person manually compiling reports with documents',
    title: 'Reports compiled manually every time',
    body: 'Hours spent each week pulling data, formatting it, and emailing it. Every single time.',
  },
];

function PainPointsSection() {
  return (
    <section id="pain-points" style={{ padding: 'clamp(56px,8vw,100px) clamp(20px,5vw,40px)', background: '#fff' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Sound familiar?</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>
            IT support teams are fighting<br />the same battles every day.
          </h2>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 22 }}
        >
          {painPoints.map((p) => (
            <motion.div key={p.title} variants={fadeUp}
              whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(0,0,0,0.10)' }}
              style={{ border: '1px solid #f1f5f9', borderRadius: 16, background: '#fff', cursor: 'default', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
            >
              <div style={{ height: 176, overflow: 'hidden', position: 'relative' }}>
                <img src={p.img} alt={p.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0.38) 100%)' }} />
              </div>
              <div style={{ padding: '22px 24px 26px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.3 }}>{p.title}</h3>
                <p style={{ fontSize: 13.5, color: '#64748b', margin: 0, lineHeight: 1.65 }}>{p.body}</p>
              </div>
            </motion.div>
          ))}

          {/* Resolution card */}
          <motion.div key="resolution" variants={fadeUp}
            whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(79,70,229,0.14)' }}
            style={{ border: '1px solid rgba(79,70,229,0.18)', borderRadius: 16, background: '#fff', cursor: 'default', overflow: 'hidden', boxShadow: '0 2px 12px rgba(79,70,229,0.06)' }}
          >
            <div style={{ height: 176, overflow: 'hidden', position: 'relative' }}>
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&h=280&q=80"
                alt="Clean modern analytics dashboard"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(79,70,229,0.55) 0%, rgba(139,92,246,0.45) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 14, left: 18, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>The Solution</div>
            </div>
            <div style={{ padding: '22px 24px 26px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#4f46e5', margin: '0 0 8px', lineHeight: 1.3 }}>Lotris solves all of this.</h3>
              <p style={{ fontSize: 13.5, color: '#6366f1', margin: '0 0 18px', lineHeight: 1.65 }}>One platform — tickets, SLAs, KPIs, RCA, and knowledge — structured, automated, and reported.</p>
              <Link href="/request-access" style={{ fontSize: 13, fontWeight: 600, color: '#4f46e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Request access →
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Features Section ─────────────────────────────────────────────────────────

const features = [
  {
    tag: 'Ticket Management',
    title: 'Every ticket in its place. Every SLA tracked.',
    body: 'From the moment a ticket arrives — via web form, email-to-ticket, or API — it\'s categorised, routed to the right team queue, and SLA timers start running. Similar incidents surface automatically in the drawer.',
    bullets: ['Priority-based queue ordering', 'Auto-assignment on SLA breach', 'Full audit trail, tasks & escalation'],
    mockup: <TicketQueueMockup />,
    flip: false,
  },
  {
    tag: 'KPI Dashboard',
    title: 'Real-time performance. No spreadsheets.',
    body: 'Live KPI dashboards give every engineer, team lead, and executive the metrics they need — SLA compliance, resolution rate, MTTR — updated from MSSQL analytics rollups, not month-end exports.',
    bullets: ['Per-engineer & team-level metrics', 'Custom KPI targets & trend alerts', 'Historical trend charts built-in'],
    mockup: <KpiDashboardMockup />,
    flip: true,
  },
  {
    tag: 'Workload Balancing',
    title: 'No engineer drowning, none sitting idle.',
    body: 'Lotris enforces workload caps, visualises each engineer\'s capacity in real time, and surfaces rebalance suggestions — apply batch reassignment in one click before queues tip over.',
    bullets: ['Max-ticket-per-engineer enforcement', 'One-click rebalance suggestions', 'Visual capacity bars per team'],
    mockup: <WorkloadMockup />,
    flip: false,
  },
  {
    tag: 'Automated Reports',
    title: 'Reports that write themselves.',
    body: 'Quarterly performance reports, weekly SLA summaries, and on-demand exports — generated automatically with optional AI narratives and delivered to your inbox. No more manual compilation.',
    bullets: ['Scheduled email delivery (Hangfire)', 'PDF & Excel export', 'Multi-tenant isolation per org'],
    mockup: <ReportsMockup />,
    flip: true,
  },
];

function FeaturesSection() {
  return (
    <section id="platform" style={{ padding: 'clamp(48px,6vw,80px) clamp(20px,5vw,40px)', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 80 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>The Platform</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>
            Built for teams that need<br />to perform under pressure.
          </h2>
        </motion.div>

        {features.map((f, i) => (
          <div key={f.tag} style={{ display: 'flex', alignItems: 'center', gap: 64, marginBottom: 100, flexDirection: f.flip ? 'row-reverse' : 'row', flexWrap: 'wrap' }}>
            <motion.div
              variants={f.flip ? fadeRight : fadeLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              style={{ flex: '1 1 300px', minWidth: 280 }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>{f.tag}</div>
              <h3 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 16px' }}>{f.title}</h3>
              <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.65, margin: '0 0 24px' }}>{f.body}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {f.bullets.map((b) => (
                  <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155', fontWeight: 500 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(79,70,229,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: '#4f46e5' }}>✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              variants={f.flip ? fadeLeft : fadeRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              style={{ flex: '1 1 320px', minWidth: 300 }}
            >
              {f.mockup}
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Intelligence Platform (Phase 8) ─────────────────────────────────────────

const intelligenceFeatures = [
  {
    title: 'Problems register',
    body: 'Track active investigations with draft → review → approve workflow. Link multiple tickets to one problem — not every ticket needs an RCA.',
  },
  {
    title: 'RCA wizard',
    body: 'Six-step guided root-cause analysis with taxonomy, CAPA tracking, and lead sign-off. AI-assisted suggestions when your provider is connected.',
  },
  {
    title: 'Knowledge base & Q&A',
    body: 'Published RCAs and articles become searchable knowledge. Ask questions in natural language — grounded answers from your own content via semantic search.',
  },
  {
    title: 'AI report narratives',
    body: 'Optional AI summaries on scheduled and on-demand reports. Connect OpenAI, Claude, Azure OpenAI, or Copilot — tenant-configurable with usage controls.',
  },
  {
    title: 'Teams webhook alerts',
    body: 'Route critical problem and SLA events to Microsoft Teams channels alongside email and in-app SSE notifications.',
  },
  {
    title: 'Tenant feature toggles',
    body: 'Enable intelligence capabilities per organisation. On-prem deployments can run without external AI — or connect providers when ready.',
  },
];

function IntelligenceSection() {
  return (
    <section id="intelligence" style={{ padding: 'clamp(56px,8vw,100px) clamp(20px,5vw,40px)', background: '#0c0e1a', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(139,92,246,0.35)', background: 'rgba(139,92,246,0.1)', marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Intelligence Platform</span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
            From repeat incidents<br />to published knowledge.
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', margin: 0, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 }}>
            Lotris doesn&apos;t stop at closing tickets. Critical and fatal incidents trigger structured problem management — investigations become searchable knowledge your team owns.
          </p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}
        >
          {intelligenceFeatures.map((f) => (
            <motion.div key={f.title} variants={fadeUp}
              whileHover={{ y: -4, borderColor: 'rgba(139,92,246,0.35)' }}
              style={{ padding: '24px 22px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>{f.title}</div>
              <p style={{ fontSize: 13.5, color: '#64748b', margin: 0, lineHeight: 1.65 }}>{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Beyond Tickets (ops surfaces) ────────────────────────────────────────────

const opsFeatures = [
  { title: 'Tasks', body: 'Non-ticket work items alongside your queue — assign, track, and close operational tasks without polluting the ticket backlog.' },
  { title: 'Public intake', body: 'External requesters submit via /request — categorised, acknowledged by email, and routed into the right team queue automatically.' },
  { title: 'Email-to-ticket', body: 'IMAP ingestion turns inbound support mail into structured tickets with category routing and SLA timers from the first message.' },
  { title: 'Monitor wall', body: 'Unauthenticated NOC display at /monitor — live queue stats, SLA health, and breach counts for the ops floor or executive lobby.' },
  { title: 'Ops dashboard', body: 'System health, Redis/MSSQL/Qdrant status, Analytics ETL job controls, and SSE live updates — all in one admin surface.' },
  { title: 'Mobile pager', body: 'Expo-based iOS/Android thin client for push alerts, queue claim, and lead batch assign — extends Lotris beyond the desk (rolling out).' },
];

function OpsSurfacesSection() {
  return (
    <section style={{ padding: 'clamp(56px,8vw,100px) clamp(20px,5vw,40px)', background: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Beyond the ticket queue</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
            Every surface your IT ops team needs.
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', margin: 0, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Intake, monitoring, tasks, and mobile — not bolted on, built into the same MSSQL tenant and RBAC model.
          </p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}
        >
          {opsFeatures.map((f) => (
            <motion.div key={f.title} variants={fadeUp}
              style={{ padding: '22px 20px', borderRadius: 14, background: '#fafafa', border: '1px solid #f1f5f9' }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{f.title}</div>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.65 }}>{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Mobile Pager ─────────────────────────────────────────────────────────────

const pagerCapabilities = [
  'Push alerts for assignment, escalation, and SLA warnings',
  'Alerts inbox with full-screen in-app pager overlay',
  'My Work tab sorted for fast ticket response',
  'Queue claim and ticket detail updates from phone',
  'Lead tab for workload-based batch assign',
  'Biometric lock on app resume for shared/mobile environments',
] as const;

function PhoneShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ flex: '1 1 220px', minWidth: 220 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </div>
      <div
        style={{
          borderRadius: 28,
          background: '#0b1120',
          padding: 10,
          boxShadow: '0 24px 70px rgba(15,23,42,0.22)',
          border: '1px solid rgba(148,163,184,0.22)',
          maxWidth: 250,
          margin: '0 auto',
        }}
      >
        <div style={{ height: 18, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: 80, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.10)' }} />
        </div>
        <div
          style={{
            background: 'linear-gradient(180deg, #111827 0%, #0f172a 100%)',
            borderRadius: 22,
            minHeight: 430,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function PagerAlertsMockup() {
  return (
    <PhoneShell label="Screen 1 · Alerts">
      <div style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(79,70,229,0.16)', border: '1px solid rgba(99,102,241,0.26)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', marginBottom: 4 }}>PUSH ALERT</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Ticket assigned</div>
        <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>INC-1042 · VPN disconnects after update</div>
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Alerts</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Assignments, escalations, SLA warnings</div>
      </div>
      {[
        ['Assigned to you', 'INC-1042', '2 min ago'],
        ['SLA warning · 15 min', 'INC-1038', '8 min ago'],
        ['Escalated', 'INC-1029', '1 hr ago'],
      ].map(([type, ref, when], i) => (
        <div
          key={`${ref}-${when}`}
          style={{
            padding: '12px 12px',
            borderRadius: 14,
            background: i === 0 ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
            border: i === 0 ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? '#a5b4fc' : '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{type}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 4 }}>{ref}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{when}</div>
        </div>
      ))}
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-around', fontSize: 11, color: '#94a3b8', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color: '#fff', fontWeight: 700 }}>Alerts</span>
        <span>My Work</span>
        <span>Queue</span>
        <span>Me</span>
      </div>
    </PhoneShell>
  );
}

function PagerMyWorkMockup() {
  return (
    <PhoneShell label="Screen 2 · My Work">
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>My Work</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>SLA-first triage on the move</div>
      </div>
      {[
        ['INC-1042', 'HIGH', 'VPN disconnects after update', 'SLA 14m', '#ef4444'],
        ['INC-1038', 'MED', 'Mailbox quota exceeded', 'SLA 22m', '#f59e0b'],
        ['REQ-0881', 'LOW', 'New laptop setup', 'SLA 2h', '#22c55e'],
      ].map(([ref, pri, title, sla, color]) => (
        <div key={ref} style={{ padding: '12px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{ref}</div>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: color, borderRadius: 999, padding: '3px 8px' }}>{pri}</span>
          </div>
          <div style={{ fontSize: 13, color: '#e2e8f0', marginTop: 8, lineHeight: 1.45 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>{sla}</div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 10, background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 700 }}>Open ticket</div>
        <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.08)' }}>Add comment</div>
      </div>
    </PhoneShell>
  );
}

function PagerLeadMockup() {
  return (
    <PhoneShell label="Screen 3 · Lead">
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Lead</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Workload-based rebalance suggestions</div>
      </div>
      <div style={{ padding: '12px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>TEAM LOAD</div>
        {[
          ['Ada Okafor', '7/8', '#f59e0b'],
          ['Moses Bello', '3/8', '#22c55e'],
          ['Tobi Cole', '9/8', '#ef4444'],
        ].map(([name, load, color]) => (
          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: '#e2e8f0' }}>{name}</span>
            <span style={{ color }}>{load}</span>
          </div>
        ))}
      </div>
      {[
        'INC-1018 · Tobi Cole → Moses Bello',
        'INC-1021 · Tobi Cole → Ada Okafor',
      ].map((text) => (
        <div key={text} style={{ padding: '12px 12px', borderRadius: 14, background: 'rgba(79,70,229,0.10)', border: '1px solid rgba(99,102,241,0.18)', fontSize: 12.5, color: '#e2e8f0' }}>
          {text}
        </div>
      ))}
      <div style={{ marginTop: 'auto', textAlign: 'center', padding: '11px 0', borderRadius: 10, background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 700 }}>
        Apply all
      </div>
    </PhoneShell>
  );
}

function MobilePagerSection() {
  return (
    <section style={{ padding: 'clamp(64px,9vw,110px) clamp(20px,5vw,40px)', background: 'linear-gradient(135deg, #111827 0%, #0f172a 45%, #1e1b4b 100%)' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap', marginBottom: 52 }}>
          <motion.div variants={fadeLeft} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ flex: '1 1 320px', minWidth: 280 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(99,102,241,0.32)', background: 'rgba(99,102,241,0.10)', marginBottom: 18 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Lotris Pager</span>
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#fff', lineHeight: 1.12, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
              Respond from anywhere,<br />not just from the desk.
            </h2>
            <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 24px', maxWidth: 520 }}>
              Lotris Pager is the thin mobile client for engineers and team leads. It reuses the existing API, keeps the workflow focused, and surfaces the actions that matter most when a ticket cannot wait.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
              {pagerCapabilities.map((capability) => (
                <div key={capability} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(99,102,241,0.18)', color: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.55 }}>{capability}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/request-access" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#4f46e5', color: '#fff', textDecoration: 'none', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700 }}>
                Request access
              </Link>
              <a href="/mockups/12-mobile-pager-pitch.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#e2e8f0', textDecoration: 'none', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                View full mobile mock
              </a>
            </div>
          </motion.div>

          <motion.div variants={fadeRight} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ flex: '1 1 420px', minWidth: 300 }}>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
              <PagerAlertsMockup />
              <PagerMyWorkMockup />
              <PagerLeadMockup />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── KPI Agreement Section ────────────────────────────────────────────────────

const agreementSteps = [
  {
    n: '01',
    label: 'Build the Agreement',
    img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&h=300&q=80',
    alt: 'Team lead configuring KPI areas and weighted metrics at laptop',
    body: 'A structured performance contract: KPI Areas, weighted metrics, measurement periods. Built in the system, not in a spreadsheet.',
  },
  {
    n: '02',
    label: 'Engineer Signs Off',
    img: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=600&h=300&q=80',
    alt: 'Engineer reviewing and formally accepting their KPI agreement',
    body: 'Before the period starts, the engineer reviews their agreement and formally accepts it. Mutual commitment, on record.',
  },
  {
    n: '03',
    label: 'Tracked Live',
    img: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?auto=format&fit=crop&w=600&h=300&q=80',
    alt: 'Live business performance analytics dashboard on monitor',
    body: 'Actuals are logged against agreed targets throughout the period. No scramble at review time — the scores are already there.',
  },
];

const statusTrail = [
  { label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' },
  { label: 'Pending Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' },
];

function KpiAgreementSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const beat1Ref = useRef<HTMLDivElement>(null);
  const beat2Ref = useRef<HTMLDivElement>(null);
  const beat3Ref = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  const beat1In = useInView(beat1Ref, { once: true, margin: '-80px' });
  const beat2In = useInView(beat2Ref, { once: true, margin: '-80px' });
  const beat3In = useInView(beat3Ref, { once: true, margin: '-80px' });
  const trailIn = useInView(trailRef, { once: true, margin: '-60px' });

  const dot1Active = beat1In;
  const dot2Active = beat2In;
  const dot3Active = beat3In;

  return (
    <section ref={sectionRef} style={{ padding: 'clamp(64px,9vw,120px) clamp(20px,5vw,40px)', background: '#080a14', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(79,70,229,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1140, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Section header */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 80 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', marginBottom: 18 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', letterSpacing: '0.12em', textTransform: 'uppercase' }}>KPI Agreements</span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: '#fff', lineHeight: 1.12, letterSpacing: '-0.03em', margin: 0 }}>
            Performance starts<br />with a clear agreement.
          </h2>
        </motion.div>

        {/* Layout: timeline dot rail + content */}
        <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>

          {/* Left timeline rail — hidden on mobile to give content full width */}
          <div className="hidden sm:flex" style={{ flexDirection: 'column', alignItems: 'center', gap: 0, paddingTop: 8, flexShrink: 0, width: 24 }}>
            {[dot1Active, dot2Active, dot3Active].map((active, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: active ? '#10b981' : 'rgba(255,255,255,0.1)',
                  border: active ? '2px solid rgba(16,185,129,0.5)' : '2px solid rgba(255,255,255,0.1)',
                  boxShadow: active ? '0 0 10px rgba(16,185,129,0.6)' : 'none',
                  transition: 'all 0.6s ease',
                  flexShrink: 0,
                }} />
                {i < 2 && <div style={{ width: 2, height: 180, background: active ? 'linear-gradient(to bottom, rgba(16,185,129,0.5), rgba(16,185,129,0.05))' : 'rgba(255,255,255,0.07)', transition: 'background 0.6s ease' }} />}
              </div>
            ))}
          </div>

          {/* Right: all three beats */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* ── Beat 1: The Problem ─────────────────────────── */}
            <div ref={beat1Ref} style={{ marginBottom: 72 }}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={beat1In ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.7, ease: EASE }}
                style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'stretch' }}
              >
                {/* Quote side */}
                <div style={{ flex: '1 1 320px', minWidth: 280 }}>
                  <p style={{ fontSize: 'clamp(20px, 2.5vw, 30px)', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.35, letterSpacing: '-0.01em', margin: '0 0 20px', fontStyle: 'italic' }}>
                    "Your appraisal cycle starts with a conversation nobody documented."
                  </p>
                  <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, margin: 0 }}>
                    Most teams agree on targets verbally, in emails, or in a spreadsheet that's out of date the moment it's saved. By review time, nobody can agree on what was actually committed to.
                  </p>
                </div>
                {/* Before pills */}
                <div style={{ flex: '1 1 260px', minWidth: 240, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                  {[
                    'KPI targets set informally, never formalised',
                    'No record of what each engineer committed to',
                    'Appraisals become guesswork, not evidence',
                  ].map((text) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderLeft: '3px solid rgba(239,68,68,0.5)' }}>
                      <span style={{ fontSize: 13, color: '#ef4444', flexShrink: 0 }}>✕</span>
                      <span style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.4 }}>{text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* ── Beat 2: The Flow ────────────────────────────── */}
            <div ref={beat2Ref} style={{ marginBottom: 72 }}>
              <motion.div
                variants={stagger}
                initial="hidden"
                animate={beat2In ? 'visible' : 'hidden'}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 20, position: 'relative' }}
              >
                {agreementSteps.map((s, i) => (
                  <motion.div key={s.n} variants={fadeUp}
                    whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(0,0,0,0.35)' }}
                    style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}
                  >
                    <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
                      <img src={s.img} alt={s.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.8 }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,10,20,0.1) 0%, rgba(8,10,20,0.65) 100%)' }} />
                      <div style={{ position: 'absolute', top: 12, left: 12, fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.12em', background: '#4f46e5', padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase' }}>
                        Step {s.n}
                      </div>
                    </div>
                    <div style={{ padding: '20px 22px 24px' }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px', letterSpacing: '-0.01em' }}>{s.label}</h4>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.65 }}>{s.body}</p>
                    </div>
                    {/* Connector */}
                    {i < agreementSteps.length - 1 && (
                      <div style={{ position: 'absolute', right: -16, top: '38%', fontSize: 18, color: '#334155', zIndex: 2 }}>→</div>
                    )}
                  </motion.div>
                ))}
              </motion.div>

              {/* Animated status trail */}
              <div ref={trailRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginTop: 32, flexWrap: 'wrap' }}>
                {statusTrail.map((st, i) => (
                  <div key={st.label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.75 }}
                      animate={trailIn ? { opacity: 1, scale: 1 } : {}}
                      transition={{ duration: 0.4, delay: i * 0.35, ease: EASE }}
                      style={{ padding: '6px 16px', borderRadius: 20, background: st.bg, border: `1px solid ${st.border}`, fontSize: 12, fontWeight: 700, color: st.color, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}
                    >
                      {st.label}
                    </motion.div>
                    {i < statusTrail.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={trailIn ? { opacity: 1, scaleX: 1 } : {}}
                        transition={{ duration: 0.3, delay: i * 0.35 + 0.2 }}
                        style={{ width: 36, height: 1, background: 'rgba(255,255,255,0.12)', margin: '0 4px', transformOrigin: 'left' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Beat 3: Feature Spotlight ───────────────────── */}
            <div ref={beat3Ref}>
              <div style={{ display: 'flex', gap: 56, alignItems: 'center', flexWrap: 'wrap' }}>
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={beat3In ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.7, ease: EASE }}
                  style={{ flex: '1 1 320px', minWidth: 280, borderRadius: 18, overflow: 'hidden', position: 'relative', height: 340 }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=700&h=480&q=80"
                    alt="Team lead and engineer in a 1-on-1 KPI review conversation"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(79,70,229,0.25) 0%, rgba(8,10,20,0.35) 100%)' }} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={beat3In ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
                  style={{ flex: '1 1 300px', minWidth: 280 }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Built for accountability</div>
                  <h3 style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
                    Set the bar.<br />Agree on it. Own it.
                  </h3>
                  <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, margin: '0 0 28px' }}>
                    Lotris turns the most informal part of performance management into the most structured one. Every engineer starts every period with a clear, signed-off agreement — and ends it with evidence.
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      'KPI Areas with weighted metric rows (must sum to 100)',
                      'Excel / CSV upload with column-mapping wizard',
                      'Draft → Pending Review → Active sign-off workflow',
                      'Feeds directly into live KPI tracking and scoring',
                    ].map((b) => (
                      <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#cbd5e1', fontWeight: 500, lineHeight: 1.45 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontSize: 10, color: '#10b981' }}>✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

const steps = [
  {
    n: '01',
    img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&h=320&q=80',
    alt: 'Person submitting IT support ticket on laptop',
    title: 'Ticket Arrives',
    body: 'Via web form, email-to-ticket, or API. Auto-categorised, routed to the right team queue, SLA timer starts.',
  },
  {
    n: '02',
    img: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=600&h=320&q=80',
    alt: 'IT professionals routing and assigning tickets on screens',
    title: 'Routed & Worked',
    body: 'Routing rules apply, engineers claim or get auto-assigned on SLA breach. Workload suggestions keep capacity balanced.',
  },
  {
    n: '03',
    img: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&h=320&q=80',
    alt: 'Team reviewing resolved tickets and KPI reports together',
    title: 'Resolved & Measured',
    body: 'Ticket closed, KPIs updated from analytics rollups. Reports generated automatically — with optional AI narratives.',
  },
  {
    n: '04',
    img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&h=320&q=80',
    alt: 'Knowledge base and root cause documentation',
    title: 'Learned & Published',
    body: 'Critical incidents open a problem investigation. Approved RCAs publish to the knowledge base — searchable for the next time.',
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" style={{ padding: 'clamp(56px,8vw,100px) clamp(20px,5vw,40px)', background: '#0c0e1a' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>How It Works</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>
            From chaotic inbox<br />to structured performance.
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 24, position: 'relative' }}>
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}
            >
              {/* Image header with overlay */}
              <div style={{ height: 200, overflow: 'hidden', position: 'relative' }}>
                <img src={s.img} alt={s.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.82 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(12,14,26,0.15) 0%, rgba(12,14,26,0.72) 100%)' }} />
                {/* Step badge */}
                <div style={{ position: 'absolute', top: 14, left: 14, fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.12em', background: '#4f46e5', padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase' }}>
                  Step {s.n}
                </div>
              </div>
              {/* Content */}
              <div style={{ padding: '24px 26px 28px' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.01em' }}>{s.title}</h3>
                <p style={{ fontSize: 13.5, color: '#64748b', margin: 0, lineHeight: 1.7 }}>{s.body}</p>
              </div>
              {/* Connector arrow */}
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', right: -18, top: '38%', transform: 'translateY(-50%)', fontSize: 20, color: '#334155', zIndex: 2, display: 'flex' }}>→</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Platform pillars (capability outcomes — no fabricated metrics) ─────────

function PlatformPillarsSection() {
  const pillars = [
    {
      title: 'Structured ticketing',
      body: 'Every ticket is categorised, routed, and tracked from intake to resolution — with SLA timers, tasks, and a full audit trail.',
    },
    {
      title: 'Provable KPI performance',
      body: 'Formal KPI agreements, live scorecards, and automated reports give you evidence for reviews — not guesswork.',
    },
    {
      title: 'Balanced workloads',
      body: 'Capacity limits and rebalance suggestions keep queues fair — batch reassignment when engineers are overloaded.',
    },
    {
      title: 'Root-cause intelligence',
      body: 'Problems register, RCA wizard, and semantic knowledge search turn repeat incidents into published organisational learning.',
    },
    {
      title: 'On your infrastructure',
      body: 'Deploy with Docker on MSSQL and Redis. Integrate Entra ID, LDAP, or local identity — data stays in your environment.',
    },
    {
      title: 'API-first integrations',
      body: '130-operation OpenAPI 3.1 contract. Webhooks, email intake, Teams alerts, and SSE — extend without rewriting core logic.',
    },
  ];

  return (
    <section style={{ padding: 'clamp(56px,8vw,100px) clamp(20px,5vw,40px)', background: 'linear-gradient(135deg, #1e1b4b 0%, #0c0e1a 60%, #0f172a 100%)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>What you get</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
            Outcomes your IT leadership can stand behind.
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', margin: 0, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Capability-focused — not vanity metrics. Measure real performance once Lotris is deployed in your environment.
          </p>
        </motion.div>

        <motion.div variants={staggerFast} initial="hidden" whileInView="visible" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}
        >
          {pillars.map((p) => (
            <motion.div key={p.title} variants={fadeUp}
              style={{ padding: '28px 24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>{p.title}</div>
              <div style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.65 }}>{p.body}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Use cases (verticals — no fabricated testimonials) ─────────────────────────

const useCases = [
  {
    vertical: 'Banking & finance',
    body: 'Regulated environments where SLA evidence, audit trails, and on-prem data residency are non-negotiable.',
  },
  {
    vertical: 'Telecom & MSPs',
    body: 'High-volume queues with tiered SLAs, workload balancing across shifts, and automated stakeholder reporting.',
  },
  {
    vertical: 'Public sector',
    body: 'Structured ticketing and KPI agreements that stand up to internal review — deployed inside your network boundary.',
  },
];

function UseCasesSection() {
  return (
    <section style={{ padding: 'clamp(56px,8vw,100px) clamp(20px,5vw,40px)', background: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Where Lotris fits</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>
            Built for teams under operational scrutiny.
          </h2>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 24 }}
        >
          {useCases.map((u) => (
            <motion.div key={u.vertical} variants={fadeUp}
              whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(0,0,0,0.08)' }}
              style={{ padding: '32px 28px', border: '1px solid #f1f5f9', borderRadius: 16, background: '#fafafa' }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{u.vertical}</div>
              <p style={{ fontSize: 14.5, color: '#334155', lineHeight: 1.7, margin: 0 }}>{u.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Security ─────────────────────────────────────────────────────────────────

function SecuritySection() {
  const items = [
    { title: 'Self-hosted deployment', body: 'Run Lotris on your servers or private cloud — MSSQL, Redis, Docker. Optional Qdrant sidecar for semantic search.' },
    { title: 'Enterprise identity', body: 'Entra ID OIDC, LDAP, or ASP.NET Identity with role-based access control across all modules.' },
    { title: 'Audit & multi-tenancy', body: 'Immutable audit log, tenant isolation per organisation, TLS in transit, and structured access policies.' },
    { title: 'SOC 2 Type II', body: 'Certification in progress — we publish status updates as the program advances.' },
  ];

  return (
    <section id="security" style={{ padding: 'clamp(56px,8vw,100px) clamp(20px,5vw,40px)', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Security</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
            Designed for teams that cannot outsource trust.
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', margin: 0, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Your data stays on your infrastructure. Identity, access, and audit controls are built in from day one.
          </p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}
        >
          {items.map((item) => (
            <motion.div key={item.title} variants={fadeUp}
              style={{ padding: '24px 22px', borderRadius: 14, background: '#fff', border: '1px solid #e2e8f0' }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{item.title}</div>
              <p style={{ fontSize: 13.5, color: '#64748b', margin: 0, lineHeight: 1.65 }}>{item.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── CTA Section ──────────────────────────────────────────────────────────────

function CtaSection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="request-access" style={{ padding: 'clamp(56px,8vw,100px) clamp(20px,5vw,40px)', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0c0e1a 100%)', position: 'relative', overflow: 'hidden' }}>
      {/* Orb */}
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 6, repeat: Infinity }}
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }}
      />
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{ padding: '14px 20px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 48px rgba(16,185,129,0.18), 0 0 80px rgba(99,102,241,0.12)' }}>
              <LotrisMark height={44} uid="cta" />
            </div>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
            Ready to surface your performance?
          </h2>
          <p style={{ fontSize: 17, color: '#a5b4fc', margin: '0 0 40px', lineHeight: 1.6 }}>
            Request access to Lotris. We&apos;ll walk you through deployment on your infrastructure and a product tour tailored to your team.
          </p>

          {/* Email + CTA */}
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }}
                style={{ display: 'flex', gap: 10, maxWidth: 460, margin: '0 auto 20px', flexWrap: 'wrap', justifyContent: 'center' }}
              >
                <input
                  type="email"
                  placeholder="your@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ flex: '1 1 220px', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                />
                <button
                  onClick={() => email && setSubmitted(true)}
                  style={{ padding: '12px 22px', background: '#4f46e5', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#4338ca')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#4f46e5')}
                >
                  Get Early Access
                </button>
              </motion.div>
            ) : (
              <motion.div key="thanks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: '16px 24px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, color: '#86efac', fontSize: 14, fontWeight: 500, marginBottom: 20 }}
              >
                ✓ You're on the list — we'll be in touch shortly!
              </motion.div>
            )}
          </AnimatePresence>

          {/* Or book a demo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#6366f1' }}>or</span>
            <Link href="/request-access"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: '#e2e8f0', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              📅 Request access
            </Link>
            <Link href="/login"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: '#e2e8f0', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              → Sign in to your workspace
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: '#0c0e1a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px clamp(20px,5vw,40px) 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 40 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <LotrisMark height={22} uid="footer" />
              <span style={{ fontSize: 15, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.03em' }}>Lotris</span>
            </div>
            <p style={{ fontSize: 12.5, color: '#475569', margin: 0, maxWidth: 240, lineHeight: 1.6 }}>Where performance surfaces. On-prem ITSM, KPI management, and root-cause intelligence.</p>
          </div>
          {/* Links */}
          {[
            { label: 'Product', links: [{ text: 'Platform', href: '#platform' }, { text: 'Intelligence', href: '#intelligence' }, { text: 'How it works', href: '#how-it-works' }, { text: 'Security', href: '#security' }, { text: 'Submit a ticket', href: '/request' }] },
            { label: 'Company', links: [{ text: 'About', href: '#' }, { text: 'Contact', href: '/request-access' }] },
            { label: 'Legal', links: [{ text: 'Privacy Policy', href: '#' }, { text: 'Terms of Service', href: '#' }] },
          ].map((col) => (
            <div key={col.label}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{col.label}</div>
              {col.links.map((l) => (
                <div key={l.text} style={{ marginBottom: 8 }}>
                  <a href={l.href} style={{ fontSize: 13, color: '#475569', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
                  >{l.text}</a>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#334155' }}>© 2026 Lotris · On-prem ITSM</span>
          <span style={{ fontSize: 12, color: '#334155' }}>TLS in transit · SOC 2 Type II in progress</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", WebkitFontSmoothing: 'antialiased' }}>
      <Navbar />
      <HeroSection />
      <TrustStrip />
      <PainPointsSection />
      <FeaturesSection />
      <IntelligenceSection />
      <OpsSurfacesSection />
      <MobilePagerSection />
      <KpiAgreementSection />
      <HowItWorksSection />
      <SecuritySection />
      <PlatformPillarsSection />
      <UseCasesSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
