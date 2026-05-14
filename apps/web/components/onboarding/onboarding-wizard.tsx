'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Step1Org } from './step-1-org';
import { Step2Teams } from './step-2-teams';
import { Step3Invite } from './step-3-invite';
import { Step4Sla } from './step-4-sla';
import { Step5Kpi } from './step-5-kpi';
import { StepDone } from './step-done';

const STORAGE_KEY = 'lotris_onboarding_draft';

const STEPS = [
  { n: 1, label: 'Organisation' },
  { n: 2, label: 'Teams' },
  { n: 3, label: 'Invite Engineers' },
  { n: 4, label: 'SLA & Queue' },
  { n: 5, label: 'KPI Framework' },
] as const;

type StepNum = 1 | 2 | 3 | 4 | 5 | 6;

function loadSavedStep(): StepNum {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 1;
    const { step } = JSON.parse(raw) as { step: number };
    if (step >= 1 && step <= 6) return step as StepNum;
  } catch {
    /* ignore */
  }
  return 1;
}

function saveStep(step: StepNum) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step }));
  } catch {
    /* ignore */
  }
}

function clearProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepNum>(1);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const completeMutation = trpc['onboarding.complete'].useMutation({
    onSuccess: () => {
      clearProgress();
      router.replace('/dashboard');
    },
  });

  // Restore saved step on mount
  useEffect(() => {
    const saved = loadSavedStep();
    if (saved > 1 && saved < 6) {
      setCurrentStep(saved);
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

  function handleNext(nextStep: StepNum) {
    goToStep(nextStep);
    flashSaved();
  }

  function handleFinish() {
    completeMutation.mutate();
  }

  function handleSaveExit() {
    saveStep(currentStep);
    flashSaved();
    // Show banner inline
    setShowResumeBanner(true);
  }

  function handleReset() {
    setShowResetModal(true);
  }

  function doReset() {
    clearProgress();
    setCurrentStep(1);
    setShowResumeBanner(false);
    setShowResetModal(false);
  }

  const progressPct = currentStep <= 5 ? currentStep * 20 : 100;
  const resumeStep = STEPS.find((s) => s.n === currentStep);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg, #F8FAFC)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* ── Left Rail ──────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: 300,
          minWidth: 300,
          background: 'var(--sidebar-bg, #0C0E1A)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 28px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--indigo, #4F46E5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            L
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>lotris</span>
        </div>

        <p style={{ color: '#94A3B8', fontSize: 13, marginBottom: 24 }}>
          Let&apos;s get your team set up
        </p>

        {/* Progress bar */}
        <div
          style={{
            height: 4,
            borderRadius: 99,
            background: 'rgba(255,255,255,0.1)',
            marginBottom: 28,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #4F46E5, #818CF8)',
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Step list */}
        <nav style={{ flex: 1 }}>
          {STEPS.map((s, i) => {
            const done = currentStep > s.n;
            const active = currentStep === s.n;
            return (
              <div key={s.n} style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 0',
                  }}
                >
                  {/* Connector line (not first) */}
                  {i > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 11,
                        top: 0,
                        width: 2,
                        height: 10,
                        background: done ? '#4F46E5' : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  )}
                  {/* Step dot */}
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      background: done
                        ? '#4F46E5'
                        : active
                          ? 'rgba(79,70,229,0.3)'
                          : 'rgba(255,255,255,0.06)',
                      border: active ? '2px solid #4F46E5' : '2px solid transparent',
                      color: done ? '#fff' : active ? '#818CF8' : '#64748B',
                    }}
                  >
                    {done ? '✓' : s.n}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: done ? '#fff' : active ? '#E2E8F0' : '#64748B',
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Rail footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
          <p
            style={{
              fontSize: 11,
              color: savedFlash ? '#22C55E' : '#475569',
              marginBottom: 12,
              transition: 'color 0.2s',
            }}
          >
            {savedFlash ? 'Draft saved · just now' : 'Progress auto-saved'}
          </p>
          <button
            onClick={handleSaveExit}
            style={{
              width: '100%',
              padding: '8px 0',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94A3B8',
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: 8,
            }}
          >
            Save &amp; exit
          </button>
          <button
            onClick={handleReset}
            style={{
              width: '100%',
              padding: '8px 0',
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              color: '#475569',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Cancel &amp; start again
          </button>
        </div>
      </aside>

      {/* ── Main Form Area ─────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 64px',
          maxWidth: 800,
        }}
      >
        {/* Resume banner */}
        {showResumeBanner && resumeStep && currentStep < 6 && (
          <div
            style={{
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 28,
              fontSize: 13,
              color: '#3730A3',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              Welcome back — you left off at{' '}
              <strong>
                Step {resumeStep.n}: {resumeStep.label}
              </strong>
              .
            </span>
            <button
              onClick={() => setShowResumeBanner(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6366F1',
                fontSize: 18,
                lineHeight: 1,
                padding: '0 4px',
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Step content */}
        {currentStep === 1 && <Step1Org onNext={() => handleNext(2)} />}
        {currentStep === 2 && (
          <Step2Teams onBack={() => goToStep(1)} onNext={() => handleNext(3)} />
        )}
        {currentStep === 3 && (
          <Step3Invite onBack={() => goToStep(2)} onNext={() => handleNext(4)} />
        )}
        {currentStep === 4 && (
          <Step4Sla onBack={() => goToStep(3)} onNext={() => handleNext(5)} />
        )}
        {currentStep === 5 && (
          <Step5Kpi onBack={() => goToStep(4)} onNext={() => { goToStep(6); handleFinish(); }} />
        )}
        {currentStep === 6 && <StepDone />}
      </main>

      {/* ── Reset modal ────────────────────────────────────────────────────── */}
      {showResetModal && (
        <div
          onClick={() => setShowResetModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '32px',
              width: 400,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#0F172A' }}>
              Start from scratch?
            </h3>
            <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 24px' }}>
              This clears all your setup progress and returns you to Step 1.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowResetModal(false)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 6,
                  border: '1px solid #E2E8F0',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Keep going
              </button>
              <button
                onClick={doReset}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 6,
                  border: 'none',
                  background: '#EF4444',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Yes, start fresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
