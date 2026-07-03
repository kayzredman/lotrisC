'use client';

import { useState } from 'react';
import { useSetOnboardingKpiTemplate } from '@/lib/api/hooks/useOnboarding';
import { Clock, Star, BarChart2, Settings, Check } from 'lucide-react';

const KPI_CARDS = [
  {
    key: 'response_resolution' as const,
    icon: Clock,
    name: 'Response & Resolution',
    desc: 'MTTF, MTTR, SLA breach rate. Best for teams focused on speed.',
  },
  {
    key: 'csat' as const,
    icon: Star,
    name: 'Customer Satisfaction',
    desc: 'CSAT, NPS, reopen rate. Best for service-desk quality focus.',
  },
  {
    key: 'balanced' as const,
    icon: BarChart2,
    name: 'Balanced Scorecard',
    desc: 'Equal weight across speed, quality, and volume. Recommended for new teams.',
  },
  {
    key: 'custom' as const,
    icon: Settings,
    name: 'Custom (blank)',
    desc: 'Start from scratch. Define your own KPI definitions and weights.',
  },
] as const;

type KpiKey = typeof KPI_CARDS[number]['key'];

interface Props { onSuccess: () => void; }

export function Step5Kpi({ onSuccess }: Props) {
  const [selected, setSelected]       = useState<KpiKey>('response_resolution');
  const [frequency, setFrequency]     = useState('monthly');
  const [reportEmail, setReportEmail] = useState('');
  const [error, setError]             = useState('');

  const setTemplate = useSetOnboardingKpiTemplate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setTemplate.mutate(selected, { onSuccess, onError: (e) => setError(e.message) });
  }

  return (
    <form id="ob-step-form" onSubmit={handleSubmit}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
        Choose your KPI framework
      </h1>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 32px', lineHeight: 1.6 }}>
        Pick a starting template. You can customise weights and add custom KPIs from the KPI admin page at any time.
      </p>

      {/* KPI card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 36 }}>
        {KPI_CARDS.map((card) => {
          const isSelected = selected === card.key;
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setSelected(card.key)}
              style={{
                position: 'relative',
                textAlign: 'left',
                padding: '18px 16px',
                borderRadius: 10,
                border: isSelected ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                background: isSelected ? 'rgba(79,70,229,0.04)' : '#fff',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {/* Check indicator (top-right) */}
              <div style={{
                position: 'absolute', top: 12, right: 12,
                width: 20, height: 20, borderRadius: '50%',
                background: isSelected ? '#4F46E5' : '#F1F5F9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, opacity 0.15s',
                opacity: isSelected ? 1 : 0.4,
              }}>
                <Check size={11} strokeWidth={3} style={{ color: isSelected ? '#fff' : '#94A3B8' }} />
              </div>

              {/* Icon box */}
              <div style={{
                width: 38, height: 38, borderRadius: 9,
                background: isSelected ? 'rgba(79,70,229,0.12)' : '#F8FAFC',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Icon size={18} style={{ color: isSelected ? '#4F46E5' : '#64748B' }} />
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 5 }}>{card.name}</div>
              <div style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5 }}>{card.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Reporting cadence section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Reporting cadence</span>
        <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelSt}>KPI review frequency</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value)} style={selectSt}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div>
          <label style={labelSt}>Auto-send report to</label>
          <input
            type="email"
            value={reportEmail}
            onChange={e => setReportEmail(e.target.value)}
            placeholder="admin@acme.io"
            style={inputSt}
          />
        </div>
      </div>

      {error && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 16 }}>{error}</p>}
    </form>
  );
}

const labelSt: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 };
const inputSt: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13.5, color: '#0F172A', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' };
const selectSt: React.CSSProperties = { ...inputSt, cursor: 'pointer' };

