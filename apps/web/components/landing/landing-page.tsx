'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring, AnimatePresence, type Variants } from 'framer-motion';
import Link from 'next/link';

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

const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 50, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) mv.set(target);
  }, [inView, target, mv]);

  useEffect(() => {
    return spring.on('change', (v) => setDisplay(Math.round(v)));
  }, [spring]);

  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

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

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', padding: '0 40px', height: 64,
        background: scrolled ? 'rgba(12,14,26,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'background 0.3s, backdrop-filter 0.3s, border-color 0.3s',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>L</div>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Lotris</span>
      </div>
      {/* Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginRight: 32 }}>
        {['Features', 'How it works', 'Pricing'].map((label) => (
          <a key={label} href={`#${label.toLowerCase().replace(' ', '-')}`} style={{ fontSize: 14, color: '#94a3b8', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >{label}</a>
        ))}
      </div>
      {/* CTAs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/login" style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none', padding: '6px 14px', fontWeight: 500, transition: 'color 0.2s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >Sign in</Link>
        <Link href="/sign-up" style={{ fontSize: 13, background: '#4f46e5', color: '#fff', textDecoration: 'none', padding: '7px 18px', borderRadius: 8, fontWeight: 600, transition: 'background 0.2s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#4338ca')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#4f46e5')}
        >Get Started</Link>
      </div>
    </motion.nav>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section style={{ position: 'relative', minHeight: '100vh', background: '#0c0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '100px 20px 60px' }}>
      {/* Animated gradient orbs */}
      {[
        { top: '10%', left: '5%', size: 420, color: 'rgba(79,70,229,0.18)', dur: 12 },
        { top: '55%', right: '5%', size: 350, color: 'rgba(139,92,246,0.14)', dur: 16 },
        { top: '25%', left: '55%', size: 280, color: 'rgba(14,165,233,0.10)', dur: 10 },
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

      {/* Grid overlay */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 760 }}>
        {/* Pill badge */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 100, padding: '5px 14px', fontSize: 12, color: '#a5b4fc', fontWeight: 600, marginBottom: 28, letterSpacing: '0.02em' }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} />
          Now in Enterprise Edition — v2.4
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 800, color: '#fff', lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 20px' }}
        >
          Your helpdesk,{' '}
          <span style={{ background: 'linear-gradient(135deg, #818cf8, #4f46e5, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            fully in command.
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 40px', maxWidth: 580, marginLeft: 'auto', marginRight: 'auto' }}
        >
          Stop firefighting. Start performing. Lotris gives IT teams the structure, visibility, and automation to hit every SLA — and <em style={{ color: '#c7d2fe', fontStyle: 'normal' }}>prove it</em>.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.34 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}
        >
          <Link href="/sign-up"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#4f46e5', color: '#fff', textDecoration: 'none', padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, boxShadow: '0 0 0 0 rgba(79,70,229,0.5)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#4338ca'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(79,70,229,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#4f46e5'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 0 0 rgba(79,70,229,0.5)'; }}
          >
            Get Started Free →
          </Link>
          <a href="#how-it-works"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', textDecoration: 'none', padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 600, border: '1px solid rgba(255,255,255,0.12)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'none'; }}
          >
            ▶ See it in action
          </a>
        </motion.div>

        {/* Live stats pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          {[
            { icon: '⚡', text: '247 tickets resolved today' },
            { icon: '🎯', text: '94% avg SLA compliance' },
            { icon: '⭐', text: '4.7 / 5 avg CSAT' },
          ].map((pill) => (
            <div key={pill.text} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: '6px 14px', fontSize: 12, color: '#94a3b8' }}>
              <span>{pill.icon}</span>
              <span>{pill.text}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#475569', fontSize: 11 }}
      >
        <span>Scroll</span>
        <span>↓</span>
      </motion.div>
    </section>
  );
}

// ─── Pain Points Section ──────────────────────────────────────────────────────

const painPoints = [
  { icon: '📥', title: 'Tickets pile up with no structure', body: 'No queue ownership means the loudest request wins — not the most critical one.' },
  { icon: '⏰', title: 'SLA breaches discovered too late', body: 'You only find out after the breach. By then the client is already unhappy.' },
  { icon: '⚖️', title: 'Engineer workloads invisible', body: 'Some engineers are drowning while others sit idle. Nobody has visibility to fix it.' },
  { icon: '📊', title: 'KPIs living in spreadsheets', body: 'Data is stale by the time it lands in the report. Real-time tracking is impossible.' },
  { icon: '📋', title: 'Reports compiled manually every time', body: 'Hours spent each week pulling data, formatting it, and emailing it. Every single time.' },
];

function PainPointsSection() {
  return (
    <section id="features" style={{ padding: '100px 40px', background: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Sound familiar?</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>
            IT support teams are fighting<br />the same battles every day.
          </h2>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}
        >
          {painPoints.map((p) => (
            <motion.div key={p.title} variants={fadeUp}
              whileHover={{ y: -5, boxShadow: '0 16px 40px rgba(0,0,0,0.09)' }}
              style={{ padding: '28px 26px', border: '1px solid #f1f5f9', borderRadius: 14, background: '#fafafa', cursor: 'default', transition: 'box-shadow 0.2s' }}
            >
              <div style={{ fontSize: 28, marginBottom: 14 }}>{p.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.3 }}>{p.title}</h3>
              <p style={{ fontSize: 13.5, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{p.body}</p>
            </motion.div>
          ))}

          {/* Resolution card */}
          <motion.div key="resolution" variants={fadeUp}
            whileHover={{ y: -5 }}
            style={{ padding: '28px 26px', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 14, background: 'linear-gradient(135deg, rgba(79,70,229,0.05), rgba(139,92,246,0.05))', cursor: 'default' }}
          >
            <div style={{ fontSize: 28, marginBottom: 14 }}>🚀</div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#4f46e5', margin: '0 0 8px', lineHeight: 1.3 }}>Lotris solves all of this.</h3>
            <p style={{ fontSize: 13.5, color: '#6366f1', margin: '0 0 16px', lineHeight: 1.6 }}>One platform. Every ticket, every SLA, every KPI — structured, automated, and reported.</p>
            <Link href="/sign-up" style={{ fontSize: 13, fontWeight: 600, color: '#4f46e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              See how it works →
            </Link>
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
    body: 'From the moment a ticket arrives — via form, email, or API — it\'s automatically categorised, routed to the right team queue, and SLA timers start running. No ticket falls through the cracks.',
    bullets: ['Priority-based queue ordering', 'Auto-assignment on SLA breach', 'Full audit trail & escalation flow'],
    mockup: <TicketQueueMockup />,
    flip: false,
  },
  {
    tag: 'KPI Dashboard',
    title: 'Real-time performance. No spreadsheets.',
    body: 'Live KPI dashboards give every engineer, team lead, and executive exactly the metrics they need — SLA compliance, resolution rate, CSAT — updated in real time, not at month-end.',
    bullets: ['Per-engineer & team-level metrics', 'Custom KPI targets with alerts', 'Historical trend charts built-in'],
    mockup: <KpiDashboardMockup />,
    flip: true,
  },
  {
    tag: 'Workload Balancing',
    title: 'No engineer drowning, none sitting idle.',
    body: 'Lotris enforces workload caps, visualises each engineer\'s capacity in real time, and automatically reassigns tickets when someone is overloaded — before you even notice.',
    bullets: ['Max-ticket-per-engineer enforcement', 'Auto-reassign on overload', 'Visual capacity bars per team'],
    mockup: <WorkloadMockup />,
    flip: false,
  },
  {
    tag: 'Automated Reports',
    title: 'Reports that write themselves.',
    body: 'Quarterly performance reports, weekly SLA summaries, and on-demand exports — generated automatically and delivered to your inbox. No more manual compilation.',
    bullets: ['Scheduled email delivery', 'PDF & CSV export', 'Multi-tenant isolation per org'],
    mockup: <ReportsMockup />,
    flip: true,
  },
];

