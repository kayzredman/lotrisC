import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AdminTabs } from '@/components/admin/admin-tabs';

export const metadata: Metadata = { title: 'Admin — Users & Teams' };

/** Only ADMIN and SUPERADMIN may access this page. */
export default async function AdminPage() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Admin</h1>
        <p className="mt-1 text-sm text-slate-400">Manage users and teams for your organisation.</p>
      </div>
      <AdminTabs />
    </div>
  );
}
