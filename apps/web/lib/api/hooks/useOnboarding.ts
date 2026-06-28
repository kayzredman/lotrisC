import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiRecord, QueryHookOptions } from './query-utils';

const ONBOARDING_KEY = 'lotris_onboarding_status';
const ONBOARDING_ORG_KEY = 'lotris_onboarding_org';
const ONBOARDING_SLA_KEY = 'lotris_onboarding_sla';
const ONBOARDING_KPI_KEY = 'lotris_onboarding_kpi';

export type OnboardingStatus = 'PENDING' | 'COMPLETED';

function readStatus(): { status: OnboardingStatus; currentStep?: number } {
  if (typeof window === 'undefined') return { status: 'COMPLETED' };
  const status = (localStorage.getItem(ONBOARDING_KEY) as OnboardingStatus | null) ?? 'COMPLETED';
  const step = localStorage.getItem('lotris_onboarding_step');
  return { status, currentStep: step ? Number(step) : undefined };
}

export function useOnboardingStatus(options?: QueryHookOptions) {
  return useQuery({
    queryKey: ['onboarding', 'status'],
    queryFn: () => readStatus(),
    retry: options?.retry ?? false,
    staleTime: options?.staleTime ?? 60_000,
  });
}

export function useSaveOnboardingOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ApiRecord) => {
      localStorage.setItem(ONBOARDING_ORG_KEY, JSON.stringify(payload));
      localStorage.setItem(ONBOARDING_KEY, 'PENDING');
      return payload;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['onboarding'] }),
  });
}

export function useSaveOnboardingSla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ApiRecord) => {
      localStorage.setItem(ONBOARDING_SLA_KEY, JSON.stringify(payload));
      return payload;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['onboarding'] }),
  });
}

export function useSetOnboardingKpiTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: string) => {
      localStorage.setItem(ONBOARDING_KPI_KEY, template);
      return { template };
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['onboarding'] }),
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      localStorage.setItem(ONBOARDING_KEY, 'COMPLETED');
      localStorage.removeItem('lotris_onboarding_step');
      return { status: 'COMPLETED' as const };
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['onboarding'] }),
  });
}
