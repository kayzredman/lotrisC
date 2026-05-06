'use client';

import { useEffect, useRef, useState } from 'react';

interface SlaBadgeProps {
  deadline: Date | string | null | undefined;
  breached: boolean;
  label?: string;
}

function getPercent(deadline: Date): number {
  const now = Date.now();
  const end = deadline.getTime();
  // Assume SLA window — display urgency purely from remaining time
  // 0–30 min = 0–100% in the final window; use remaining absolute
  const remaining = end - now;
  if (remaining <= 0) return 0;
  // Color thresholds based on remaining minutes
  const remainingMin = remaining / 60_000;
  if (remainingMin > 120) return 90;
  if (remainingMin > 30) return 50;
  if (remainingMin > 10) return 25;
  return 10;
}

function formatRemaining(deadline: Date): string {
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return 'BREACHED';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function SlaBadge({ deadline, breached, label = 'SLA' }: SlaBadgeProps) {
  const parsed = deadline ? new Date(deadline) : null;
  const [display, setDisplay] = useState(() =>
    parsed ? formatRemaining(parsed) : '—',
  );

  useEffect(() => {
    if (!parsed) return;
    const tick = () => setDisplay(formatRemaining(parsed));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [parsed]);

  if (!parsed) {
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-surface text-gray-400 border border-gray-700">
        {label}: —
      </span>
    );
  }

  const pct = getPercent(parsed);
  const isBreached = breached || parsed.getTime() <= Date.now();

  const colorClass = isBreached
    ? 'bg-red-900/30 text-red-400 border-red-700'
    : pct < 25
      ? 'bg-amber-900/30 text-amber-400 border-amber-700'
      : 'bg-green-900/30 text-green-400 border-green-700';

  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border ${colorClass}`}
    >
      {label}: {display}
    </span>
  );
}
