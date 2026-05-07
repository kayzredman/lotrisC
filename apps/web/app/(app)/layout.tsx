import { Providers } from '@/components/providers';
import { Sidebar } from '@/components/sidebar/sidebar';
import { Topbar } from '@/components/layout/topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="v2-app">
        <Sidebar />
        <div className="v2-main">
          <Topbar />
          <main className="v2-content">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
