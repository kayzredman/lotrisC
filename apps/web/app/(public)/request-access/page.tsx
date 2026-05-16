'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LotrisMark } from '@/components/brand/lotris-mark';

const FEATURES = [
  {
    dot: '#10b981',
    label: 'SLA-driven ticket engine',
    desc: 'Every ticket tracked with hard deadlines. Miss nothing.',
  },
  {
    dot: '#f59e0b',
    label: 'Live KPI dashboards',
    desc: 'MTTR, resolution rate, queue health — surfaced in real-time.',
  },
  {
    dot: '#6366f1',
    label: 'Auto-assign & queue routing',
    desc: 'BullMQ-powered routing puts the right ticket in the right hands.',
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface FieldErrors {
  name?: string;
  companyName?: string;
  email?: string;
  _general?: string;
}

export default function RequestAccessPage() {
  const [name, setName]               = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail]             = useState('');
  const [message, setMessage]         = useState('');
  const [errors, setErrors]           = useState<FieldErrors>({});
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const newErrors: FieldErrors = {};
    if (!name.trim())        newErrors.name = 'Full name is required';
    if (!companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!email.trim())       newErrors.email = 'Work email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email address';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          companyName: companyName.trim(),
          email: email.trim(),
          message: message.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        return;
      }

      const data = await res.json() as { message?: string };
      setErrors({ _general: data.message ?? 'Something went wrong. Please try again.' });
    } catch {
      setErrors({ _general: 'Unable to submit request. Please try again later.' });
    } finally {
      setSubmitting(false);
    }
  }

  const WRAPPER: React.CSSProperties = {
    maxWidth: 900,
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    borderRadius: 16,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
  };

  if (submitted) {
    return (
      <div style={WRAPPER}>
        <BrandPanel />
        <div style={{
          background: '#12141f',
          padding: '52px 44px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.08))',
            border: '2px solid rgba(16,185,129,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            fontSize: 32,
          }}>✓</div>
          <h2 style={{ color: '#f8fafc', fontSize: 24, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.03em' }}>
            Request received
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, margin: '0 0 10px' }}>
            Thanks for your interest in Lotris.
          </p>
          <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7, margin: '0 0 32px' }}>
            We&apos;ll reach out to{' '}
            <span style={{ color: '#818cf8', fontWeight: 600 }}>{email}</span>{' '}
            within 1–2 business days.
          </p>
          <Link href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 22px',
            background: '#4f46e5',
            color: '#fff',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
          }}>
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={WRAPPER}>
      <BrandPanel />

      {/* ── Right: Form ──────────────────────────────────────── */}
      <div style={{ background: '#12141f', padding: '44px 40px 40px' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: '#f8fafc', fontSize: 20, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.03em' }}>
            Request access
          </h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            Tell us about your team and we&apos;ll get you set up.
          </p>
        </div>

        {errors._general && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 18,
            color: '#f87171',
            fontSize: 13,
          }}>
            {errors._general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Field label="Full name" htmlFor="ra-name" error={errors.name} required>
            <input
              id="ra-name" type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith" autoComplete="name"
              style={fieldInputStyle(!!errors.name)}
            />
          </Field>

          <Field label="Company name" htmlFor="ra-company" error={errors.companyName} required>
            <input
              id="ra-company" type="text" value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Acme Corp" autoComplete="organization"
              style={fieldInputStyle(!!errors.companyName)}
            />
          </Field>

          <Field label="Work email" htmlFor="ra-email" error={errors.email} required>
            <input
              id="ra-email" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@acmecorp.com" autoComplete="email"
              style={fieldInputStyle(!!errors.email)}
            />
          </Field>

          <Field label="Tell us about your team" htmlFor="ra-message" optional>
            <textarea
              id="ra-message" value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Team size, current helpdesk setup, what you're looking for…"
              style={{ ...fieldInputStyle(false), resize: 'vertical', fontFamily: 'inherit' }}
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '13px 0',
              background: submitting ? 'rgba(79,70,229,0.45)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: 9,
              fontWeight: 700,
              fontSize: 15,
              cursor: submitting ? 'not-allowed' : 'pointer',
              letterSpacing: '-0.01em',
              boxShadow: submitting ? 'none' : '0 4px 20px rgba(79,70,229,0.4)',
              transition: 'all 0.15s',
              marginTop: 4,
            }}
          >
            {submitting ? 'Submitting…' : 'Request access →'}
          </button>

          <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', margin: '14px 0 0', lineHeight: 1.5 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

/* ── Brand panel ────────────────────────────────────────────────── */
function BrandPanel() {
  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(160deg, #0d0f1e 0%, #0a0c18 60%, #0d0f1e 100%)',
      padding: '48px 40px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
      minHeight: 520,
    }}>
      {/* Ambient glow orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: -60, left: -60,
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: 40, right: -80,
          width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400, height: 200,
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)',
        }} />
      </div>

      {/* Top: brand identity */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 20 }}>
          <LotrisMark height={64} uid="ra-hero" />
        </div>
        <h1 style={{
          fontSize: 42,
          fontWeight: 900,
          color: '#f8fafc',
          margin: '0 0 6px',
          letterSpacing: '-0.05em',
          lineHeight: 1,
          fontFamily: 'Inter, -apple-system, sans-serif',
        }}>
          Lotris
        </h1>
        <p style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#4f46e5',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          margin: '0 0 28px',
        }}>
          Where performance surfaces.
        </p>

        <div style={{
          width: 40, height: 2,
          background: 'linear-gradient(90deg, #4f46e5, transparent)',
          borderRadius: 2,
          marginBottom: 28,
        }} />

        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.65, margin: '0 0 32px', maxWidth: 280 }}>
          The IT helpdesk built for teams who take SLAs seriously — ticket lifecycle, KPIs, and queue intelligence in one place.
        </p>

        {/* Feature bullets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FEATURES.map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: f.dot,
                marginTop: 5, flexShrink: 0,
                boxShadow: `0 0 8px ${f.dot}90`,
              }} />
              <div>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{f.label}</div>
                <div style={{ color: '#475569', fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: testimonial */}
      <div style={{
        position: 'relative', zIndex: 1,
        marginTop: 36,
        padding: '16px 18px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
      }}>
        <div style={{ color: '#4f46e5', fontSize: 22, lineHeight: 1, marginBottom: 8 }}>&ldquo;</div>
        <p style={{ color: '#94a3b8', fontSize: 12.5, lineHeight: 1.65, margin: '0 0 12px', fontStyle: 'italic' }}>
          Finally a helpdesk that shows us <em style={{ color: '#c7d2fe' }}>why</em> we&apos;re missing SLAs, not just that we are.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5, #10b981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>IT</div>
          <div>
            <div style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 600 }}>IT Operations Lead</div>
            <div style={{ color: '#475569', fontSize: 11 }}>Financial services firm, 400 staff</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */
function fieldInputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${hasError ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 8,
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };
}

function Field({
  label, htmlFor, error, required, optional, children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 15 }}>
      <label htmlFor={htmlFor} style={{ display: 'block', color: '#94a3b8', fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: '#f87171', marginLeft: 3 }}>*</span>}
        {optional && <span style={{ color: '#475569', marginLeft: 4, fontWeight: 400 }}>(optional)</span>}
      </label>
      {children}
      {error && <p style={{ color: '#f87171', fontSize: 11.5, margin: '4px 0 0' }}>{error}</p>}
    </div>
  );
}
