'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCompleteOnboarding } from '@/lib/api/hooks/useOnboarding';
import {
  Cloud, LogOut, RotateCcw, ArrowLeft, ArrowRight,
  Check, BookmarkCheck, X, RotateCcw as ResetIcon,
} from 'lucide-react';
import { LotrisLogo } from '@/components/brand/lotris-mark';
import { Step1Org } from './step-1-org';
import { Step2Teams } from './step-2-teams';
import { Step3Invite } from './step-3-invite';
import { Step4Sla } from './step-4-sla';
import { Step5Kpi } from './step-5-kpi';
import { StepDone } from './step-done';

const STORAGE_KEY = 'lotris_onboarding_draft';

const STEPS = [
  { n: 1 as const, title: 'Organisation Setup',  sub: 'Name, logo & timezone',        skipable: false },
  { n: 2 as const, title: 'Build Your Teams',     sub: 'Create teams, assign leads',   skipable: false },
  { n: 3 as const, title: 'Invite Engineers',     sub: 'Send sign-up invites',         skipable: true  },
  { n: 4 as const, title: 'SLA & Queue Config',   sub: 'Response times & capacity',    skipable: true  },
  { n: 5 as const, title: 'KPI Framework',        sub: 'Choose your KPI template',     skipable: true  },
];

type StepNum = 1 | 2 | 3 | 4 | 5 | 6;

function loadSavedStep(): StepNum {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 1;
    const { step } = JSON.parse(raw) as { step: number };
    if (step >= 1 && step <= 6) return step as StepNum;
  } catch { /* ignore */ }
  return 1;
}

function saveStep(step: StepNum) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, savedAt: Date.now() })); } catch { /* ignore */ }
}

