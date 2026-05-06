'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  LayoutDashboard,
  Ticket,
  ListOrdered,
  BarChart3,
  FileText,
  CheckSquare,
  Activity,
} from 'lucide-react';
import { cn } from '@lotris/ui';

const NAV_ITEMS = [
  { label: 'Dashboard',     href: '/dashboard',      icon: LayoutDashboard },
  { label: 'Tickets',       href: '/tickets',        icon: Ticket          },
  { label: 'Queue',         href: '/queue',          icon: ListOrdered     },
  { label: 'KPI',           href: '/kpis',           icon: BarChart3       },
  { label: 'Reports',       href: '/reports',        icon: FileText        },
  { label: 'Tasks',         href: '/tasks',          icon: CheckSquare     },
  { label: 'System Health', href: '/system-health',  icon: Activity        },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-[240px] shrink-0 bg-sidebar-bg border-r border-sidebar-border">
        {/* Logo */}
        <div className="flex items-center h-14 px-5 border-b border-sidebar-border shrink-0">
          <span className="text-lg font-bold text-white tracking-tight">Lotris</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
          ))}
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
        {NAV_ITEMS.map((item) => (
          <IconNavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}
        <div className="mt-auto pb-2">
          <UserButton afterSignOutUrl="/login" />
        </div>
      </aside>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-sidebar-bg border-t border-sidebar-border h-16">
        {NAV_ITEMS.slice(0, 5).map((item) => (
          <MobileNavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}
      </nav>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
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
      {label}
    </Link>
  );
}

function IconNavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        'flex items-center justify-center w-10 h-10 rounded-md transition-colors',
        active
          ? 'bg-sidebar-active text-sidebar-text-active'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active',
      )}
    >
      <Icon className="w-5 h-5" />
    </Link>
  );
}

function MobileNavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors',
        active ? 'text-brand' : 'text-sidebar-text',
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="truncate max-w-[56px]">{label}</span>
    </Link>
  );
}
