'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { useState, useRef, useEffect } from 'react';
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
  FilePenLine,
  ChevronRight,
  LogOut,
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
  { label: 'Teams',           href: '/admin',               icon: Users      },
  { label: 'KPI Setup',       href: '/admin/kpi-setup',     icon: Settings2  },
  { label: 'KPI Agreement',   href: '/kpis/agreements',     icon: FilePenLine },
  { label: 'System Health',   href: '/system-health',       icon: Activity   },
  { label: 'Audit Log',       href: '/audit-log',           icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const initials = user
    ? ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || 'U'
    : 'RK';
  const fullName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Rowland K.';

  // Close menu when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

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
      <div className="v2-sidebar-footer" ref={menuRef} style={{ position: 'relative' }}>
        {menuOpen && (
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '12px',
            right: '12px',
            background: '#1A1D2E',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 50,
            overflow: 'hidden',
          }}>
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '11px 14px',
                background: 'none',
                border: 'none',
                color: '#F87171',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        )}
        <button
          type="button"
          className="v2-user-card"
          onClick={() => setMenuOpen(o => !o)}
          style={{ cursor: 'pointer', width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: 0 }}
        >
          <div className="v2-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="v2-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</div>
            <div className="v2-user-role">IT Manager</div>
          </div>
          <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, transform: menuOpen ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }} />
        </button>
      </div>
    </aside>
  );
}
