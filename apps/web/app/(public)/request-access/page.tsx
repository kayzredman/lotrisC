'use client';

import { useState } from 'react';
import Link from 'next/link';

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

  if (submitted) {
    return (
      <div style={{
        maxWidth: 480,
        width: '100%',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '48px 40px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(79,70,229,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 28,
        }}>✓</div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
          Request received
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px' }}>
          Thanks for your interest in Lotris. Our team will review your request and get back to you at <strong>{email}</strong> within 1–2 business days.
        </p>
        <Link href="/" style={{
          display: 'inline-block',
          padding: '10px 24px',
          background: '#4f46e5',
          color: '#fff',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
        }}>
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 520,
      width: '100%',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '40px 40px 36px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
          Request access to Lotris
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
          Tell us about your team and we&apos;ll set you up with a demo or a trial.
        </p>
      </div>

      {errors._general && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 20,
          color: '#f87171',
          fontSize: 14,
        }}>
          {errors._general}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Full Name */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="ra-name" style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Full name <span style={{ color: '#f87171' }}>*</span>
          </label>
          <input
            id="ra-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Smith"
            autoComplete="name"
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg)',
              border: `1px solid ${errors.name ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {errors.name && <p style={{ color: '#f87171', fontSize: 12, margin: '4px 0 0' }}>{errors.name}</p>}
        </div>

        {/* Company */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="ra-company" style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Company name <span style={{ color: '#f87171' }}>*</span>
          </label>
          <input
            id="ra-company"
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="Acme Corp"
            autoComplete="organization"
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg)',
              border: `1px solid ${errors.companyName ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {errors.companyName && <p style={{ color: '#f87171', fontSize: 12, margin: '4px 0 0' }}>{errors.companyName}</p>}
        </div>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="ra-email" style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Work email <span style={{ color: '#f87171' }}>*</span>
          </label>
          <input
            id="ra-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jane@acmecorp.com"
            autoComplete="email"
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg)',
              border: `1px solid ${errors.email ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {errors.email && <p style={{ color: '#f87171', fontSize: 12, margin: '4px 0 0' }}>{errors.email}</p>}
        </div>

        {/* Message */}
        <div style={{ marginBottom: 24 }}>
          <label htmlFor="ra-message" style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Tell us about your team <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            id="ra-message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            placeholder="Team size, current helpdesk setup, what you're looking for..."
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '12px 0',
            background: submitting ? 'rgba(79,70,229,0.5)' : '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15,
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {submitting ? 'Submitting…' : 'Request access →'}
        </button>

        <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', margin: '16px 0 0', lineHeight: 1.5 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#818cf8', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}
