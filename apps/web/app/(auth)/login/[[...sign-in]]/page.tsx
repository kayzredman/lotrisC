import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Lotris</h1>
        <p className="mt-2 text-sm text-slate-400">Where performance surfaces.</p>
      </div>

      <SignIn
        appearance={{
          variables: {
            colorBackground: '#1e293b',
            colorText: '#f1f5f9',
            colorTextSecondary: '#94a3b8',
            colorInputBackground: '#0f172a',
            colorInputText: '#f1f5f9',
            colorPrimary: '#3b82f6',
            borderRadius: '0.5rem',
          },
          elements: {
            card: 'shadow-2xl border border-slate-700',
            headerTitle: 'text-slate-100',
            headerSubtitle: 'text-slate-400',
            socialButtonsBlockButton: 'border-slate-600 text-slate-200 hover:bg-slate-700',
            dividerLine: 'bg-slate-700',
            dividerText: 'text-slate-500',
            formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
            footerActionLink: 'text-blue-400 hover:text-blue-300',
          },
        }}
        redirectUrl="/dashboard"
        afterSignInUrl="/dashboard"
      />
    </div>
  );
}
