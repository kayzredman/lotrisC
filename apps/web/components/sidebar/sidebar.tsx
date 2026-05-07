'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  LayoutDashboard,
  Ticket,
  Layers,
  BarChart3,
  FileText,
  CheckSquare,
  Activity,
  Users,
  ShieldCheck,
  Settings2,
  ChevronRight,
} from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
};

const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Tickets',   href: '/tickets',    icon: Ticket,   badge: 12 },
  { label: 'Queue',     href: '/queue',      icon: Layers,   badge: 9  },
  { label: 'Tasks',     href: '/tasks',      icon: CheckSquare },
  { label: 'KPIs',      href: '/kpis',       icon: BarChart3 },
  { label: 'Reports',   href: '/reports',    icon: FileText  },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Teams',         href: '/admin',            icon: Users      },
  { label: 'KPI Setup',     href: '/admin/kpi-setup',  icon: Settings2  },
  { label: 'System Health', href: '/system-health',    icon: Activity   },
  { label: 'Audit Log',     href: '/audit-log',        icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const initials = user
    ? ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || 'U'
    : 'RK';
  const fullName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Rowland K.';

  return (
    <aside className="v2-sidebar">
      {/* Logo */}
      <div className="v2-sidebar-logo">
        <div className="v2-logo-mark">
          <div className="v2-logo-icon">Lo</div>
          <div>
            <div className="v2-logo-text">Lotris</div>
            <div className="v2-logo-sub">IT Help Desk</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="v2-sidebar-nav">
        <div className="v2-nav-section-label">Main</div>
        {MAIN_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`v2-nav-item${active ? ' active' : ''}`}
            >
              <span className="v2-nav-icon">
                <item.icon size={14} />
              </span>
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span className="v2-nav-badge">{item.badge}</span>
              )}
            </Link>
          );
        })}

        <div className="v2-nav-section-label">Admin</div>
        {ADMIN_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`v2-nav-item${active ? ' active' : ''}`}
            >
              <span className="v2-nav-icon">
                <item.icon size={14} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="v2-sidebar-footer">
        <div className="v2-user-card">
          <div className="v2-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="v2-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</div>
            <div className="v2-user-role">IT Manager</div>
          </div>
          <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  );
}
