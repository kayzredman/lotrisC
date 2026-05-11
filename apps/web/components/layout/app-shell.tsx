'use client';

import { useState, useCallback } from 'react';
import { Sidebar } from '@/components/sidebar/sidebar';
import { Topbar } from '@/components/layout/topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = useCallback(() => setSidebarOpen(false), []);
  const toggle = useCallback(() => setSidebarOpen(o => !o), []);

  return (
    <div className="v2-app">
      {sidebarOpen && (
        <div className="v2-sidebar-overlay" onClick={close} aria-hidden="true" />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={close} />
      <div className="v2-main">
        <Topbar onMenuClick={toggle} />
        <main className="v2-content">
          {children}
        </main>
      </div>
    </div>
  );
}
