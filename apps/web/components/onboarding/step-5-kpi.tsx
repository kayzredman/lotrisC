'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

type Template = 'response_resolution' | 'csat' | 'balanced' | 'custom';

const TEMPLATES: {
  id: Template;
  title: string;
  description: string;
  tags: string[];
}[] = [
  {
    id: 'response_resolution',
    title: 'Response & Resolution',
    description: 'Focus on speed: first-response time, resolution time, and SLA compliance.',
    tags: ['MTTR', 'MTTFR', 'SLA'],
  },
  {
    id: 'csat',
    title: 'CSAT Focus',
    description: 'Measure customer satisfaction, NPS, and reopen rates.',
    tags: ['CSAT', 'NPS', 'Reopen Rate'],
  },
  {
    id: 'balanced',
    title: 'Balanced Scorecard',
    description: 'Combines speed, quality, satisfaction, and volume into one framework.',
    tags: ['MTTR', 'SLA', 'CSAT', 'Volume'],
  },
  {
    id: 'custom',
    title: 'Custom',
    description: 'Skip presets and define your own KPIs in the KPI Manager.',
    tags: ['Manual setup'],
  },
];

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function Step5Kpi({ onBack, onNext }: Props) {
  const [selected, setSelected] = useState<Template>('balanced');
  const [error, setError] = useState('');

  const setTemplate = trpc['onboarding.setKpiTemplate'].useMutation({
    onSuccess: onNext,
    onError: (e) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setTemplate.mutate({ template: selected });
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={h1}>KPI Framework</h1>
      <p style={subtext}>
        Choose a KPI template to get started. These create a set of draft KPI definitions that you
        can activate and customise in the KPI Manager.
      </p>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            marginBottom: 28,
          }}
        >
          {TEMPLATES.map((t) => {
            const active = selected === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                style={{
                  textAlign: 'left',
                  padding: 16,
                  borderRadius: 10,
                  border: active ? '2px solid #4F46E5' : '2px solid #E2E8F0',
                  background: active ? '#EEF2FF' : '#fff',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{t.title}</p>
                  {active && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: '#4F46E5',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: 99,
                        marginLeft: 6,
                        flexShrink: 0,
                      }}
                    >
                      Selected
                    </span>
                  )}
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                  {t.description}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {t.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        background: active ? '#C7D2FE' : '#F1F5F9',
                        color: active ? '#3730A3' : '#64748B',
                        padding: '2px 8px',
                        borderRadius: 99,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" onClick={onBack} style={ghostBtnStyle}>← Back</button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onNext} style={ghostBtnStyle}>Skip</button>
            <button type="submit" disabled={setTemplate.isPending} style={primaryBtnStyle}>
              {setTemplate.isPending ? 'Applying…' : 'Finish Setup →'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const h1: React.CSSProperties = { fontSize: 28, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' };
const subtext: React.CSSProperties = { color: '#64748B', margin: '0 0 28px', fontSize: 15 };
const primaryBtnStyle: React.CSSProperties = { padding: '10px 28px', borderRadius: 8, background: '#4F46E5', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const ghostBtnStyle: React.CSSProperties = { ...primaryBtnStyle, background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0' };
