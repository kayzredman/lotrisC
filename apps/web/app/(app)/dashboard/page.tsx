import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">Welcome to Lotris. Dashboard data loads here in Sprint 11.</p>
    </div>
  );
}
