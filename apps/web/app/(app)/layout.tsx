import { Providers } from '@/components/providers';
import { Sidebar } from '@/components/sidebar/sidebar';
import { Topbar } from '@/components/layout/topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>
        <Sidebar />
        {/* Main area: topbar on top, scrollable content below */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0" style={{ backgroundColor: 'var(--bg-base)' }}>
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
