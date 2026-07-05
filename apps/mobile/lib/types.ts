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

export interface TicketDto {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number | string;
  tenantId: string;
  teamId: string;
  teamName: string | null;
  assigneeId: string;
  source: string;
  requesterEmail: string | null;
  requesterName: string | null;
  slaPickupDeadline: string | null;
  slaPickupBreached: boolean;
  slaResolutionDeadline: string | null;
  slaResolutionBreached: boolean;
  slaWarningLevel: string | null;
  createdBy: string;
  assignedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PagedTickets {
  total: number | string;
  page: number | string;
  limit: number | string;
  rows: TicketDto[];
}

export interface QueueTicket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number | string;
  teamId: string | null;
  teamName: string | null;
  slaPickupDeadline: string | null;
  slaResolutionDeadline: string | null;
  createdAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  createdAt: string;
  isInternal: boolean;
}
