'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const INDUSTRIES = [
  'Technology',
  'Financial Services',
  'Healthcare',
  'Retail & E-Commerce',
  'Manufacturing',
  'Education',
  'Government & Public Sector',
  'Media & Entertainment',
  'Other',
];

const BRAND_COLORS = [
  '#4F46E5', // indigo
  '#0EA5E9', // sky
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#64748B', // slate
];

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

interface Props {
  onNext: () => void;
}

export function Step1Org({ onNext }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [timezone, setTimezone] = useState('UTC');
  const [industry, setIndustry] = useState('');
  const [color, setColor] = useState(BRAND_COLORS[0]);
  const [error, setError] = useState('');

  const saveOrg = trpc['onboarding.saveOrg'].useMutation({
    onSuccess: onNext,
    onError: (e) => setError(e.message),
  });

  function handleNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(toSlug(v));
  }

  function handleSlugChange(v: string) {
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 100));
    setSlugTouched(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Organisation name is required.');
    if (!slug.trim()) return setError('Short code is required.');
    saveOrg.mutate({ name: name.trim(), slug });
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
        Set up your organisation
      </h1>
      <p style={{ color: '#64748B', margin: '0 0 32px', fontSize: 15 }}>
        This is your workspace — you can change these details later in Settings.
      </p>

      {/* Name + Slug */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Organisation Name</label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Acme Corp"
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Short Code</label>
          <input
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="acme"
            required
            style={inputStyle}
          />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>Lowercase letters, numbers, hyphens</span>
        </div>
      </div>

      {/* Timezone + Industry */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Timezone</label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={selectStyle}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Industry</label>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={selectStyle}>
            <option value="">Select industry</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Brand colour */}
      <div style={{ marginBottom: 32 }}>
        <label style={labelStyle}>Brand Colour</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {BRAND_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: c,
                border: color === c ? '3px solid #0F172A' : '2px solid transparent',
                cursor: 'pointer',
                outline: 'none',
              }}
              aria-label={`Select colour ${c}`}
            />
          ))}
        </div>
      </div>

      {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="submit"
          disabled={saveOrg.isPending}
          style={primaryBtnStyle}
        >
          {saveOrg.isPending ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </form>
  );
}

// ── Shared micro-styles ───────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 6,
  border: '1px solid #E2E8F0',
  fontSize: 14,
  color: '#0F172A',
  background: '#fff',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 28px',
  borderRadius: 8,
  background: '#4F46E5',
  color: '#fff',
  border: 'none',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};