function FeaturesSection() {
  return (
    <section style={{ padding: '80px 40px', background: '#f8fafc' }}>
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

// ─── How It Works ─────────────────────────────────────────────────────────────

const steps = [
  { n: '01', icon: '📥', title: 'Ticket Arrives', body: 'Via web form, email, or API. Auto-categorised, routed to the right team queue, SLA timer starts.' },
  { n: '02', icon: '⚡', title: 'Auto-Routed & Assigned', body: 'Lotris applies your routing rules, assigns the right engineer based on workload, and notifies them instantly.' },
  { n: '03', icon: '✅', title: 'Resolved & Reported', body: 'Ticket resolved, KPIs updated in real time. Reports generated automatically and delivered to stakeholders.' },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" style={{ padding: '100px 40px', background: '#0c0e1a' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>How It Works</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>
            From chaotic inbox<br />to structured performance.
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2, position: 'relative' }}>
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              style={{ padding: '32px 28px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, position: 'relative' }}
            >
              {/* Step number */}
              <div style={{ fontSize: 11, fontWeight: 800, color: '#4f46e5', letterSpacing: '0.1em', marginBottom: 16 }}>STEP {s.n}</div>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{s.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>{s.title}</h3>
              <p style={{ fontSize: 13.5, color: '#64748b', margin: 0, lineHeight: 1.65 }}>{s.body}</p>
              {/* Connector */}
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', right: -18, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: '#334155', zIndex: 2, display: 'flex' }}>→</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Numbers Section ──────────────────────────────────────────────────────────

function NumbersSection() {
  const stats = [
    { value: 94, suffix: '%', label: 'Average SLA compliance', sub: 'across all active tenants' },
    { value: 247, suffix: '', label: 'Tickets resolved today', sub: 'on a typical working day' },
    { value: 4, suffix: 'h', label: 'Average resolution time', sub: 'down from 11h without Lotris' },
    { value: 47, suffix: '%', label: 'Reduction in SLA breaches', sub: 'in the first 30 days' },
  ];

  return (
    <section style={{ padding: '100px 40px', background: 'linear-gradient(135deg, #1e1b4b 0%, #0c0e1a 60%, #0f172a 100%)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>By The Numbers</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>Results that speak for themselves.</h2>
        </motion.div>

        <motion.div variants={staggerFast} initial="hidden" whileInView="visible" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}
        >
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp}
              style={{ textAlign: 'center', padding: '28px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}
            >
              <div style={{ fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 800, color: '#a5b4fc', letterSpacing: '-0.03em', lineHeight: 1 }}>
                <AnimatedNumber target={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', margin: '10px 0 4px' }}>{s.label}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const testimonials = [
  {
    quote: "We used to discover SLA breaches in our weekly review meeting. Now we're preventing them in real time. Lotris completely changed how we operate.",
    name: 'Jane Cooper',
    role: 'IT Director',
    company: 'TechVault Corp',
    avatar: 'JC',
    color: '#4f46e5',
  },
  {
    quote: "The workload balancing alone saved us. We had two engineers at 120% capacity while two others had almost nothing. It's now automated and fair.",
    name: 'Marcus Reid',
    role: 'Head of Support',
    company: 'GlobalBank IT',
    avatar: 'MR',
    color: '#0ea5e9',
  },
  {
    quote: "Monthly KPI reports used to take two days. Now they're in my inbox automatically every Monday. The data is accurate and stakeholders love it.",
    name: 'Priya Nair',
    role: 'VP Operations',
    company: 'FinanceHub',
    avatar: 'PN',
    color: '#8b5cf6',
  },
];

function TestimonialsSection() {
  return (
    <section style={{ padding: '100px 40px', background: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>What teams are saying</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>Trusted by IT teams that perform.</h2>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}
        >
          {testimonials.map((t) => (
            <motion.div key={t.name} variants={fadeUp}
              whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(0,0,0,0.10)' }}
              style={{ padding: '32px 28px', border: '1px solid #f1f5f9', borderRadius: 16, background: '#fafafa', transition: 'box-shadow 0.25s, transform 0.25s' }}
            >
              <div style={{ fontSize: 28, color: t.color, marginBottom: 16, lineHeight: 1 }}>"</div>
              <p style={{ fontSize: 14.5, color: '#334155', lineHeight: 1.7, margin: '0 0 24px', fontStyle: 'italic' }}>{t.quote}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: t.color + '22', border: `2px solid ${t.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: t.color, flexShrink: 0 }}>{t.avatar}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.role} · {t.company}</div>
                </div>
              </div>
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
    <section id="pricing" style={{ padding: '100px 40px', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0c0e1a 100%)', position: 'relative', overflow: 'hidden' }}>
      {/* Orb */}
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 6, repeat: Infinity }}
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }}
      />
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
            Ready to surface your performance?
          </h2>
          <p style={{ fontSize: 17, color: '#a5b4fc', margin: '0 0 40px', lineHeight: 1.6 }}>
            Join IT teams already using Lotris to hit their SLAs, balance their workloads, and report with confidence.
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
            <Link href="/sign-up"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: '#e2e8f0', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              📅 Book a demo
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
    <footer style={{ background: '#0c0e1a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 40px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 40 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>L</div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Lotris</span>
            </div>
            <p style={{ fontSize: 12.5, color: '#475569', margin: 0, maxWidth: 240, lineHeight: 1.6 }}>Where performance surfaces. Enterprise IT Help Desk & KPI Management.</p>
          </div>
          {/* Links */}
          {[
            { label: 'Product', links: ['Features', 'How it works', 'Pricing', 'Security'] },
            { label: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
            { label: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'GDPR', 'SOC 2'] },
          ].map((col) => (
            <div key={col.label}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{col.label}</div>
              {col.links.map((l) => (
                <div key={l} style={{ marginBottom: 8 }}>
                  <a href="#" style={{ fontSize: 13, color: '#475569', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
                  >{l}</a>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#334155' }}>© 2026 Lotris · Enterprise Edition · v2.4.1</span>
          <span style={{ fontSize: 12, color: '#334155' }}>🔒 TLS 1.3 · SOC 2 Type II certified</span>
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
      <PainPointsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <NumbersSection />
      <TestimonialsSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
