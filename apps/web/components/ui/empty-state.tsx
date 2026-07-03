'use client';

import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)' }}>
      {icon && <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{icon}</div>}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      {message && <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>{message}</div>}
    </div>
  );
}
