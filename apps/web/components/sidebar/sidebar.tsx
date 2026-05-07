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


type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
};

const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard',  href: '/dashboard', icon: LayoutDashboard },
  { label: 'Tickets',    href: '/tickets',   icon: Ticket,   badge: 0 },
  { label: 'Queue',      href: '/queue',     icon: Layers,   badge: 0 },
  { label: 'Tasks',      href: '/tasks',     icon: CheckSquare },
  { label: 'KPIs',       href: '/kpis',      icon: BarChart3 },
  { label: 'Reports',    href: '/reports',   icon: FileText  },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Teams',         href: '/admin',          icon: Users      },
  { label: 'KPI Setup',     href: '/kpis',           icon: Settings2  },
  { label: 'System Health', href: '/system-health',  icon: Activity   },
  { label: 'Audit Log',     href: '/admin',          icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-[240px] shrink-0 border-r" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}>
        {/* Logo */}
        <div className="flex items-center h-14 px-5 shrink-0 gap-2.5 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
          {/* Diamond logo — Access Bank-inspired */}
          <span className="relative flex items-center justify-center w-8 h-8 shrink-0">
            <span className="absolute w-6 h-6 bg-brand rotate-45 rounded-sm" />
            <span className="relative z-10 text-white text-[11px] font-black tracking-tight">L</span>
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--sidebar-text-active)' }}>Lotris</span>
            <span className="text-[9px] text-brand/70 uppercase tracking-[0.15em] font-medium">Helpdesk</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Main</p>
            {MAIN_NAV.map((item) => (
              <NavLink key={item.href + item.label} {...item} active={isActive(item.href)} />
            ))}
          </div>
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Admin</p>
            {ADMIN_NAV.map((item) => (
              <NavLink key={item.href + item.label} {...item} active={isActive(item.href)} />
            ))}
          </div>
        </nav>

        {/* User */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-4 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
          <UserButton afterSignOutUrl="/login" />
          <span className="text-xs truncate" style={{ color: 'var(--sidebar-text)' }}>Account</span>
        </div>
      </aside>

      {/* ── Tablet icon rail ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex lg:hidden flex-col w-16 shrink-0 border-r items-center py-3 gap-1" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}>
        <div className="flex items-center justify-center w-9 h-9 mb-2">
          <span className="relative flex items-center justify-center w-8 h-8">
            <span className="absolute w-6 h-6 bg-brand rotate-45 rounded-sm" />
            <span className="relative z-10 text-white text-[11px] font-black">L</span>
          </span>
        </div>
        {[...MAIN_NAV, ...ADMIN_NAV].map((item) => (
          <IconNavLink key={item.href + item.label} {...item} active={isActive(item.href)} />
        ))}
        <div className="mt-auto pb-2">
          <UserButton afterSignOutUrl="/login" />
        </div>
      </aside>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t h-16" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}>
        {MAIN_NAV.slice(0, 5).map((item) => (
          <MobileNavLink key={item.href + item.label} {...item} active={isActive(item.href)} />
        ))}
      </nav>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NavLink({
  href, label, icon: Icon, active, badge,
}: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      style={active ? undefined : { color: 'var(--sidebar-text)' }}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all',
        active
          ? 'bg-brand/15 text-brand'
          : 'hover:bg-black/5 dark:hover:bg-white/5',
      )}
    >
      {/* Active left bar */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-brand shadow-[0_0_8px_rgba(245,127,32,0.6)]" />
      )}
      <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-brand' : '')} />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

function IconNavLink({
  href, label, icon: Icon, active, badge,
}: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      title={label}
      style={active ? undefined : { color: 'var(--sidebar-text)' }}
      className={cn(
        'relative flex items-center justify-center w-10 h-10 rounded-md transition-colors',
        active
          ? 'bg-brand/10 text-brand'
          : 'hover:bg-black/5 dark:hover:bg-white/5',
      )}
    >
      <Icon className="w-5 h-5" />
      {badge != null && badge > 0 && (
        <span className="absolute top-1 right-1 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-brand text-[8px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

function MobileNavLink({
  href, label, icon: Icon, active, badge,
}: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'relative flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors',
        active ? 'text-brand' : '',
      )}
    >
      <div className="relative">
        <Icon className="w-5 h-5" />
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-indigo-600 text-[8px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="truncate max-w-[56px]">{label}</span>
    </Link>
  );
}
