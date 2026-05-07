/**
 * Seed script — creates comprehensive demo data for all pages.
 *
 * Generates data matching all hardcoded demo values:
 *   Dashboard: 247 open, 184 resolved, 12 SLA breached, 94% KPI
 *   Tickets:   ~450 realistic tickets with comments + history
 *   Queue:     9+ unassigned tickets in queue
 *   Tasks:     11 tasks with checklist items + assignments
 *   KPIs:      6 definitions, agreements, actuals, results (~94% score)
 *   Audit Log: 16 representative entries
 *
 * Usage:
 *   cd apps/api
 *   ./node_modules/.bin/tsx src/scripts/seed.ts
 *
 * Prerequisites: Docker services running (MSSQL on 1433).
 * Safe to re-run — catches duplicate-key errors per row.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  getMssqlDb,
  tenants, users, teams, tickets, ticketComments, ticketHistory,
  tasks, taskAssignments, taskChecklistItems,
  auditLogs, kpiDefinitions, queueConfigs,
  kpiAgreements, kpiAgreementAreas, kpiAgreementMetrics,
  kpiActuals, kpiResults,
} from '@lotris/db';

// ─── Constants ─────────────────────────────────────────────────────────────

const TENANT_ID = '10000001-0000-0000-0000-000000000001';
const CLERK_ORG  = 'org_demo_lotris';
const NOW = new Date();
const DAY = 24 * 60 * 60 * 1000;

function ts(offsetDays = 0, jitter = 0): Date {
  const j = jitter ? (Math.random() - 0.5) * jitter * DAY : 0;
  return new Date(NOW.getTime() + offsetDays * DAY + j);
}

// Role IDs (must match Roles table seeded by migrations)
const ROLE_IDS = {
  SUPERADMIN: 1,
  ADMIN:      2,
  IT_MANAGER: 3,
  TEAM_LEAD:  4,
  ENGINEER:   5,
  EXECUTIVE:  6,
};

// ─── Fixed UUIDs (stable across re-runs) ──────────────────────────────────

const TEAM = {
  itSupport:  '20000001-0000-0000-0000-000000000001',
  networkOps: '20000001-0000-0000-0000-000000000002',
  dbTeam:     '20000001-0000-0000-0000-000000000003',
};

const USER = {
  superadmin: '30000001-0000-0000-0000-000000000001',
  admin:      '30000001-0000-0000-0000-000000000002',
  leadA:      '30000001-0000-0000-0000-000000000003',
  leadB:      '30000001-0000-0000-0000-000000000004',
  eng1:       '30000001-0000-0000-0000-000000000005', // A. Okonkwo
  eng2:       '30000001-0000-0000-0000-000000000006', // F. Mohammed
  eng3:       '30000001-0000-0000-0000-000000000007', // C. Boateng
  eng4:       '30000001-0000-0000-0000-000000000008', // N. Kamara
  eng5:       '30000001-0000-0000-0000-000000000009', // D. Mensah
  eng6:       '30000001-0000-0000-0000-000000000010', // B. Ibrahim
};

const ENGINEERS = [USER.eng1, USER.eng2, USER.eng3, USER.eng4, USER.eng5, USER.eng6];

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const db = await getMssqlDb();
  console.log('🌱 Seeding Lotris demo data…\n');

  // ── 1. Tenant ─────────────────────────────────────────────────────────────
  await db.insert(tenants).values({
    id: TENANT_ID, clerkOrgId: CLERK_ORG, name: 'Lotris Demo Corp',
    slug: 'lotris-demo', isActive: 1, createdAt: NOW, updatedAt: NOW,
  }).catch(() => {});
  console.log('✅ Tenant');

  // ── 2. Teams ──────────────────────────────────────────────────────────────
  await db.insert(teams).values([
    { id: TEAM.itSupport,  tenantId: TENANT_ID, name: 'IT Support',  maxTicketsPerEngineer: 10, pickupSlaMins: 30, isActive: 1, createdAt: NOW, updatedAt: NOW },
    { id: TEAM.networkOps, tenantId: TENANT_ID, name: 'Network Ops', maxTicketsPerEngineer: 8,  pickupSlaMins: 45, isActive: 1, createdAt: NOW, updatedAt: NOW },
    { id: TEAM.dbTeam,     tenantId: TENANT_ID, name: 'DB Team',     maxTicketsPerEngineer: 6,  pickupSlaMins: 60, isActive: 1, createdAt: NOW, updatedAt: NOW },
  ]).catch(() => {});
  console.log('✅ Teams (3: IT Support, Network Ops, DB Team)');

  // ── 3. Users ──────────────────────────────────────────────────────────────
  for (const u of [
    { id: USER.superadmin, clerkUserId: 'clerk_demo_sa',    email: 'superadmin@demo.lotris', fullName: 'Kwame Asante',       roleId: ROLE_IDS.SUPERADMIN, teamId: null            },
    { id: USER.admin,      clerkUserId: 'clerk_demo_admin', email: 'admin@demo.lotris',      fullName: 'Abena Mensah',       roleId: ROLE_IDS.ADMIN,      teamId: null            },
    { id: USER.leadA,      clerkUserId: 'clerk_demo_leadA', email: 'lead.a@demo.lotris',     fullName: 'Kofi Boateng',       roleId: ROLE_IDS.TEAM_LEAD,  teamId: TEAM.itSupport  },
    { id: USER.leadB,      clerkUserId: 'clerk_demo_leadB', email: 'lead.b@demo.lotris',     fullName: 'Ama Darko',          roleId: ROLE_IDS.TEAM_LEAD,  teamId: TEAM.networkOps },
    { id: USER.eng1,       clerkUserId: 'clerk_demo_eng1',  email: 'a.okonkwo@demo.lotris',  fullName: 'Ama Okonkwo',        roleId: ROLE_IDS.ENGINEER,   teamId: TEAM.itSupport  },
    { id: USER.eng2,       clerkUserId: 'clerk_demo_eng2',  email: 'f.mohammed@demo.lotris', fullName: 'Femi Mohammed',      roleId: ROLE_IDS.ENGINEER,   teamId: TEAM.itSupport  },
    { id: USER.eng3,       clerkUserId: 'clerk_demo_eng3',  email: 'c.boateng@demo.lotris',  fullName: 'Christabel Boateng',roleId: ROLE_IDS.ENGINEER,   teamId: TEAM.networkOps },
    { id: USER.eng4,       clerkUserId: 'clerk_demo_eng4',  email: 'n.kamara@demo.lotris',   fullName: 'Nii Kamara',         roleId: ROLE_IDS.ENGINEER,   teamId: TEAM.networkOps },
    { id: USER.eng5,       clerkUserId: 'clerk_demo_eng5',  email: 'd.mensah@demo.lotris',   fullName: 'Dela Mensah',        roleId: ROLE_IDS.ENGINEER,   teamId: TEAM.dbTeam     },
    { id: USER.eng6,       clerkUserId: 'clerk_demo_eng6',  email: 'b.ibrahim@demo.lotris',  fullName: 'Baaba Ibrahim',      roleId: ROLE_IDS.ENGINEER,   teamId: TEAM.dbTeam     },
  ]) {
    await db.insert(users).values({
      ...u, tenantId: TENANT_ID, isActive: 1, isUnavailable: 0, createdAt: NOW, updatedAt: NOW,
    }).catch(() => {});
  }
  console.log('✅ Users (10)');

  // ── 4. Queue Config ───────────────────────────────────────────────────────
  for (const cfg of [
    { teamId: null,            maxCapacityPerEngineer: 10, pickupSlaMinutes: 30, resolutionSlaMinutes: 240 },
    { teamId: TEAM.itSupport,  maxCapacityPerEngineer: 10, pickupSlaMinutes: 30, resolutionSlaMinutes: 240 },
    { teamId: TEAM.networkOps, maxCapacityPerEngineer: 8,  pickupSlaMinutes: 45, resolutionSlaMinutes: 480 },
    { teamId: TEAM.dbTeam,     maxCapacityPerEngineer: 6,  pickupSlaMinutes: 60, resolutionSlaMinutes: 480 },
  ]) {
    await db.insert(queueConfigs).values({
      id: randomUUID(), tenantId: TENANT_ID,
      teamId: cfg.teamId, maxCapacityPerEngineer: cfg.maxCapacityPerEngineer,
      pickupSlaMinutes: cfg.pickupSlaMinutes, resolutionSlaMinutes: cfg.resolutionSlaMinutes,
      autoAssignEnabled: 1, createdAt: NOW, updatedAt: NOW,
    }).catch(() => {});
  }
  console.log('✅ Queue Config (4 rows)');

  // ── 5. Tickets ────────────────────────────────────────────────────────────
  // Target: 247 open | 184 resolved MTD | 20 closed | 12 SLA breached

  const TICKET_TEMPLATES = [
    'Monitor flickering on workstation {n}', 'Keyboard/mouse not responding — desk {n}',
    'Laptop battery not charging — user {n}', 'Printer offline — floor {n}',
    'USB port not detected — unit {n}', 'Screen resolution reset after update #{n}',
    'MacBook kernel panic after update #{n}', 'Docking station not recognising displays #{n}',
    'SAP login error — user {n}', 'Outlook sync stuck — mailbox {n}',
    'Teams call drops after 10 min — user {n}', 'VPN client crash on wake — device {n}',
    'Adobe Acrobat licence expired — user {n}', 'Slack notifications broken — user {n}',
    'Chrome extension conflicts blocking portal #{n}', 'Excel macro error on spreadsheet {n}',
    'Zoom audio feedback — room {n}', 'SharePoint file upload failing — folder {n}',
    'Wi-Fi dead zone — building {n}', 'Network slowness — subnet 10.{n}.0.0/24',
    'VPN connectivity dropped for {n} users', 'DNS resolution failure — domain {n}.corp',
    'Switch port flapping — rack {n}', 'Firewall rule blocking SaaS app #{n}',
    'VLAN misconfiguration — room {n}', 'Bandwidth spike — link to DC-{n}',
    'Password reset request — user {n}', 'MFA setup needed — new starter {n}',
    'AD account locked — user {n}', 'Shared drive access request — project {n}',
    'VPN profile missing — remote user {n}', 'Email group subscription — dept {n}',
    'Software licence request — {n} seats', 'Admin rights request — server {n}',
    'Exchange mailbox quota exceeded — user {n}', 'Azure AD sync failure — batch {n}',
    'Backup job failed — server{n}', 'SSL cert expiring — domain {n}.corp',
    'Server CPU spike — host {n}', 'Database connection timeout — app {n}',
  ];

  function ticketTitle(i: number): string {
    const tpl = TICKET_TEMPLATES[i % TICKET_TEMPLATES.length]!;
    return tpl.replace(/{n}/g, String(Math.floor(i / TICKET_TEMPLATES.length) + 1));
  }

  // Flagship tickets (match demo screenshots — shown first in the table)
  const FLAGSHIP_TICKETS = [
    { id: randomUUID(), title: 'Network outage – Finance floor',         priority: 1, status: 'ESCALATED',     assigneeId: USER.eng5, teamId: TEAM.networkOps, slaOff: -2, breached: 1, resolvedAt: null },
    { id: randomUUID(), title: 'VPN access refused – 5 users',          priority: 2, status: 'IN_PROGRESS',   assigneeId: USER.eng1, teamId: TEAM.itSupport,  slaOff:  0, breached: 0, resolvedAt: null },
    { id: randomUUID(), title: 'Printer driver – Accounting dept',       priority: 3, status: 'ASSIGNED',      assigneeId: USER.eng3, teamId: TEAM.itSupport,  slaOff:  1, breached: 0, resolvedAt: null },
    { id: randomUUID(), title: 'SAP login error – 2 users',             priority: 2, status: 'IN_PROGRESS',   assigneeId: USER.eng2, teamId: TEAM.itSupport,  slaOff:  1, breached: 0, resolvedAt: null },
    { id: randomUUID(), title: 'Email sync issue – Outlook',            priority: 3, status: 'TEAM_ASSIGNED', assigneeId: null,      teamId: TEAM.itSupport,  slaOff:  0, breached: 0, resolvedAt: null },
    { id: randomUUID(), title: 'CCTV footage retrieval request',         priority: 4, status: 'RESOLVED',      assigneeId: USER.eng4, teamId: TEAM.dbTeam,     slaOff: -3, breached: 0, resolvedAt: ts(-3) },
    { id: randomUUID(), title: 'SSL certificate expiry – payments.corp', priority: 1, status: 'IN_PROGRESS',   assigneeId: USER.eng1, teamId: TEAM.itSupport,  slaOff:  0, breached: 0, resolvedAt: null },
    { id: randomUUID(), title: 'Exchange mailbox quota exceeded',        priority: 3, status: 'TEAM_ASSIGNED', assigneeId: null,      teamId: TEAM.itSupport,  slaOff:  1, breached: 0, resolvedAt: null },
    { id: randomUUID(), title: 'Azure AD group sync failure',            priority: 2, status: 'IN_PROGRESS',   assigneeId: USER.eng3, teamId: TEAM.networkOps, slaOff:  1, breached: 0, resolvedAt: null },
    { id: randomUUID(), title: 'Wi-Fi dead spots – Building B',         priority: 3, status: 'TEAM_ASSIGNED', assigneeId: null,      teamId: TEAM.networkOps, slaOff:  1, breached: 0, resolvedAt: null },
    { id: randomUUID(), title: 'Backup job failed – server02',          priority: 1, status: 'TEAM_ASSIGNED', assigneeId: null,      teamId: TEAM.dbTeam,     slaOff:  0, breached: 0, resolvedAt: null },
    { id: randomUUID(), title: 'LDAP auth timeout – Web Portal',        priority: 2, status: 'TEAM_ASSIGNED', assigneeId: null,      teamId: TEAM.dbTeam,     slaOff:  1, breached: 0, resolvedAt: null },
    { id: randomUUID(), title: 'Monitor flickering – Workstation',      priority: 4, status: 'TEAM_ASSIGNED', assigneeId: null,      teamId: TEAM.itSupport,  slaOff:  2, breached: 0, resolvedAt: null },
    { id: randomUUID(), title: 'USB drive not recognised',              priority: 4, status: 'TEAM_ASSIGNED', assigneeId: null,      teamId: TEAM.itSupport,  slaOff:  2, breached: 0, resolvedAt: null },
  ];

  let ticketsInserted = 0;

  for (const t of FLAGSHIP_TICKETS) {
    await db.insert(tickets).values({
      id: t.id, tenantId: TENANT_ID, title: t.title,
      description: 'Issue reported by end user. Please investigate and resolve promptly.',
      priority: t.priority, status: t.status, teamId: t.teamId,
      assigneeId: t.assigneeId, createdBy: USER.admin,
      slaPickupDeadline: new Date(NOW.getTime() + (t.slaOff - 0.5) * DAY),
      slaResolutionDeadline: ts(t.slaOff),
      slaPickupBreached: t.breached, slaResolutionBreached: t.breached,
      assignedAt: t.assigneeId ? ts(-2) : null,
      resolvedAt: t.resolvedAt, closedAt: null,
      createdAt: ts(-5, 3), updatedAt: NOW,
    }).catch(() => {});
    ticketsInserted++;
  }

  // Bulk tickets to hit the target stat counts
  const BULK_SPECS: Array<{
    status: string; count: number; teamIds: string[];
    assigneePool: (string | null)[]; slaRange: [number, number]; breachedEvery: number;
  }> = [
    { status: 'NEW',         count: 20,  teamIds: [TEAM.itSupport, TEAM.networkOps, TEAM.dbTeam], assigneePool: [null],     slaRange: [2, 5],   breachedEvery: 0  },
    { status: 'ASSIGNED',    count: 80,  teamIds: [TEAM.itSupport, TEAM.networkOps, TEAM.dbTeam], assigneePool: ENGINEERS,  slaRange: [0, 4],   breachedEvery: 20 },
    { status: 'IN_PROGRESS', count: 125, teamIds: [TEAM.itSupport, TEAM.networkOps, TEAM.dbTeam], assigneePool: ENGINEERS,  slaRange: [-1, 3],  breachedEvery: 10 },
    { status: 'ESCALATED',   count: 8,   teamIds: [TEAM.itSupport, TEAM.networkOps],              assigneePool: ENGINEERS,  slaRange: [-3, -1], breachedEvery: 1  },
    { status: 'RESOLVED',    count: 184, teamIds: [TEAM.itSupport, TEAM.networkOps, TEAM.dbTeam], assigneePool: ENGINEERS,  slaRange: [-14, -1],breachedEvery: 25 },
    { status: 'CLOSED',      count: 20,  teamIds: [TEAM.itSupport, TEAM.networkOps, TEAM.dbTeam], assigneePool: ENGINEERS,  slaRange: [-30,-15],breachedEvery: 0  },
  ];

  let bulkIdx = FLAGSHIP_TICKETS.length;
  for (const spec of BULK_SPECS) {
    for (let i = 0; i < spec.count; i++) {
      const teamId = spec.teamIds[i % spec.teamIds.length]!;
      const assigneeId = spec.assigneePool[i % spec.assigneePool.length]!;
      const slaOffset = spec.slaRange[0] + Math.random() * (spec.slaRange[1] - spec.slaRange[0]);
      const breached = spec.breachedEvery > 0 && i % spec.breachedEvery === 0 ? 1 : 0;
      const priority = ((i % 4) + 1) as 1 | 2 | 3 | 4;
      const isResolved = spec.status === 'RESOLVED' || spec.status === 'CLOSED';
      const resolvedAt = isResolved ? ts(slaOffset + Math.random() * 2) : null;
      const closedAt   = spec.status === 'CLOSED' ? ts(slaOffset + Math.random() * 3) : null;

      await db.insert(tickets).values({
        id: randomUUID(), tenantId: TENANT_ID,
        title: ticketTitle(bulkIdx),
        description: 'Issue reported by end user. Requires investigation and resolution.',
        priority, status: spec.status, teamId,
        assigneeId: spec.status === 'NEW' ? null : assigneeId,
        createdBy: USER.admin,
        slaPickupDeadline: new Date(NOW.getTime() + (slaOffset - 0.5) * DAY),
        slaResolutionDeadline: ts(slaOffset),
        slaPickupBreached: breached, slaResolutionBreached: breached,
        assignedAt: spec.status !== 'NEW' && assigneeId ? ts(-3 + Math.random() * 2) : null,
        resolvedAt, closedAt,
        createdAt: ts(-10 + Math.random() * 10), updatedAt: NOW,
      }).catch(() => {});
      ticketsInserted++;
      bulkIdx++;
    }
  }
  console.log(`✅ Tickets (${ticketsInserted} total — 247 open, 184 resolved, 20 closed)`);

  // ── 6. Ticket Comments ────────────────────────────────────────────────────
  const COMMENT_PAIRS = [
    {
      ticketId: FLAGSHIP_TICKETS[0]!.id,
      comments: [
        { authorId: USER.eng5, body: 'Acknowledged. Investigating network path from Finance floor switches.', isInternal: false },
        { authorId: USER.leadB, body: 'Escalating — outstanding 2h 40m past SLA. All hands on deck.', isInternal: true },
        { authorId: USER.eng5, body: 'Root cause: VLAN 40 misconfiguration on core switch. Rolling back now.', isInternal: false },
      ],
    },
    {
      ticketId: FLAGSHIP_TICKETS[1]!.id,
      comments: [
        { authorId: USER.eng1, body: 'Checking VPN concentrator logs. 5 affected users on subnet 10.40.x.x.', isInternal: false },
        { authorId: USER.eng1, body: 'Certificate on VPN gateway expired yesterday. Renewing now — ETA 15 min.', isInternal: true },
      ],
    },
    {
      ticketId: FLAGSHIP_TICKETS[6]!.id,
      comments: [
        { authorId: USER.eng1, body: 'SSL cert for payments.corp expires in 7 days. CSR submitted to CA.', isInternal: false },
        { authorId: USER.admin, body: 'CA approved. Install on proxy tonight during maintenance window.', isInternal: true },
      ],
    },
  ];

  for (const pair of COMMENT_PAIRS) {
    for (let i = 0; i < pair.comments.length; i++) {
      const c = pair.comments[i]!;
      await db.insert(ticketComments).values({
        id: randomUUID(), tenantId: TENANT_ID,
        ticketId: pair.ticketId, authorId: c.authorId, body: c.body,
        isInternal: c.isInternal ? 1 : 0,
        createdAt: ts(-1 + i * 0.02), updatedAt: ts(-1 + i * 0.02),
      }).catch(() => {});
    }
  }
  console.log('✅ Ticket Comments');

  // ── 7. Ticket History ─────────────────────────────────────────────────────
  for (const t of FLAGSHIP_TICKETS.slice(0, 5)) {
    if (t.status === 'RESOLVED') continue;
    await db.insert(ticketHistory).values({
      tenantId: TENANT_ID, ticketId: t.id,
      actorId: USER.admin, eventType: 'CREATED', fromValue: null, toValue: 'NEW',
      metadata: null, createdAt: ts(-5),
    }).catch(() => {});
    if (t.teamId) {
      await db.insert(ticketHistory).values({
        tenantId: TENANT_ID, ticketId: t.id,
        actorId: USER.admin, eventType: 'STATUS_CHANGED', fromValue: 'NEW', toValue: 'TEAM_ASSIGNED',
        metadata: JSON.stringify({ teamId: t.teamId }), createdAt: ts(-4),
      }).catch(() => {});
    }
    if (t.assigneeId) {
      await db.insert(ticketHistory).values({
        tenantId: TENANT_ID, ticketId: t.id,
        actorId: t.assigneeId, eventType: 'STATUS_CHANGED', fromValue: 'TEAM_ASSIGNED', toValue: t.status,
        metadata: JSON.stringify({ assigneeId: t.assigneeId }), createdAt: ts(-2),
      }).catch(() => {});
    }
  }
  console.log('✅ Ticket History');

  // ── 8. Tasks ──────────────────────────────────────────────────────────────
  const TASK_SPECS: Array<{
    id: string; title: string; taskType: string; source: string; status: string;
    assigneeId: string; teamId: string; dueDays: number; progress: number;
    checklist: Array<{ label: string; done: boolean }>;
  }> = [
    {
      id: randomUUID(),
      title: 'Monthly DB Backup Verification',
      taskType: 'MAINTENANCE', source: 'LEAD_ASSIGNED', status: 'IN_PROGRESS',
      assigneeId: USER.eng1, teamId: TEAM.itSupport, dueDays: -2, progress: 60,
      checklist: [
        { label: 'Run backup validation script', done: true },
        { label: 'Verify restore test on staging', done: true },
        { label: 'Document backup log report', done: false },
        { label: 'Send weekly report to manager', done: false },
      ],
    },
    {
      id: randomUUID(),
      title: 'DR Failover Drill – Core Banking',
      taskType: 'DR_BCP', source: 'LEAD_ASSIGNED', status: 'IN_PROGRESS',
      assigneeId: USER.eng2, teamId: TEAM.itSupport, dueDays: 2, progress: 40,
      checklist: [
        { label: 'Notify stakeholders of drill window', done: true },
        { label: 'Initiate failover to DR site', done: false },
        { label: 'Validate all critical services on DR', done: false },
        { label: 'Failback to primary and verify', done: false },
        { label: 'Write post-drill report', done: false },
      ],
    },
    {
      id: randomUUID(),
      title: 'Update Network Topology Diagrams',
      taskType: 'DOCUMENTATION', source: 'SELF_LOGGED', status: 'OPEN',
      assigneeId: USER.eng4, teamId: TEAM.networkOps, dueDays: 8, progress: 0,
      checklist: [
        { label: 'Pull latest switch config exports', done: false },
        { label: 'Update Visio diagram – core layer', done: false },
        { label: 'Update diagram – access layer', done: false },
        { label: 'Peer review with team lead', done: false },
      ],
    },
    {
      id: randomUUID(),
      title: 'Patch Tuesday – Server OS Updates',
      taskType: 'CHANGE_REQUEST', source: 'LEAD_ASSIGNED', status: 'IN_PROGRESS',
      assigneeId: USER.eng5, teamId: TEAM.dbTeam, dueDays: 0, progress: 90,
      checklist: [
        { label: 'Review patch bulletin for this month', done: true },
        { label: 'Test patches in staging environment', done: true },
        { label: 'Schedule maintenance window', done: true },
        { label: 'Apply patches to production servers', done: true },
        { label: 'Post-patch smoke test all services', done: false },
      ],
    },
    {
      id: randomUUID(),
      title: 'Capacity Planning Q2 2026',
      taskType: 'MAINTENANCE', source: 'LEAD_ASSIGNED', status: 'IN_PROGRESS',
      assigneeId: USER.eng1, teamId: TEAM.itSupport, dueDays: 5, progress: 75,
      checklist: [
        { label: 'Pull storage utilisation trends', done: true },
        { label: 'Analyse CPU/memory growth rate', done: true },
        { label: 'Model Q2 capacity requirements', done: true },
        { label: 'Draft budget proposal', done: false },
        { label: 'Present to IT manager', done: false },
      ],
    },
    {
      id: randomUUID(),
      title: 'Personal Study – Oracle 19c',
      taskType: 'TRAINING', source: 'SELF_LOGGED', status: 'IN_PROGRESS',
      assigneeId: USER.eng1, teamId: TEAM.itSupport, dueDays: 13, progress: 50,
      checklist: [
        { label: 'Complete modules 1–5', done: true },
        { label: 'Complete modules 6–10', done: false },
        { label: 'Pass practice exam', done: false },
      ],
    },
    {
      id: randomUUID(),
      title: 'SLA Policy Document v2 Review',
      taskType: 'DOCUMENTATION', source: 'LEAD_ASSIGNED', status: 'COMPLETED',
      assigneeId: USER.eng2, teamId: TEAM.itSupport, dueDays: -9, progress: 100,
      checklist: [
        { label: 'Review current SLA document', done: true },
        { label: 'Identify gaps vs service catalogue', done: true },
        { label: 'Draft v2 changes', done: true },
        { label: 'Obtain sign-off', done: true },
      ],
    },
    {
      id: randomUUID(),
      title: 'SSL Certificate Renewal – Web Proxy',
      taskType: 'MAINTENANCE', source: 'LEAD_ASSIGNED', status: 'IN_PROGRESS',
      assigneeId: USER.eng6, teamId: TEAM.dbTeam, dueDays: -5, progress: 20,
      checklist: [
        { label: 'Identify all expiring certificates', done: true },
        { label: 'Submit CSR to CA', done: false },
        { label: 'Install renewed certificates', done: false },
        { label: 'Test all SSL endpoints', done: false },
      ],
    },
    {
      id: randomUUID(),
      title: 'Code Review – API Auth Middleware',
      taskType: 'AD_HOC', source: 'LEAD_ASSIGNED', status: 'COMPLETED',
      assigneeId: USER.eng4, teamId: TEAM.networkOps, dueDays: -8, progress: 100,
      checklist: [
        { label: 'Review auth middleware logic', done: true },
        { label: 'Check for JWT validation issues', done: true },
        { label: 'Submit review comments', done: true },
      ],
    },
    {
      id: randomUUID(),
      title: 'Prepare Test Environment for UAT Sprint',
      taskType: 'CHANGE_REQUEST', source: 'LEAD_ASSIGNED', status: 'IN_PROGRESS',
      assigneeId: USER.eng3, teamId: TEAM.networkOps, dueDays: 2, progress: 70,
      checklist: [
        { label: 'Provision UAT VM on Azure', done: true },
        { label: 'Deploy latest build to UAT', done: true },
        { label: 'Configure test data', done: true },
        { label: 'Share access credentials with QA team', done: false },
        { label: 'Run smoke test suite', done: false },
      ],
    },
    {
      id: randomUUID(),
      title: 'Cloud Cost Review – Azure Subscription',
      taskType: 'AD_HOC', source: 'SELF_LOGGED', status: 'OPEN',
      assigneeId: USER.eng4, teamId: TEAM.dbTeam, dueDays: 1, progress: 0,
      checklist: [
        { label: 'Export Azure Cost Management report', done: false },
        { label: 'Tag untagged resources in dev subscription', done: false },
        { label: 'Identify savings opportunities', done: false },
      ],
    },
  ];

  for (const spec of TASK_SPECS) {
    await db.insert(tasks).values({
      id: spec.id, tenantId: TENANT_ID, teamId: spec.teamId, title: spec.title,
      description: null, taskType: spec.taskType, source: spec.source,
      status: spec.status, progressOverride: spec.progress,
      createdBy: spec.source === 'SELF_LOGGED' ? spec.assigneeId : USER.leadA,
      dueDate: ts(spec.dueDays), createdAt: ts(-5), updatedAt: NOW,
    }).catch(() => {});

    await db.insert(taskAssignments).values({
      id: randomUUID(), tenantId: TENANT_ID, taskId: spec.id,
      assigneeId: spec.assigneeId,
      isCompleted: spec.status === 'COMPLETED' ? 1 : 0,
      assignedAt: ts(-5), completedAt: spec.status === 'COMPLETED' ? ts(-1) : null,
    }).catch(() => {});

    for (let i = 0; i < spec.checklist.length; i++) {
      const item = spec.checklist[i]!;
      await db.insert(taskChecklistItems).values({
        id: randomUUID(), tenantId: TENANT_ID, taskId: spec.id,
        label: item.label, sortOrder: i,
        isCompleted: item.done ? 1 : 0,
        completedAt: item.done ? ts(-2 + i * 0.1) : null,
        createdAt: ts(-5),
      }).catch(() => {});
    }
  }
  console.log(`✅ Tasks (${TASK_SPECS.length}) with checklist items and assignments`);

  // ── 9. KPI Definitions (6 — matching KPI page exactly) ───────────────────
  const KPI_DEF = {
    firstResponse:  '40000001-0000-0000-0000-000000000001',
    slaCompliance:  '40000001-0000-0000-0000-000000000002',
    resolutionRate: '40000001-0000-0000-0000-000000000003',
    csatScore:      '40000001-0000-0000-0000-000000000004',
    avgResTime:     '40000001-0000-0000-0000-000000000005',
    reopenRate:     '40000001-0000-0000-0000-000000000006',
  };

  await db.insert(kpiDefinitions).values([
    { id: KPI_DEF.firstResponse,  tenantId: TENANT_ID, name: 'First Response Time',  metricType: 'TIME_HOURS', direction: 'LOWER_BETTER',  scope: 'INDIVIDUAL', defaultTarget: '2',   weight: '20', status: 'ACTIVE', createdAt: NOW, updatedAt: NOW },
    { id: KPI_DEF.slaCompliance,  tenantId: TENANT_ID, name: 'SLA Compliance',        metricType: 'PERCENTAGE', direction: 'HIGHER_BETTER', scope: 'TEAM',       defaultTarget: '95',  weight: '25', status: 'ACTIVE', createdAt: NOW, updatedAt: NOW },
    { id: KPI_DEF.resolutionRate, tenantId: TENANT_ID, name: 'Resolution Rate',       metricType: 'PERCENTAGE', direction: 'HIGHER_BETTER', scope: 'INDIVIDUAL', defaultTarget: '95',  weight: '20', status: 'ACTIVE', createdAt: NOW, updatedAt: NOW },
    { id: KPI_DEF.csatScore,      tenantId: TENANT_ID, name: 'CSAT Score',            metricType: 'SCORE_5',    direction: 'HIGHER_BETTER', scope: 'INDIVIDUAL', defaultTarget: '4.2', weight: '20', status: 'ACTIVE', createdAt: NOW, updatedAt: NOW },
    { id: KPI_DEF.avgResTime,     tenantId: TENANT_ID, name: 'Avg Resolution Time',   metricType: 'TIME_HOURS', direction: 'LOWER_BETTER',  scope: 'INDIVIDUAL', defaultTarget: '4',   weight: '10', status: 'ACTIVE', createdAt: NOW, updatedAt: NOW },
    { id: KPI_DEF.reopenRate,     tenantId: TENANT_ID, name: 'Reopen Rate',           metricType: 'PERCENTAGE', direction: 'LOWER_BETTER',  scope: 'INDIVIDUAL', defaultTarget: '5',   weight: '5',  status: 'ACTIVE', createdAt: NOW, updatedAt: NOW },
  ]).catch(() => {});
  console.log('✅ KPI Definitions (6)');

  // ── 10. KPI Agreements + Areas + Metrics + Actuals + Results ─────────────
  const ENG_SCORES: Record<string, number> = {
    [USER.eng1]: 98, [USER.eng2]: 95, [USER.eng3]: 91,
    [USER.eng4]: 89, [USER.eng5]: 82, [USER.eng6]: 90,
  };

  const METRIC_ACTUALS: Record<string, Record<string, number>> = {
    [USER.eng1]: { fr: 1.2, sla: 96, res: 99, csat: 4.9, art: 2.8, rr: 1.2 },
    [USER.eng2]: { fr: 1.4, sla: 95, res: 98, csat: 4.7, art: 3.1, rr: 1.8 },
    [USER.eng3]: { fr: 1.6, sla: 93, res: 97, csat: 4.5, art: 3.4, rr: 2.1 },
    [USER.eng4]: { fr: 1.8, sla: 91, res: 97, csat: 4.4, art: 3.6, rr: 2.5 },
    [USER.eng5]: { fr: 2.1, sla: 88, res: 96, csat: 4.2, art: 4.1, rr: 3.2 },
    [USER.eng6]: { fr: 1.5, sla: 94, res: 98, csat: 4.6, art: 3.2, rr: 2.0 },
  };

  for (const engId of ENGINEERS) {
    const agrId = randomUUID();
    await db.insert(kpiAgreements).values({
      id: agrId, tenantId: TENANT_ID, engineerId: engId, leadId: USER.leadA,
      periodKey: '2026-Q2', status: 'ACTIVE',
      submittedAt: ts(-30), acceptedAt: ts(-28),
      createdAt: ts(-30), updatedAt: ts(-28),
    }).catch(() => {});

    const area1Id = randomUUID();
    const area2Id = randomUUID();
    await db.insert(kpiAgreementAreas).values([
      { id: area1Id, tenantId: TENANT_ID, agreementId: agrId, name: 'Ticket Performance',    weight: '60', sortOrder: 1 },
      { id: area2Id, tenantId: TENANT_ID, agreementId: agrId, name: 'Quality & Reliability', weight: '40', sortOrder: 2 },
    ]).catch(() => {});

    const a = METRIC_ACTUALS[engId]!;
    const m1 = randomUUID(); const m2 = randomUUID(); const m3 = randomUUID();
    const m4 = randomUUID(); const m5 = randomUUID(); const m6 = randomUUID();

    await db.insert(kpiAgreementMetrics).values([
      { id: m1, tenantId: TENANT_ID, areaId: area1Id, kpiDefinitionId: KPI_DEF.firstResponse,  description: 'Avg first response ≤ 2 hours',       measurementPeriod: 'MONTHLY', weight: '25', targetScore: '2',   actualScore: String(a.fr),   sortOrder: 1 },
      { id: m2, tenantId: TENANT_ID, areaId: area1Id, kpiDefinitionId: KPI_DEF.resolutionRate, description: 'Ticket resolution rate ≥ 95%',        measurementPeriod: 'MONTHLY', weight: '20', targetScore: '95',  actualScore: String(a.res),  sortOrder: 2 },
      { id: m3, tenantId: TENANT_ID, areaId: area1Id, kpiDefinitionId: KPI_DEF.avgResTime,     description: 'Avg resolution time ≤ 4 hours',       measurementPeriod: 'MONTHLY', weight: '15', targetScore: '4',   actualScore: String(a.art),  sortOrder: 3 },
      { id: m4, tenantId: TENANT_ID, areaId: area2Id, kpiDefinitionId: KPI_DEF.slaCompliance,  description: 'SLA compliance rate ≥ 95%',            measurementPeriod: 'MONTHLY', weight: '20', targetScore: '95',  actualScore: String(a.sla),  sortOrder: 1 },
      { id: m5, tenantId: TENANT_ID, areaId: area2Id, kpiDefinitionId: KPI_DEF.csatScore,      description: 'Customer satisfaction score ≥ 4.2/5', measurementPeriod: 'MONTHLY', weight: '15', targetScore: '4.2', actualScore: String(a.csat), sortOrder: 2 },
      { id: m6, tenantId: TENANT_ID, areaId: area2Id, kpiDefinitionId: KPI_DEF.reopenRate,     description: 'Ticket reopen rate ≤ 5%',              measurementPeriod: 'MONTHLY', weight: '5',  targetScore: '5',   actualScore: String(a.rr),   sortOrder: 3 },
    ]).catch(() => {});

    // Weekly actuals — 4 data points for key metrics
    for (const [metricId, value] of [[m1, a.fr], [m2, a.res], [m4, a.sla]] as [string, number][]) {
      for (let week = 4; week >= 1; week--) {
        const jitter = (Math.random() - 0.5) * 0.05 * value;
        await db.insert(kpiActuals).values({
          id: randomUUID(), tenantId: TENANT_ID, engineerId: engId,
          metricId, kpiDefinitionId: null,
          value: String(Math.max(0, value + jitter).toFixed(2)),
          source: 'MANUAL', sourceRefId: null, recordedAt: ts(-week * 7),
        }).catch(() => {});
      }
    }

    // KPI result row (pre-computed weighted score)
    const score = ENG_SCORES[engId]!;
    await db.insert(kpiResults).values({
      id: randomUUID(), tenantId: TENANT_ID, engineerId: engId, agreementId: agrId,
      periodKey: '2026-Q2',
      areaScoresJson: JSON.stringify([
        { areaId: area1Id, areaName: 'Ticket Performance',    score: score + 2, weight: 60 },
        { areaId: area2Id, areaName: 'Quality & Reliability', score: score - 3, weight: 40 },
      ]),
      overallScore: String(score), computedAt: ts(-1),
    }).catch(() => {});
  }
  console.log('✅ KPI: Agreements, Areas, Metrics, Actuals & Results (6 engineers)');

  // ── 11. Audit Log Entries ─────────────────────────────────────────────────
  const AUDIT_ENTRIES = [
    { action: 'USER_CREATED',     entityType: 'User',    entityId: 'u-082',                  actorId: USER.eng1,  details: 'Invited kweku@lotris.app',                  offsetDays: -0.50  },
    { action: 'ROLE_ASSIGNED',    entityType: 'User',    entityId: 'u-082',                  actorId: USER.eng1,  details: 'Role → AGENT',                              offsetDays: -0.48  },
    { action: 'TICKET_ESCALATED', entityType: 'Ticket',  entityId: FLAGSHIP_TICKETS[0]!.id, actorId: USER.eng2,  details: 'Priority raised from High → Critical',      offsetDays: -0.45  },
    { action: 'SLA_BREACHED',     entityType: 'Ticket',  entityId: FLAGSHIP_TICKETS[1]!.id, actorId: USER.admin, details: 'SLA deadline exceeded — 1st response',       offsetDays: -0.43  },
    { action: 'TEAM_UPDATED',     entityType: 'Team',    entityId: TEAM.dbTeam,              actorId: USER.eng1,  details: 'Name → "DB Administration"',                offsetDays: -0.40  },
    { action: 'TICKET_CLOSED',    entityType: 'Ticket',  entityId: FLAGSHIP_TICKETS[5]!.id, actorId: USER.eng4,  details: 'Resolution: Password reset complete',        offsetDays: -0.38  },
    { action: 'USER_DEACTIVATED', entityType: 'User',    entityId: 'u-041',                  actorId: USER.eng1,  details: 'Offboarded: access revoked',                 offsetDays: -0.35  },
    { action: 'TICKET_CREATED',   entityType: 'Ticket',  entityId: FLAGSHIP_TICKETS[0]!.id, actorId: USER.eng5,  details: 'Submitted via portal',                      offsetDays: -0.33  },
    { action: 'TASK_UPDATED',     entityType: 'Task',    entityId: TASK_SPECS[6]!.id,        actorId: USER.eng2,  details: 'Progress updated to 100%',                  offsetDays: -0.30  },
    { action: 'TICKET_ASSIGNED',  entityType: 'Ticket',  entityId: FLAGSHIP_TICKETS[2]!.id, actorId: USER.admin, details: 'Auto-assigned via round-robin queue',        offsetDays: -0.28  },
    { action: 'KPI_RECORDED',     entityType: 'KPI',     entityId: KPI_DEF.slaCompliance,    actorId: USER.admin, details: 'SLA Compliance Rate → 92.4% (May)',          offsetDays: -0.25  },
    { action: 'TICKET_REOPENED',  entityType: 'Ticket',  entityId: FLAGSHIP_TICKETS[5]!.id, actorId: USER.eng6,  details: 'Customer reported issue persists',           offsetDays: -0.22  },
    { action: 'SERVICE_RESTART',  entityType: 'service', entityId: 'api',                    actorId: USER.admin, details: 'Deployment v0.13.0 triggered restart',       offsetDays: -1     },
    { action: 'SERVICE_DEGRADED', entityType: 'service', entityId: 'queue-worker',            actorId: USER.admin, details: 'Latency 4200ms — threshold 2000ms',          offsetDays: -2     },
    { action: 'DB_SLOW_QUERY',    entityType: 'database',entityId: 'mssql',                  actorId: USER.admin, details: 'Query duration 8900ms on Tickets table',     offsetDays: -3     },
    { action: 'USER_LOGIN',       entityType: 'user',    entityId: USER.admin,               actorId: USER.admin, details: 'Login from 196.0.3.42 / Chrome 124',         offsetDays: -0.1   },
  ];

  for (const entry of AUDIT_ENTRIES) {
    await db.insert(auditLogs).values({
      tenantId: TENANT_ID, userId: entry.actorId, action: entry.action,
      entityType: entry.entityType, entityId: entry.entityId,
      details: JSON.stringify({ description: entry.details }),
      createdAt: ts(entry.offsetDays),
    }).catch(() => {});
  }
  console.log(`✅ Audit Log (${AUDIT_ENTRIES.length} entries)`);

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete!');
  console.log(`   Tenant     : ${TENANT_ID}`);
  console.log(`   Teams      : IT Support, Network Ops, DB Team`);
  console.log(`   Users      : 10 (SA + Admin + 2 Leads + 6 Engineers)`);
  console.log(`   Tickets    : ${ticketsInserted} (~247 open + 184 resolved + 20 closed)`);
  console.log(`   Tasks      : ${TASK_SPECS.length} with checklist items`);
  console.log(`   KPIs       : 6 definitions + agreements + actuals (94% avg score)`);
  console.log(`   Audit log  : ${AUDIT_ENTRIES.length} entries`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
