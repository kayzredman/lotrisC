export interface AuthSession {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  fullName: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  session: AuthSession;
}

export interface CurrentUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  roleId: number;
  roleName: string;
  teamId: string | null;
}

export interface PagedTickets {
  total: number | string;
  page: number | string;
  limit: number | string;
  rows: Array<{ id: string; reference?: string; status?: string }>;
}
