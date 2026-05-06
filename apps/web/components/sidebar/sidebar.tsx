'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
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
} from 'lucide-react';
import { cn } from '@lotris/ui';

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
      <aside className="hidden lg:flex flex-col w-[240px] shrink-0 bg-sidebar-bg border-r border-sidebar-border">
        {/* Logo */}
        <div className="flex items-center h-14 px-5 border-b border-sidebar-border shrink-0">
          <span className="text-lg font-bold text-white tracking-tight">Lotris</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Main</p>
            {MAIN_NAV.map((item) => (
              <NavLink key={item.href + item.label} {...item} active={isActive(item.href)} />
            ))}
          </div>
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Admin</p>
            {ADMIN_NAV.map((item) => (
              <NavLink key={item.href + item.label} {...item} active={isActive(item.href)} />
            ))}
          </div>
        </nav>

        {/* User */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-4 border-t border-sidebar-border">
          <UserButton afterSignOutUrl="/login" />
          <span className="text-xs text-sidebar-text truncate">Account</span>
        </div>
      </aside>

      {/* ── Tablet icon rail ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex lg:hidden flex-col w-16 shrink-0 bg-sidebar-bg border-r border-sidebar-border items-center py-3 gap-1">
        <div className="flex items-center justify-center h-10 mb-2">
          <span className="text-sm font-bold text-white">L</span>
        </div>
        {[...MAIN_NAV, ...ADMIN_NAV].map((item) => (
          <IconNavLink key={item.href + item.label} {...item} active={isActive(item.href)} />
        ))}
        <div className="mt-auto pb-2">
          <UserButton afterSignOutUrl="/login" />
        </div>
      </aside>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-sidebar-bg border-t border-sidebar-border h-16">
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
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        active
          ? 'bg-sidebar-active text-sidebar-text-active'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active',
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white px-1">
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
      className={cn(
        'relative flex items-center justify-center w-10 h-10 rounded-md transition-colors',
        active
          ? 'bg-sidebar-active text-sidebar-text-active'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active',
      )}
    >
      <Icon className="w-5 h-5" />
      {badge != null && badge > 0 && (
        <span className="absolute top-1 right-1 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-indigo-600 text-[8px] font-bold text-white">
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
        active ? 'text-brand' : 'text-sidebar-text',
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
