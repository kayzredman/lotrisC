'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { CheckCircle2, LayoutDashboard, Users } from 'lucide-react';

export function StepDone() {
  const router = useRouter();
  const { data: status } = trpc['onboarding.getStatus'].useQuery();

  const teamCount    = (status as { teamCount?: number } | undefined)?.teamCount ?? 0;
  const inviteCount  = 0; // invite count not tracked in getStatus yet
  const slaTiers     = 4;
  const kpiTemplate  = 1;

  const checklist = [
    'Organisation configured',
    `${teamCount} team${teamCount !== 1 ? 's' : ''} created with leads assigned`,
    'Engineers invited',
    'SLA rules & queue config saved',
    'KPI framework: Response & Resolution',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 20 }}>

      {/* Success icon */}
      <div style={{ width: 68, height: 68, borderRadius: '50%', border: '2.5px solid #C7D2FE', background: 'rgba(79,70,229,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <CheckCircle2 size={34} style={{ color: '#4F46E5' }} />
      </div>

      <h1 style={{ fontSize: 27, fontWeight: 700, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.4px' }}>
        You&apos;re all set!
      </h1>
      <p style={{ color: '#64748B', fontSize: 14.5, margin: '0 0 36px', lineHeight: 1.6, maxWidth: 440 }}>
        Your organisation is live on Lotris. Your team can start receiving and resolving tickets right now.
      </p>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, width: '100%', maxWidth: 520, marginBottom: 32 }}>
        {[
          { val: teamCount, label: 'Teams created' },
          { val: inviteCount, label: 'Invites sent' },
          { val: slaTiers,    label: 'SLA tiers configured' },
          { val: kpiTemplate, label: 'KPI template active' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 10px' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#4F46E5', marginBottom: 4 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Checklist */}
      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 24px', width: '100%', maxWidth: 520, marginBottom: 32, textAlign: 'left' }}>
        {checklist.map((item) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <CheckCircle2 size={16} style={{ color: '#22C55E', flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, color: '#374151' }}>{item}</span>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => router.replace('/dashboard')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 28px', borderRadius: 8, background: '#4F46E5', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <LayoutDashboard size={15} /> Go to Dashboard
        </button>
        <button
          onClick={() => router.replace('/admin/teams')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, background: '#fff', border: '1px solid #E2E8F0', fontWeight: 500, fontSize: 14, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}
        >
          <Users size={15} /> View my teams
        </button>
      </div>
    </div>
  );
}

