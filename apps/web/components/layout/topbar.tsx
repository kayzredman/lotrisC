'use client';

import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Search, Bell, Moon, Sun, Menu } from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser } from '@/lib/api/hooks/useAuth';

const PAGE_META: Record<string, { title: string; breadcrumb: string[] }> = {
  '/dashboard':         { title: 'Dashboard',     breadcrumb: ['Home', 'Overview'] },
  '/tickets':           { title: 'Tickets',        breadcrumb: ['Home', 'Ticket Management'] },
  '/queue':             { title: 'Queue',           breadcrumb: ['Home', 'Team Queue'] },
  '/tasks':             { title: 'Tasks',           breadcrumb: ['Home', 'Task Management'] },
  '/kpis':              { title: 'KPIs',            breadcrumb: ['Home', 'Performance KPIs'] },
  '/kpis/agreements':   { title: 'KPI Agreement',   breadcrumb: ['KPIs', 'Agreement Builder'] },
  '/reports':           { title: 'Reports',         breadcrumb: ['Home', 'Reports'] },
  '/system-health':     { title: 'System Health',  breadcrumb: ['Admin', 'Operations'] },
  '/admin/kpi-setup':   { title: 'KPI Setup',      breadcrumb: ['Admin', 'KPI Configuration'] },
  '/admin':             { title: 'Teams',           breadcrumb: ['Admin', 'Team Management'] },
  '/audit-log':         { title: 'Audit Log',       breadcrumb: ['Admin', 'Audit Log'] },
};

function getPageMeta(pathname: string) {
  for (const [key, meta] of Object.entries(PAGE_META)) {
    if (pathname === key || pathname.startsWith(key + '/')) return meta;
  }
  return { title: 'Lotris', breadcrumb: ['Home'] };
}

type TopbarProps = { onMenuClick?: () => void };

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const meta = getPageMeta(pathname);
  const [searchFocused, setSearchFocused] = useState(false);
  const { data: me } = useCurrentUser();
  const { theme, setTheme } = useTheme();

  const initials = me?.fullName
    ? me.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="v2-topbar">
      {/* Left — hamburger (mobile) + page title */}
      <div className="v2-topbar-left">
        <button
          type="button"
          className="v2-mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <span className="v2-page-title">{meta.title}</span>
        <nav className="v2-breadcrumb" aria-label="breadcrumb">
          {meta.breadcrumb.map((crumb, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {i > 0 && <span className="v2-breadcrumb-sep">/</span>}
              <span style={{ color: i === meta.breadcrumb.length - 1 ? 'var(--text-muted)' : 'var(--text-light)' }}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right — search + bell + avatar */}
      <div className="v2-topbar-right">
        <div
          className="v2-search-bar"
          style={searchFocused ? { borderColor: 'var(--indigo)', boxShadow: 'var(--shadow-focus)', background: 'var(--bg-card)' } : undefined}
        >
          <Search size={12} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search tickets, tasks…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>

        <button
          type="button"
          className="v2-icon-btn"
          aria-label="Toggle dark mode"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button type="button" className="v2-icon-btn" aria-label="Notifications">
          <Bell size={15} />
          <span className="v2-notif-dot" />
        </button>

        <div
          className="v2-avatar"
          style={{ width: 30, height: 30, borderRadius: 6, flexShrink: 0, cursor: 'pointer', fontSize: 11 }}
          title={me?.fullName ?? 'User'}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
