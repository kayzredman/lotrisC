type LogoProps = { size?: number; className?: string };

/** Anthropic Claude — official coral starburst mark */
export function ClaudeLogo({ size = 24, className }: LogoProps) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <g fill="#D97757" transform="translate(12 12)">
        {rays.map((deg) => (
          <rect key={deg} x="-1.15" y="-8.75" width="2.3" height="5.75" rx="1.15" transform={`rotate(${deg})`} />
        ))}
      </g>
    </svg>
  );
}

/** Cursor IDE — official dark cube mark */
export function CursorLogo({ size = 24, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5.5" fill="#0B0B0B" />
      <path fill="#F5F5F5" d="M6.5 7.2 17.5 4.8v14.4L6.5 16.8V7.2Z" />
      <path fill="#A0A0A0" d="M6.5 7.2 17.5 4.8 14.2 7.2 6.5 9.6V7.2Z" />
      <path fill="#D4D4D4" d="M6.5 16.8 17.5 19.2V4.8L14.2 7.2v11.6L6.5 16.8Z" opacity=".55" />
    </svg>
  );
}

/** ChatGPT — green tile with OpenAI knot */
export function ChatGptLogo({ size = 24, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5.5" fill="#10A37F" />
      <g transform="translate(4.5 4.5) scale(0.62)">
        <path
          fill="#fff"
          d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.055 6.055 0 0 0-.747-7.073ZM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.074.074 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494ZM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646ZM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872Zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667Zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66Zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681Zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5Z"
        />
      </g>
    </svg>
  );
}

/** Microsoft Copilot — official rainbow ribbon (Microsoft adoption assets) */
export function CopilotLogo({ size = 24, className }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/providers/copilot.svg"
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}

/** OpenAI — official knot mark */
export function OpenAiLogo({ size = 24, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        fill="#412991"
        d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.055 6.055 0 0 0-.747-7.073ZM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.074.074 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494ZM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646ZM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872Zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667Zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66Zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681Zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5Z"
      />
    </svg>
  );
}

export type AiProviderId = 'CLAUDE' | 'CURSOR' | 'CHATGPT' | 'COPILOT' | 'OPENAI';

export function AiProviderLogo({ provider, size = 24, className }: { provider: AiProviderId; size?: number; className?: string }) {
  switch (provider) {
    case 'CLAUDE':
      return <ClaudeLogo size={size} className={className} />;
    case 'CURSOR':
      return <CursorLogo size={size} className={className} />;
    case 'CHATGPT':
      return <ChatGptLogo size={size} className={className} />;
    case 'COPILOT':
      return <CopilotLogo size={size} className={className} />;
    case 'OPENAI':
      return <OpenAiLogo size={size} className={className} />;
    default:
      return null;
  }
}
