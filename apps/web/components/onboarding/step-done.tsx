'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export function StepDone() {
  const router = useRouter();
  const { data: status } = trpc['onboarding.getStatus'].useQuery();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        paddingTop: 40,
        maxWidth: 560,
        margin: '0 auto',
      }}
    >
      {/* Success icon */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: '#DCFCE7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 40,
          marginBottom: 24,
        }}
      >
        ✅
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', margin: '0 0 10px' }}>
        You&apos;re all set!
      </h1>
      <p style={{ color: '#64748B', fontSize: 16, margin: '0 0 36px', lineHeight: 1.6 }}>
        Your organisation is configured and ready. Your teams, SLA targets, and KPI
        framework are now active.
      </p>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          width: '100%',
          marginBottom: 36,
        }}
      >
        {[
          { label: 'Teams created', value: status?.teamCount ?? '—' },
          { label: 'SLA configured', value: '✓' },
          { label: 'KPIs drafted', value: '✓' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: '#fff',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '16px',
            }}
          >
            <p style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#4F46E5' }}>
              {stat.value}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Checklist */}
      <div
        style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '20px 24px',
          width: '100%',
          marginBottom: 36,
          textAlign: 'left',
        }}
      >
        {[
          'Organisation details saved',
          'Teams created',
          'SLA defaults configured',
          'KPI framework selected',
        ].map((item) => (
          <div
            key={item}
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}
          >
            <span style={{ color: '#22C55E', fontSize: 16, fontWeight: 700 }}>✓</span>
            <span style={{ fontSize: 14, color: '#374151' }}>{item}</span>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => router.replace('/dashboard')}
          style={{
            padding: '12px 32px',
            borderRadius: 8,
            background: '#4F46E5',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Go to Dashboard →
        </button>
        <button
          onClick={() => router.replace('/admin/teams')}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            background: 'transparent',
            color: '#64748B',
            border: '1px solid #E2E8F0',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          View my teams
        </button>
      </div>
    </div>
  );
}
