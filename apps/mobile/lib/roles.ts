const LEAD_ROLES = new Set(['ADMIN', 'TEAM_LEAD', 'IT_MANAGER', 'SUPER_ADMIN']);

export function isLeadRole(roleName?: unknown): boolean {
  if (typeof roleName !== 'string' || roleName.length === 0) return false;
  return LEAD_ROLES.has(roleName.toUpperCase().replace(/\s+/g, '_'));
}