function clearProgress() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepNum>(1);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [resumedFromStep, setResumedFromStep] = useState<StepNum>(1);
  const [showResetModal, setShowResetModal] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const completeMutation = useCompleteOnboarding();

  useEffect(() => {
    const saved = loadSavedStep();
    if (saved > 1 && saved < 6) {
      setCurrentStep(saved);
      setResumedFromStep(saved);
      setShowResumeBanner(true);
    }
  }, []);

  function goToStep(step: StepNum) {
    setCurrentStep(step);
    saveStep(step);
  }

  function flashSaved() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2200);
  }

  function handleNext() {
    const next = (currentStep < 6 ? currentStep + 1 : 6) as StepNum;
    goToStep(next);
    flashSaved();
  }

  function handleBack() {
    if (currentStep <= 1) return;
    goToStep((currentStep - 1) as StepNum);
  }

  function handleSkip() {
    handleNext();
  }

  function triggerContinue() {
    // Fire the current step's form submit via the form id
    const form = document.getElementById('ob-step-form') as HTMLFormElement | null;
    if (form) {
      form.requestSubmit();
    } else {
      // Steps with no save (e.g., step 6 / done) just advance
      handleNext();
    }
  }

  function handleFinish() {
    completeMutation.mutate(undefined, {
      onSuccess: () => {
        clearProgress();
        router.replace('/dashboard');
      },
    });
  }

  function handleSaveExit() {
    saveStep(currentStep);
    flashSaved();
    setResumedFromStep(currentStep);
    setShowResumeBanner(true);
  }

  function doReset() {
    clearProgress();
    setCurrentStep(1);
    setShowResumeBanner(false);
    setShowResetModal(false);
  }

  const progressPct = currentStep <= 5 ? currentStep * 20 : 100;
  const currentStepMeta = STEPS.find((s) => s.n === currentStep);
  const resumeStepMeta = STEPS.find((s) => s.n === resumedFromStep);
  const isSkipable = currentStepMeta?.skipable ?? false;
  const isDone = currentStep === 6;

  // Register the per-step form submit ref (steps call this)
  function registerFormRef(ref: HTMLFormElement | null) {
    formRef.current = ref;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Left Rail ──────────────────────────────────────────────────── */}
      <aside style={{
        width: 300, minWidth: 300, flexShrink: 0,
        background: 'var(--sidebar-bg)',
        display: 'flex', flexDirection: 'column',
        padding: '36px 28px 32px',
        position: 'sticky', top: 0, height: '100vh',
        overflow: 'hidden',
      }}>
        {/* ambient glow (decorative) */}
        <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', background: 'var(--indigo)', opacity: 0.07, top: -80, right: -100, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: '#6366F1', opacity: 0.05, bottom: 80, left: -60, pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44, position: 'relative', zIndex: 1 }}>
          <LotrisLogo variant="dark" markHeight={32} uid="ob" showTagline />
        </div>

        {/* Headline copy */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', marginBottom: 7, lineHeight: 1.35 }}>
            Let&apos;s get your team set up
          </h2>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.6, margin: 0 }}>
            This takes about 5 minutes. You can come back and change anything later.
          </p>
        </div>

        {/* Overall progress */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 600, marginBottom: 6, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.3px' }}>
            <span>OVERALL PROGRESS</span>
            <span style={{ color: '#A5B4FC' }}>{progressPct}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #6366F1, #818CF8)', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Step list */}
        <nav style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          {STEPS.map((s, i) => {
            const done = currentStep > s.n;
            const active = currentStep === s.n;
            return (
              <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '10px 0', position: 'relative' }}>
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div style={{
                    position: 'absolute', left: 13, top: 38,
                    width: 2, height: 'calc(100% - 14px)',
                    background: done ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)',
                  }} />
                )}
                {/* Dot */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, marginTop: 1,
                  background: done ? 'rgba(99,102,241,0.25)' : active ? 'var(--indigo)' : 'rgba(255,255,255,0.04)',
                  color: done ? '#A5B4FC' : active ? '#fff' : 'rgba(255,255,255,0.2)',
                  border: done ? '1.5px solid rgba(99,102,241,0.45)' : active ? '1.5px solid #6366F1' : '1.5px solid rgba(255,255,255,0.08)',
                  boxShadow: active ? '0 0 0 4px rgba(99,102,241,0.18)' : 'none',
                }}>
                  {done ? <Check size={11} strokeWidth={3} /> : s.n}
                </div>
                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: done ? 'rgba(255,255,255,0.55)' : active ? '#fff' : 'rgba(255,255,255,0.22)', transition: 'color 0.15s' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 1, lineHeight: 1.4, color: done ? 'rgba(255,255,255,0.2)' : active ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.12)' }}>
                    {s.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Rail footer */}
        <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 8, color: savedFlash ? '#A5B4FC' : 'rgba(255,255,255,0.25)', transition: 'color 0.3s' }}>
            <Cloud size={12} />
            <span>{savedFlash ? 'Draft saved · just now' : 'Progress auto-saved'}</span>
          </div>
          <button onClick={handleSaveExit} style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '7px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.28)', fontFamily: 'inherit', textAlign: 'left' }}>
            <LogOut size={13} /> Save &amp; exit
          </button>
          <button onClick={() => setShowResetModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '7px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.28)', fontFamily: 'inherit', textAlign: 'left' }}>
            <RotateCcw size={13} /> Cancel &amp; start again
          </button>
        </div>
      </aside>

      {/* ── Right Panel ────────────────────────────────────────────────── */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

        {/* Top accent bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #6366F1 0%, #818CF8 60%, transparent 100%)' }} />

        {/* Panel inner (scrollable content) */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '52px 40px 40px', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 600 }}>

            {/* Resume banner */}
            {showResumeBanner && resumeStepMeta && !isDone && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--indigo-dim)', border: '1px solid var(--indigo-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 24 }}>
                <BookmarkCheck size={15} style={{ color: 'var(--indigo)', flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, fontSize: 13, color: 'var(--indigo)', lineHeight: 1.5 }}>
                  Welcome back — you left off at{' '}
                  <strong>Step {resumeStepMeta.n}: {resumeStepMeta.title}</strong>. Picking up where you left off.
                </div>
                <button onClick={() => setShowResumeBanner(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Step label */}
            {!isDone && (
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--indigo)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 6 }}>
                Step {currentStep} of 5
              </div>
            )}

            {/* Step content */}
            {currentStep === 1 && <Step1Org onSuccess={handleNext} />}
            {currentStep === 2 && <Step2Teams onSuccess={handleNext} />}
            {currentStep === 3 && <Step3Invite onSuccess={handleNext} />}
            {currentStep === 4 && <Step4Sla onSuccess={handleNext} />}
            {currentStep === 5 && <Step5Kpi onSuccess={() => { handleNext(); handleFinish(); }} />}
            {currentStep === 6 && <StepDone />}

          </div>
        </div>

        {/* ── Bottom Nav ─────────────────────────────────────────────── */}
        {!isDone && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', boxShadow: '0 -1px 0 var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#fff', fontSize: 13, fontWeight: 500, color: currentStep === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: currentStep === 1 ? 'default' : 'pointer', opacity: currentStep === 1 ? 0.5 : 1, fontFamily: 'inherit' }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Step <strong style={{ color: 'var(--text-primary)' }}>{currentStep}</strong> of 5
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isSkipable && (
                <button
                  onClick={handleSkip}
                  style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}
                >
                  Skip this step
                </button>
              )}
              <button
                type="submit"
                form="ob-step-form"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--indigo)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Continue <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Reset modal ─────────────────────────────────────────────────── */}
      {showResetModal && (
        <div
          onClick={() => setShowResetModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, padding: 32, width: 380, maxWidth: 'calc(100vw - 48px)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', textAlign: 'center' }}
          >
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEF3C7', border: '1.5px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <ResetIcon size={22} style={{ color: '#D97706' }} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Cancel &amp; start again?</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
              This clears all your setup progress. You&apos;ll go back to Step 1 — Organisation Setup. This action can&apos;t be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={doReset}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}
              >
                <X size={14} /> Yes, start fresh
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                style={{ padding: '9px 20px', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: 'var(--text-primary)' }}
              >
                Keep going
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
