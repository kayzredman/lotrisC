'use client';

import { API_BASE } from '@/lib/api/client';

type MicrosoftSignInButtonProps = {
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
  label?: string;
  hint?: string;
};

export function MicrosoftLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function buildMicrosoftLoginUrl(returnUrl: string) {
  return `${API_BASE}/api/v1/auth/microsoft/login?returnUrl=${encodeURIComponent(returnUrl)}`;
}

export function MicrosoftSignInButton({
  onClick,
  href,
  disabled = false,
  fullWidth = false,
  size = 'md',
  label = 'Sign in with Microsoft',
  hint,
}: MicrosoftSignInButtonProps) {
  const isSm = size === 'sm';
  const className = isSm ? 'v2-btn v2-btn-primary v2-btn-sm' : 'v2-btn v2-btn-secondary';

  function handleClick() {
    if (disabled) return;
    if (onClick) {
      onClick();
      return;
    }
    if (href) {
      window.location.href = href;
    }
  }

  return (
    <div>
      {hint && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          {hint}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={className}
        style={{
          width: fullWidth ? '100%' : undefined,
          minHeight: isSm ? undefined : 44,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <MicrosoftLogo size={16} />
        {label}
      </button>
    </div>
  );
}
