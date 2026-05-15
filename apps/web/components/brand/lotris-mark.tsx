'use client';

/**
 * LotrisMark — inline SVG of the status-panel logo mark.
 * Three indicator lights: red (tracked), amber (in-progress), green ✓ (resolved).
 *
 * @param height  Rendered height in px. Width auto-scales (200:128 ratio).
 * @param uid     Unique prefix for internal SVG gradient IDs — change when rendering
 *                multiple instances on the same page (prevents defs collision).
 */
export function LotrisMark({
  height = 28,
  uid = 'lm',
}: {
  height?: number;
  uid?: string;
}) {
  const w = Math.round(height * (200 / 128));
  const gradId = `${uid}-top`;

  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 200 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Lotris"
      role="img"
    >
      {/* Panel housing */}
      <rect x="4" y="16" width="192" height="96" rx="18" fill="#111425" stroke="#1E2235" strokeWidth="1.5" />
      <rect x="4" y="16" width="192" height="8" rx="18" fill={`url(#${gradId})`} />
      {/* Screws */}
      <circle cx="20" cy="100" r="3" fill="#0C0E1A" />
      <circle cx="20" cy="100" r="1.5" fill="#1E2235" />
      <circle cx="180" cy="100" r="3" fill="#0C0E1A" />
      <circle cx="180" cy="100" r="1.5" fill="#1E2235" />

      {/* Red — tracked / critical */}
      <circle cx="50" cy="60" r="20" fill="#0C0E1A" stroke="#EF4444" strokeWidth="1" strokeOpacity="0.4" />
      <circle cx="50" cy="60" r="9" fill="#EF4444" fillOpacity="0.45" />
      <circle cx="46.5" cy="56" r="2.5" fill="#FCA5A5" fillOpacity="0.3" />

      {/* Amber — in progress */}
      <circle cx="100" cy="60" r="20" fill="#0C0E1A" stroke="#F59E0B" strokeWidth="1" strokeOpacity="0.5" />
      <circle cx="100" cy="60" r="9" fill="#F59E0B" fillOpacity="0.65" />
      <circle cx="96.5" cy="56" r="2.5" fill="#FDE68A" fillOpacity="0.45" />

      {/* Green — resolved (hero) */}
      <circle cx="152" cy="60" r="32" fill="#10B981" fillOpacity="0.05" />
      <circle cx="152" cy="60" r="26" fill="#10B981" fillOpacity="0.09" />
      <circle cx="152" cy="60" r="20" fill="#0C0E1A" stroke="#10B981" strokeWidth="1.8" />
      <circle cx="152" cy="60" r="15" fill="#10B981" fillOpacity="0.18" />
      <circle cx="152" cy="60" r="11" fill="#10B981" />
      <circle cx="152" cy="60" r="6" fill="#34D399" />
      <path d="M146 60 L150 64.5 L159 54" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="148" cy="55.5" r="3" fill="#A7F3D0" fillOpacity="0.6" />

      <defs>
        <linearGradient id={gradId} x1="100" y1="16" x2="100" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2D3456" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#111425" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * LotrisLogo — horizontal lockup: panel mark + wordmark text.
 * Use this wherever the brand identity needs to appear in full.
 *
 * @param variant      'dark'  → white wordmark (for dark/coloured backgrounds)
 *                     'light' → dark wordmark  (for light/white backgrounds)
 * @param markHeight   Height of the panel mark SVG in px (wordmark scales proportionally).
 * @param uid          Unique ID prefix for SVG gradients (prevent defs collision).
 * @param showTagline  Show "Where performance surfaces." below the wordmark.
 */
export function LotrisLogo({
  variant = 'dark',
  markHeight = 28,
  uid = 'logo',
  showTagline = false,
}: {
  variant?: 'dark' | 'light';
  markHeight?: number;
  uid?: string;
  showTagline?: boolean;
}) {
  const wordmarkColor  = variant === 'dark'  ? '#F8FAFC' : '#0F172A';
  const taglineColor   = variant === 'dark'  ? 'rgba(255,255,255,0.3)' : '#94A3B8';
  const wordmarkSize   = Math.round(markHeight * 0.65);
  const taglineSize    = Math.max(9, Math.round(markHeight * 0.33));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <LotrisMark height={markHeight} uid={uid} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{
          fontSize: wordmarkSize,
          fontWeight: 800,
          color: wordmarkColor,
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
          fontFamily: 'Inter, -apple-system, sans-serif',
        }}>
          Lotris
        </span>
        {showTagline && (
          <span style={{
            fontSize: taglineSize,
            color: taglineColor,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
            marginTop: 3,
            fontFamily: 'Inter, -apple-system, sans-serif',
          }}>
            Where performance surfaces.
          </span>
        )}
      </div>
    </div>
  );
}

