import { apiFetch } from './lotris-api';

export interface EngineerLoad {
  engineerId: string;
  fullName: string;
  openTickets: number;
  maxCapacity: number;
  loadPct: number;
  isUnavailable: boolean;
}

export interface WorkloadSuggestion {
  ticketId: string;
  ticketTitle: string;
  fromEngineerId: string;
  fromEngineerName: string;
  toEngineerId: string;
  toEngineerName: string;
}

export interface TeamWorkloadResult {
  teamId: string;
  engineers: EngineerLoad[];
  suggestions: WorkloadSuggestion[];
}

export function fetchTeamWorkload(token: string, teamId: string) {
  return apiFetch<TeamWorkloadResult>(
    `/api/v1/analytics/team-workload?teamId=${encodeURIComponent(teamId)}`,
    { token },
  );
}
