'use client';

import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Search, Bell } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@lotris/ui';

const PAGE_META: Record<string, { title: string; breadcrumb: string }> = {
  '/dashboard':    { title: 'Dashboard',     breadcrumb: 'Home / Overview' },
  '/tickets':      { title: 'Tickets',        breadcrumb: 'Home / Ticket Management' },
  '/queue':        { title: 'Queue',           breadcrumb: 'Home / Team Queue' },
  '/tasks':        { title: 'Tasks',           breadcrumb: 'Home / Task Management' },
  '/kpis':         { title: 'KPIs',            breadcrumb: 'Home / Performance KPIs' },
  '/reports':      { title: 'Reports',         breadcrumb: 'Home / Reports' },
  '/system-health':{ title: 'System Health',  breadcrumb: 'Admin / Operations' },
  '/admin':        { title: 'Admin',           breadcrumb: 'Admin / Settings' },
};

function getPageMeta(pathname: string) {
  for (const [key, meta] of Object.entries(PAGE_META)) {
    if (pathname === key || pathname.startsWith(key + '/')) return meta;
  }
  return { title: 'Lotris', breadcrumb: 'Home' };
}

export function Topbar() {
  const pathname = usePathname();
  const meta = getPageMeta(pathname);
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="shrink-0 flex items-center justify-between h-14 px-4 md:px-6 bg-[#0b0e1a] border-b border-[#1a1f2e] gap-4">

      {/* Left — page title + breadcrumb */}
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-[15px] font-bold text-white leading-tight truncate">
          {meta.title}
        </span>
        <span className="hidden sm:block text-[11px] text-slate-600 leading-tight truncate">
          {meta.breadcrumb}
        </span>
      </div>

      {/* Right — search + bell + avatar */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search — hides on xs, shows from sm */}
        <div
          className={cn(
            'hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg border text-sm transition-all duration-200',
            searchFocused
              ? 'w-52 border-brand/50 bg-[#141926] ring-1 ring-brand/30'
              : 'w-36 border-[#1a1f2e] bg-[#0f1220] text-slate-500',
          )}
        >
          <Search className="w-3.5 h-3.5 shrink-0 text-slate-600" />
          <input
            type="text"
            placeholder="Search…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="bg-transparent outline-none w-full text-slate-200 placeholder-slate-600 text-xs"
          />
        </div>

        {/* Bell */}
        <button
          className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-[#1a1f2e] bg-[#0f1220] text-slate-500 hover:text-slate-200 hover:border-slate-600 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {/* Unread dot */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand" />
        </button>

        {/* User */}
        <UserButton afterSignOutUrl="/login" />
      </div>
    </header>
  );
}
