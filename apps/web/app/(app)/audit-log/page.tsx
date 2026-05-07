import { Metadata } from 'next';
import AuditLogClient from '@/components/audit-log/audit-log-client';

export const metadata: Metadata = { title: 'Audit Log | Lotris' };

export default function AuditLogPage() {
  return <AuditLogClient />;
}
