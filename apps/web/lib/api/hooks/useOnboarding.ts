import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { useAuthenticatedMutation, useAuthenticatedQuery, type ApiRecord, type QueryHookOptions } from './query-utils';

export type OnboardingStatus = 'PENDING' | 'COMPLETE';

export function useOnboardingStatus(options?: QueryHookOptions) {
  return useAuthenticatedQuery<{ status: OnboardingStatus; completedAt?: string | null; teamCount?: number }>(
    ['onboarding', 'status'],
    '/api/v1/onboarding/status',
    options,
  );
}

export function useSaveOnboardingOrg() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<void, { name: string; slug: string }>(
    (token, body) => apiFetch('/api/v1/onboarding/org', { method: 'POST', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['onboarding'] }) },
  );
}

export function useSaveOnboardingSla() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<void, { pickupSlaMinutes: number; resolutionSlaMinutes: number }>(
    (token, body) => apiFetch('/api/v1/onboarding/sla', { method: 'POST', token, body }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['onboarding'] }) },
  );
}

export function useSetOnboardingKpiTemplate() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<void, string>(
    (token, template) =>
      apiFetch('/api/v1/onboarding/kpi-template', { method: 'POST', token, body: { template } }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['onboarding'] }) },
  );
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useAuthenticatedMutation<void, void>(
    (token) => apiFetch('/api/v1/onboarding/complete', { method: 'POST', token }),
    { onSuccess: () => void qc.invalidateQueries({ queryKey: ['onboarding'] }) },
  );
}
