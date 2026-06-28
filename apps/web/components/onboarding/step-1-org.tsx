'use client';

import { useState } from 'react';
import { useSaveOnboardingOrg } from '@/lib/api/hooks/useOnboarding';
import { Building2 } from 'lucide-react';

const TIMEZONES = [
  { value: 'Africa/Lagos',      label: 'Africa/Lagos (WAT UTC+1)'       },
  { value: 'Africa/Accra',      label: 'Africa/Accra (GMT UTC+0)'       },
  { value: 'Africa/Nairobi',    label: 'Africa/Nairobi (EAT UTC+3)'     },
  { value: 'Africa/Cairo',      label: 'Africa/Cairo (EET UTC+2)'       },
  { value: 'Europe/London',     label: 'Europe/London (GMT/BST UTC+0)'  },
  { value: 'Europe/Paris',      label: 'Europe/Paris (CET UTC+1)'       },
  { value: 'Europe/Berlin',     label: 'Europe/Berlin (CET UTC+1)'      },
  { value: 'America/New_York',  label: 'America/New York (EST UTC-5)'   },
  { value: 'America/Chicago',   label: 'America/Chicago (CST UTC-6)'    },
  { value: 'America/Denver',    label: 'America/Denver (MST UTC-7)'     },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST UTC-8)' },
  { value: 'Asia/Dubai',        label: 'Asia/Dubai (GST UTC+4)'         },
  { value: 'Asia/Singapore',    label: 'Asia/Singapore (SGT UTC+8)'     },
  { value: 'Asia/Tokyo',        label: 'Asia/Tokyo (JST UTC+9)'         },
  { value: 'Australia/Sydney',  label: 'Australia/Sydney (AEST UTC+10)' },
  { value: 'UTC',               label: 'UTC (Coordinated Universal Time)' },
];

const BRAND_COLORS = [
  '#4F46E5', '#0EA5E9', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#64748B',
];

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}

interface Props { onSuccess: () => void; }

export function Step1Org({ onSuccess }: Props) {
  const [name, setName]           = useState('');
  const [slug, setSlug]           = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [timezone, setTimezone]   = useState('Africa/Lagos');
  const [color, setColor]         = useState(BRAND_COLORS[0]);
  const [error, setError]         = useState('');

  const saveOrg = useSaveOnboardingOrg();

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
    saveOrg.mutate(
      { name: name.trim(), slug },
      { onSuccess, onError: (e) => setError(e.message) },
    );
  }

  return (
    <form id="ob-step-form" onSubmit={handleSubmit}>

      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
        Tell us about your organisation
      </h1>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 36px', lineHeight: 1.6 }}>
        This sets your workspace identity. Your engineers will see this name when they log in.
      </p>

      {/* Org Name */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelSt}>Organisation Name</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
            <Building2 size={15} />
          </span>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Acme IT Services"
            required
            style={{ ...inputSt, paddingLeft: 34 }}
          />
        </div>
      </div>

      {/* Short Code + Brand Name */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelSt}>Short Code</label>
          <input
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="acme"
            required
            style={inputSt}
          />
          <span style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4, display: 'block' }}>(3–5 chars)</span>
        </div>
        <div>
          <label style={labelSt}>Report header / brand name</label>
          <input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Acme IT Services"
            style={inputSt}
          />
          <span style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4, display: 'block' }}>(shown on PDF reports)</span>
        </div>
      </div>

      {/* Timezone */}
      <div style={{ marginBottom: 28 }}>
        <label style={labelSt}>Timezone</label>
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={selectSt}>
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      {/* Branding section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Branding</span>
        <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
      </div>

      {/* Brand color + Logo upload */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 4 }}>
        <div>
          <label style={labelSt}>Brand Colour</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {BRAND_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: c,
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  boxShadow: color === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
                  outline: 'none',
                  transition: 'box-shadow 0.15s',
                }}
                aria-label={`Select colour ${c}`}
              />
            ))}
          </div>
        </div>
        <div>
          <label style={labelSt}>Logo (optional)</label>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            marginTop: 8, padding: '8px 16px',
            border: '1px dashed #C7D2FE', borderRadius: 8,
            cursor: 'pointer', fontSize: 13, color: '#4F46E5',
            background: 'rgba(79,70,229,0.04)', fontWeight: 500,
          }}>
            <span style={{ fontSize: 16 }}>↑</span> Upload logo
            <input type="file" accept="image/*" style={{ display: 'none' }} />
          </label>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>PNG, SVG or JPG · max 2 MB</div>
        </div>
      </div>

      {error && (
        <p style={{ color: '#EF4444', fontSize: 13, marginTop: 20 }}>{error}</p>
      )}
    </form>
  );
}

// Shared micro-styles
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: '#374151', marginBottom: 6,
};
const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #E2E8F0', fontSize: 13.5,
  color: '#0F172A', background: '#fff', boxSizing: 'border-box',
  outline: 'none', fontFamily: 'inherit',
};
const selectSt: React.CSSProperties = {
  ...inputSt, cursor: 'pointer',
};


