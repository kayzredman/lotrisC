'use client';

import { useState } from 'react';

const CATEGORIES = [
  'Hardware',
  'Software / Apps',
  'Access & Permissions',
  'Network / Connectivity',
  'Other',
] as const;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

interface FieldErrors {
  requesterName?: string;
  requesterEmail?: string;
  category?: string;
  subject?: string;
  description?: string;
  _general?: string;
}

export default function RequestPage() {
  const [requesterName, setRequesterName]   = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [category, setCategory]             = useState('');
  const [subject, setSubject]               = useState('');
  const [description, setDescription]       = useState('');
  const [errors, setErrors]                 = useState<FieldErrors>({});
  const [submitting, setSubmitting]         = useState(false);
  const [ticketRef, setTicketRef]           = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          requesterName: requesterName.trim(),
          requesterEmail: requesterEmail.trim(),
          category,
          subject: subject.trim(),
          description: description.trim(),
        }),
      });

      const data = (await res.json()) as {
        ticketRef?: string;
        message?: string | string[];
        errors?: Record<string, string[]>;
      };

      if (res.ok) {
        setTicketRef(data.ticketRef ?? 'submitted');
        return;
      }

      // Map server validation errors to field-level state
      if (res.status === 400) {
        const fieldErrors: FieldErrors = {};
        if (Array.isArray(data.message)) {
          for (const msg of data.message) {
            if (typeof msg === 'string') {
              if (msg.toLowerCase().includes('name'))        fieldErrors.requesterName  = msg;
              else if (msg.toLowerCase().includes('email'))  fieldErrors.requesterEmail = msg;
              else if (msg.toLowerCase().includes('category')) fieldErrors.category     = msg;
              else if (msg.toLowerCase().includes('subject')) fieldErrors.subject       = msg;
              else if (msg.toLowerCase().includes('description')) fieldErrors.description = msg;
              else fieldErrors._general = msg;
            }
          }
        } else if (typeof data.message === 'string') {
          fieldErrors._general = data.message;
        }
        setErrors(fieldErrors);
      } else {
        setErrors({ _general: 'Something went wrong. Please try again.' });
      }
    } catch {
      setErrors({ _general: 'Could not reach the server. Please try again later.' });
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Success screen ─────────────────────────────────────────────────── */
  if (ticketRef) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px 36px',
        maxWidth: 520,
        width: '100%',
        boxShadow: 'var(--shadow-md)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--green-bg)',
          border: '1.5px solid var(--green-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 24,
        }}>
          ✓
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          Request Received
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Your request has been received
          {ticketRef !== 'submitted' && (
            <> (<strong style={{ color: 'var(--text-primary)' }}>{ticketRef}</strong>)</>
          )}
          . We will be in touch shortly.
        </p>
        <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-muted)' }}>
          A confirmation email has been sent to <strong>{requesterEmail}</strong>.
        </p>
        <button
          type="button"
          onClick={() => {
            setTicketRef(null);
            setRequesterName('');
            setRequesterEmail('');
            setCategory('');
            setSubject('');
            setDescription('');
          }}
          style={{
            marginTop: 24,
            padding: '8px 20px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--indigo)',
            color: '#fff',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Submit another request
        </button>
      </div>
    );
  }

  /* ── Form ───────────────────────────────────────────────────────────── */
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '36px 36px 40px',
      maxWidth: 560,
      width: '100%',
      boxShadow: 'var(--shadow-md)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
          Submit an IT Support Request
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          Fill in the form below and our IT team will get back to you as soon as possible.
        </p>
      </div>

      {/* General error */}
      {errors._general && (
        <div style={{
          background: 'var(--red-bg)',
          border: '1px solid var(--red-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          fontSize: 13,
          color: 'var(--red)',
          marginBottom: 20,
        }}>
          {errors._general}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Name */}
        <Field
          label="Your name"
          required
          error={errors.requesterName}
        >
          <input
            type="text"
            value={requesterName}
            onChange={e => setRequesterName(e.target.value)}
            placeholder="e.g. Jane Doe"
            maxLength={255}
            required
            style={inputStyle(!!errors.requesterName)}
          />
        </Field>

        {/* Email */}
        <Field
          label="Your email address"
          required
          error={errors.requesterEmail}
        >
          <input
            type="email"
            value={requesterEmail}
            onChange={e => setRequesterEmail(e.target.value)}
            placeholder="e.g. jane.doe@company.com"
            maxLength={255}
            required
            style={inputStyle(!!errors.requesterEmail)}
          />
        </Field>

        {/* Category */}
        <Field
          label="Category"
          required
          error={errors.category}
        >
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            required
            style={inputStyle(!!errors.category)}
          >
            <option value="">— Select a category —</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>

        {/* Subject */}
        <Field
          label="Subject"
          required
          error={errors.subject}
        >
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Brief description of your issue"
            maxLength={500}
            required
            style={inputStyle(!!errors.subject)}
          />
        </Field>

        {/* Description */}
        <Field
          label="Description"
          required
          error={errors.description}
        >
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Please describe the issue in as much detail as possible…"
            maxLength={4000}
            required
            rows={5}
            style={{ ...inputStyle(!!errors.description), resize: 'vertical' }}
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 6,
            padding: '11px 24px',
            borderRadius: 'var(--radius-sm)',
            background: submitting ? 'var(--indigo-hover)' : 'var(--indigo)',
            color: '#fff',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.75 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}

/* ── Helper components ────────────────────────────────────────────────── */

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-primary)',
      }}>
        {label}
        {required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>
      )}
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: `1px solid ${hasError ? 'var(--red-border)' : 'var(--border-strong)'}`,
    background: '#fff',
    fontSize: 13.5,
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  };
}
