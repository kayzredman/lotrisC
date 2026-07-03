'use client';

import { useState } from 'react';
import { useSaveOnboardingSla } from '@/lib/api/hooks/useOnboarding';
import { useAdminTeams } from '@/lib/api/hooks/useAdmin';
import { Users } from 'lucide-react';

const PRIORITIES = [
  { key: 'critical', label: 'Critical', color: '#EF4444', bg: '#FEF2F2', borderColor: '#FECACA' },
  { key: 'high',     label: 'High',     color: '#F97316', bg: '#FFF7ED', borderColor: '#FED7AA' },
  { key: 'medium',   label: 'Medium',   color: '#EAB308', bg: '#FEFCE8', borderColor: '#FDE68A' },
  { key: 'low',      label: 'Low',      color: '#22C55E', bg: '#F0FDF4', borderColor: '#BBF7D0' },
] as const;

type PriorityKey = (typeof PRIORITIES)[number]['key'];

interface SlaRow { firstResponse: number; resolution: number; escalation: number; }
type SlaMap = Record<PriorityKey, SlaRow>;

const DEFAULT_SLA: SlaMap = {
  critical: { firstResponse: 1,  resolution: 4,   escalation: 2  },
  high:     { firstResponse: 4,  resolution: 8,   escalation: 6  },
  medium:   { firstResponse: 8,  resolution: 24,  escalation: 16 },
  low:      { firstResponse: 24, resolution: 72,  escalation: 48 },
};

interface Props { onSuccess: () => void; }

export function Step4Sla({ onSuccess }: Props) {
  const [sla, setSla]             = useState<SlaMap>(DEFAULT_SLA);
  const [maxTickets, setMaxTickets] = useState(10);
  const [queueAlgo, setQueueAlgo] = useState('priority-sla');
  const [autoAssign, setAutoAssign] = useState('least-loaded');
  const [escalTeam, setEscalTeam]   = useState('');
  const [error, setError]           = useState('');

  const saveSla = useSaveOnboardingSla();

  const { data: teamsData } = useAdminTeams();
  const teams = (teamsData ?? []) as { id: string; name: string }[];

  function updateSla(p: PriorityKey, field: keyof SlaRow, val: string) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) setSla(prev => ({ ...prev, [p]: { ...prev[p], [field]: n } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    // Map Critical first response → pickupSlaMinutes (in minutes from hours)
    // Map Critical resolution → resolutionSlaMinutes (in minutes from hours)
    const pickupSlaMinutes     = sla.critical.firstResponse * 60;
    const resolutionSlaMinutes = sla.critical.resolution * 60;
    saveSla.mutate(
      { pickupSlaMinutes, resolutionSlaMinutes },
      { onSuccess, onError: (e) => setError(e.message) },
    );
  }

  return (
    <form id="ob-step-form" onSubmit={handleSubmit}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
        Set your SLA &amp; queue rules
      </h1>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 32px', lineHeight: 1.6 }}>
        Define how quickly tickets must be responded to and how many tickets each engineer can carry. These become your team&apos;s performance baseline.
      </p>

      {/* SLA Response Times */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>SLA Response Times</span>
        <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
      </div>

      {/* SLA table */}
      <div style={{ width: '100%', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', letterSpacing: '0.3px' }}>Priority</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', letterSpacing: '0.3px' }}>First Response</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', letterSpacing: '0.3px' }}>Resolution</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', letterSpacing: '0.3px' }}>Escalation After</th>
            </tr>
          </thead>
          <tbody>
            {PRIORITIES.map((p, i) => (
              <tr key={p.key} style={{ borderTop: i > 0 ? '1px solid #F1F5F9' : 'none' }}>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>{p.label}</span>
                  </div>
                </td>
                {(['firstResponse', 'resolution', 'escalation'] as const).map(field => (
                  <td key={field} style={{ padding: '8px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <input
                        type="number" min={1}
                        value={sla[p.key][field]}
                        onChange={e => updateSla(p.key, field, e.target.value)}
                        style={{ width: 56, padding: '5px 8px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, color: '#0F172A', background: '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <span style={{ fontSize: 11.5, color: '#94A3B8' }}>hrs</span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Queue & Capacity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Queue &amp; Capacity</span>
        <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelSt}>Max open tickets per engineer</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
              <Users size={14} />
            </span>
            <input type="number" min={1} max={50} value={maxTickets} onChange={e => setMaxTickets(Number(e.target.value))} style={{ ...inputSt, paddingLeft: 34 }} />
          </div>
        </div>
        <div>
          <label style={labelSt}>Queue algorithm</label>
          <select value={queueAlgo} onChange={e => setQueueAlgo(e.target.value)} style={selectSt}>
            <option value="priority-sla">Priority → SLA deadline (recommended)</option>
            <option value="fifo">FIFO (first in, first out)</option>
            <option value="round-robin">Round-robin by engineer</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
        <div>
          <label style={labelSt}>Auto-assign new tickets</label>
          <select value={autoAssign} onChange={e => setAutoAssign(e.target.value)} style={selectSt}>
            <option value="least-loaded">Yes — assign to least-loaded engineer</option>
            <option value="no">No — engineers claim from queue</option>
          </select>
        </div>
        <div>
          <label style={labelSt}>Escalation target team</label>
          <select value={escalTeam} onChange={e => setEscalTeam(e.target.value)} style={selectSt}>
            <option value="">— none —</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {error && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 16 }}>{error}</p>}
    </form>
  );
}

const labelSt: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 };
const inputSt: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13.5, color: '#0F172A', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' };
const selectSt: React.CSSProperties = { ...inputSt, cursor: 'pointer' };


