import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Ops Console | Lotris' };

/** Standalone layout — no app shell, no onboarding guard. */
export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
