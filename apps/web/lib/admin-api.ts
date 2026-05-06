import type { UserRole } from '@lotris/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  clerkUserId: string;
  email: string;
  fullName: string;
  role: UserRole;
  teamId: string | null;
  teamName: string | null;
  isActive: boolean;
}

export interface AdminTeam {
  id: string;
  name: string;
  maxTicketsPerEngineer: number;
  pickupSlaMinutes: number;
  memberCount: number;
  isActive: boolean;
}

export interface CreateUserPayload {
  clerkUserId: string;
  email: string;
  fullName: string;
  roleId: number;
  teamId?: string;
}

export interface CreateTeamPayload {
  name: string;
  maxTicketsPerEngineer?: number;
  pickupSlaMinutes?: number;
}

export interface UpdateTeamPayload {
  name?: string;
  maxTicketsPerEngineer?: number;
  pickupSlaMinutes?: number;
  isActive?: boolean;
}

// ── Users ──────────────────────────────────────────────────────────────────

export const listUsers = (token: string) =>
  apiFetch<AdminUser[]>('/api/v1/admin/users', token);

export const createUser = (token: string, payload: CreateUserPayload) =>
  apiFetch<AdminUser>('/api/v1/admin/users', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const assignRole = (token: string, userId: string, roleId: number) =>
  apiFetch<AdminUser>(`/api/v1/admin/users/${userId}/role`, token, {
    method: 'PATCH',
    body: JSON.stringify({ roleId }),
  });

export const deactivateUser = (token: string, userId: string, isActive: boolean) =>
  apiFetch<AdminUser>(`/api/v1/admin/users/${userId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });

// ── Teams ──────────────────────────────────────────────────────────────────

export const listTeams = (token: string) =>
  apiFetch<AdminTeam[]>('/api/v1/admin/teams', token);

export const createTeam = (token: string, payload: CreateTeamPayload) =>
  apiFetch<AdminTeam>('/api/v1/admin/teams', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateTeam = (token: string, teamId: string, payload: UpdateTeamPayload) =>
  apiFetch<AdminTeam>(`/api/v1/admin/teams/${teamId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
