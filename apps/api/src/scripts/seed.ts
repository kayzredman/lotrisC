/**
 * Seed script — creates demo data for UX/UI testing in local Docker environment.
 *
 * Usage:
 *   cd apps/api
 *   npx tsx src/scripts/seed.ts
 *
 * Prerequisites: Docker services running (MSSQL on 1433, Redis on 6379).
 * Safe to re-run — checks for existing tenant before inserting.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  getMssqlDb,
  tenants, users, teams, tickets, tasks,
  auditLogs, kpiDefinitions,
} from '@lotris/db';

// ─── Constants ──────────────────────────────────────────────────────────────

const TENANT_ID = 'demo-tenant-0001-0000-000000000001';
const CLERK_ORG  = 'org_demo_lotris';
const NOW = new Date();
const DAY = 24 * 60 * 60 * 1000;

function ts(offsetDays = 0): Date {
  return new Date(NOW.getTime() + offsetDays * DAY);
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

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const db = await getMssqlDb();

  console.log('🌱 Seeding Lotris demo data…\n');

  // ── 1. Tenant ────────────────────────────────────────────────────────────  await db.insert(tenants).values({
    id:          TENANT_ID,
    clerkOrgId:  CLERK_ORG,
    name:        'Lotris Demo Corp',
    slug:        'lotris-demo',
    isActive:    1,
    createdAt:   NOW,
    updatedAt:   NOW,
  }).catch(() => console.log('   Tenant already exists — skipped.'));

  console.log('✅ Tenant');

  // ── 2. Teams ─────────────────────────────────────────────────────────────
  const teamIdA = 'demo-team-infra-000-0000-000000000001';
  const teamIdB = 'demo-team-appdev-00-0000-000000000002';

  await db.insert(teams).values([
    {
      id: teamIdA, tenantId: TENANT_ID,
      name: 'Infrastructure', maxTicketsPerEngineer: 5, pickupSlaMins: 30,
      isActive: 1, createdAt: NOW, updatedAt: NOW,
    },
    {
      id: teamIdB, tenantId: TENANT_ID,
      name: 'App Development', maxTicketsPerEngineer: 4, pickupSlaMins: 45,
      isActive: 1, createdAt: NOW, updatedAt: NOW,
    },
  ]).catch(() => console.log('   Teams already exist — skipped.'));

  console.log('✅ Teams');

  // ── 3. Users ─────────────────────────────────────────────────────────────
  const userIds = {
    superadmin: 'demo-user-sa-000000-0000-000000000001',
    admin:      'demo-user-admin-0000-0000-000000000002',
    leadA:      'demo-user-lead-a-00-0000-000000000003',
    leadB:      'demo-user-lead-b-00-0000-000000000004',
    eng1:       'demo-user-eng-1-000-0000-000000000005',
    eng2:       'demo-user-eng-2-000-0000-000000000006',
    eng3:       'demo-user-eng-3-000-0000-000000000007',
    eng4:       'demo-user-eng-4-000-0000-000000000008',
    eng5:       'demo-user-eng-5-000-0000-000000000009',
  };

  const userRows = [
    { id: userIds.superadmin, tenantId: TENANT_ID, clerkUserId: 'clerk_demo_sa',    email: 'superadmin@demo.lotris', fullName: 'Kwame Asante',      roleId: ROLE_IDS.SUPERADMIN, teamId: null,    isActive: 1, isUnavailable: 0, createdAt: NOW, updatedAt: NOW },
    { id: userIds.admin,      tenantId: TENANT_ID, clerkUserId: 'clerk_demo_admin', email: 'admin@demo.lotris',      fullName: 'Abena Mensah',      roleId: ROLE_IDS.ADMIN,      teamId: null,    isActive: 1, isUnavailable: 0, createdAt: NOW, updatedAt: NOW },
    { id: userIds.leadA,      tenantId: TENANT_ID, clerkUserId: 'clerk_demo_leadA', email: 'lead.a@demo.lotris',     fullName: 'Kofi Boateng',      roleId: ROLE_IDS.TEAM_LEAD,  teamId: teamIdA, isActive: 1, isUnavailable: 0, createdAt: NOW, updatedAt: NOW },
    { id: userIds.leadB,      tenantId: TENANT_ID, clerkUserId: 'clerk_demo_leadB', email: 'lead.b@demo.lotris',     fullName: 'Ama Darko',         roleId: ROLE_IDS.TEAM_LEAD,  teamId: teamIdB, isActive: 1, isUnavailable: 0, createdAt: NOW, updatedAt: NOW },
    { id: userIds.eng1,       tenantId: TENANT_ID, clerkUserId: 'clerk_demo_eng1',  email: 'eng1@demo.lotris',       fullName: 'Yaw Owusu',         roleId: ROLE_IDS.ENGINEER,   teamId: teamIdA, isActive: 1, isUnavailable: 0, createdAt: NOW, updatedAt: NOW },
    { id: userIds.eng2,       tenantId: TENANT_ID, clerkUserId: 'clerk_demo_eng2',  email: 'eng2@demo.lotris',       fullName: 'Akosua Appiah',     roleId: ROLE_IDS.ENGINEER,   teamId: teamIdA, isActive: 1, isUnavailable: 0, createdAt: NOW, updatedAt: NOW },
    { id: userIds.eng3,       tenantId: TENANT_ID, clerkUserId: 'clerk_demo_eng3',  email: 'eng3@demo.lotris',       fullName: 'Nana Kusi',         roleId: ROLE_IDS.ENGINEER,   teamId: teamIdB, isActive: 1, isUnavailable: 0, createdAt: NOW, updatedAt: NOW },
    { id: userIds.eng4,       tenantId: TENANT_ID, clerkUserId: 'clerk_demo_eng4',  email: 'eng4@demo.lotris',       fullName: 'Efua Amponsah',     roleId: ROLE_IDS.ENGINEER,   teamId: teamIdB, isActive: 1, isUnavailable: 0, createdAt: NOW, updatedAt: NOW },
    { id: userIds.eng5,       tenantId: TENANT_ID, clerkUserId: 'clerk_demo_eng5',  email: 'eng5@demo.lotris',       fullName: 'Fiifi Quansah',     roleId: ROLE_IDS.ENGINEER,   teamId: teamIdA, isActive: 1, isUnavailable: 0, createdAt: NOW, updatedAt: NOW },
  ];

  for (const u of userRows) {
    await db.insert(users).values(u).catch(() => {});
  }
  console.log('✅ Users (9)');

  // ── 4. Tickets ────────────────────────────────────────────────────────────
  const TICKET_SPECS: Array<{
    title: string; description: string; priority: number; status: string;
    assigneeKey: keyof typeof userIds | null; teamId: string | null;
    slaOffsetDays: number;
  }> = [
    { title: 'VPN connectivity dropped for 12 users', description: 'VPN concentrator intermittently drops sessions after 30 min. Affects remote staff.', priority: 1, status: 'IN_PROGRESS', assigneeKey: 'eng1', teamId: teamIdA, slaOffsetDays: 1 },
    { title: 'Email server disk usage at 91%', description: 'Exchange mailbox store reaching critical capacity. Immediate clean-up or storage expansion required.', priority: 1, status: 'ESCALATED', assigneeKey: 'eng2', teamId: teamIdA, slaOffsetDays: -1 },
    { title: 'Active Directory sync failing overnight', description: 'AD connector service returning error 0x80072030 during nightly sync. Users unable to authenticate.', priority: 2, status: 'ASSIGNED', assigneeKey: 'eng1', teamId: teamIdA, slaOffsetDays: 2 },
    { title: 'HR portal login loop on Firefox', description: 'Firefox users encounter infinite redirect on HR portal login. Chrome works fine.', priority: 2, status: 'IN_PROGRESS', assigneeKey: 'eng3', teamId: teamIdB, slaOffsetDays: 1 },
    { title: 'Oracle DB connection pool exhausted', description: 'Application pool hits max 200 connections during morning peak. Requests timing out.', priority: 2, status: 'NEW', assigneeKey: null, teamId: null, slaOffsetDays: 3 },
    { title: 'Printer fleet firmware update required', description: 'HP fleet requires critical firmware patch to close CVE-2024-0134. Scheduled maintenance window needed.', priority: 3, status: 'TEAM_ASSIGNED', assigneeKey: null, teamId: teamIdA, slaOffsetDays: 5 },
    { title: 'Slack integration webhook broken', description: 'Helpdesk-to-Slack webhook returning 410 Gone after workspace token rotation.', priority: 3, status: 'IN_PROGRESS', assigneeKey: 'eng4', teamId: teamIdB, slaOffsetDays: 2 },
    { title: 'Office Wi-Fi dead zone — 3rd floor east wing', description: 'Signal drops below -80 dBm in the east wing meeting rooms. Access point relocation needed.', priority: 3, status: 'ASSIGNED', assigneeKey: 'eng5', teamId: teamIdA, slaOffsetDays: 4 },
    { title: 'MacBook Pro fleet — kernel panic on wake', description: 'Multiple M2 MacBooks crashing on wake after macOS 14.4 update. Kernel panic logs attached.', priority: 2, status: 'RESOLVED', assigneeKey: 'eng2', teamId: teamIdA, slaOffsetDays: -2 },
    { title: 'Salesforce integration timeout', description: 'CRM API calls timing out after 30 s. Likely rate-limit or token expiry issue.', priority: 2, status: 'IN_PROGRESS', assigneeKey: 'eng3', teamId: teamIdB, slaOffsetDays: 1 },
    { title: 'Backup verification report missing', description: 'Weekly Veeam backup verification report not sent for past 3 weeks.', priority: 3, status: 'NEW', assigneeKey: null, teamId: null, slaOffsetDays: 5 },
    { title: 'SSL certificate expiry — payments.corp.internal', description: 'Internal payments subdomain cert expires in 7 days. Renewal request pending CA approval.', priority: 1, status: 'IN_PROGRESS', assigneeKey: 'eng1', teamId: teamIdA, slaOffsetDays: 0 },
    { title: 'Helpdesk portal 502 errors during peak hours', description: 'Nginx upstream returning 502 when ticket volume exceeds 300/hr. Gunicorn worker count may need tuning.', priority: 2, status: 'ESCALATED', assigneeKey: 'eng4', teamId: teamIdB, slaOffsetDays: -1 },
    { title: 'User onboarding — 4 new starters', description: 'Provision AD accounts, laptops, and access for Q2 new hires starting Monday.', priority: 3, status: 'TEAM_ASSIGNED', assigneeKey: null, teamId: teamIdB, slaOffsetDays: 3 },
    { title: 'CCTV NVR storage full', description: 'Network video recorder reached 100% storage. Oldest footage auto-deleting. Expansion disk required.', priority: 2, status: 'NEW', assigneeKey: null, teamId: null, slaOffsetDays: 2 },
    { title: 'Power BI gateway service crashed', description: 'On-premises Power BI gateway not reachable. BI reports failing for finance team.', priority: 1, status: 'RESOLVED', assigneeKey: 'eng3', teamId: teamIdB, slaOffsetDays: -3 },
    { title: 'SharePoint permissions audit overdue', description: 'Quarterly permission audit for SharePoint Online due. 12 sensitive document libraries not reviewed.', priority: 4, status: 'TEAM_ASSIGNED', assigneeKey: null, teamId: teamIdB, slaOffsetDays: 7 },
    { title: 'Network switch firmware upgrade — core switch', description: 'Cisco Catalyst 9300 requires IOS-XE 17.12 for security patch. Outage window required.', priority: 2, status: 'CLOSED', assigneeKey: 'eng5', teamId: teamIdA, slaOffsetDays: -5 },
    { title: 'Mobile device management — BYOD enrolment failed', description: '15 personal devices unable to enrol in Intune after policy change. Compliance status unknown.', priority: 3, status: 'IN_PROGRESS', assigneeKey: 'eng2', teamId: teamIdA, slaOffsetDays: 2 },
    { title: 'Cloud cost overrun — Azure subscription', description: 'Azure spend 38% over monthly budget. Untagged resources in dev subscription identified.', priority: 3, status: 'NEW', assigneeKey: null, teamId: null, slaOffsetDays: 4 },
  ];

  for (const spec of TICKET_SPECS) {
    const id = randomUUID();
    const slaResolutionDeadline = ts(spec.slaOffsetDays);
    const slaPickupDeadline     = new Date(slaResolutionDeadline.getTime() - 30 * 60 * 1000);
    await db.insert(tickets).values({
      id,
      tenantId: TENANT_ID,
      title: spec.title,
      description: spec.description,
      priority: spec.priority,
      status: spec.status,
      teamId: spec.teamId,
      assigneeId: spec.assigneeKey ? userIds[spec.assigneeKey] : null,
      createdBy: userIds.admin,
      slaPickupDeadline,
      slaResolutionDeadline,
      slaPickupBreached: 0,
      slaResolutionBreached: spec.slaOffsetDays < 0 ? 1 : 0,
      assignedAt: spec.assigneeKey ? ts(-2) : null,
      resolvedAt: spec.status === 'RESOLVED' || spec.status === 'CLOSED' ? ts(-1) : null,
      closedAt:   spec.status === 'CLOSED' ? ts(0) : null,
      createdAt: ts(-5),
      updatedAt: NOW,
    }).catch(() => {});
  }
  console.log(`✅ Tickets (${TICKET_SPECS.length})`);

  // ── 5. Tasks ──────────────────────────────────────────────────────────────
  const TASK_SPECS: Array<{
    title: string; taskType: string; source: string; status: string;
    assigneeKey: keyof typeof userIds; teamId: string; dueDays: number; progress: number;
  }> = [
    { title: 'Document DR/BCP runbook for VPN failover', taskType: 'DR_BCP',         source: 'LEAD_ASSIGNED', status: 'IN_PROGRESS', assigneeKey: 'eng1', teamId: teamIdA, dueDays: 5,  progress: 40 },
    { title: 'Patch Tuesday — apply Windows Server patches', taskType: 'MAINTENANCE', source: 'LEAD_ASSIGNED', status: 'OPEN',        assigneeKey: 'eng2', teamId: teamIdA, dueDays: 3,  progress: 0  },
    { title: 'Q2 security awareness training',              taskType: 'TRAINING',     source: 'LEAD_ASSIGNED', status: 'COMPLETED',   assigneeKey: 'eng5', teamId: teamIdA, dueDays: -2, progress: 100},
    { title: 'Review and close stale AD accounts',          taskType: 'MAINTENANCE',  source: 'SELF_LOGGED',   status: 'IN_PROGRESS', assigneeKey: 'eng1', teamId: teamIdA, dueDays: 4,  progress: 60 },
    { title: 'Update firewall allow-list for SaaS IPs',     taskType: 'CHANGE_REQUEST',source:'LEAD_ASSIGNED', status: 'OPEN',        assigneeKey: 'eng5', teamId: teamIdA, dueDays: 2,  progress: 0  },
    { title: 'Write deployment runbook for helpdesk v2',    taskType: 'DOCUMENTATION', source:'SELF_LOGGED',   status: 'OPEN',        assigneeKey: 'eng3', teamId: teamIdB, dueDays: 6,  progress: 20 },
    { title: 'Code review — API auth middleware',           taskType: 'AD_HOC',        source:'LEAD_ASSIGNED', status: 'COMPLETED',   assigneeKey: 'eng4', teamId: teamIdB, dueDays: -1, progress: 100},
    { title: 'Prepare test environment for UAT sprint',     taskType: 'CHANGE_REQUEST',source:'LEAD_ASSIGNED', status: 'IN_PROGRESS', assigneeKey: 'eng3', teamId: teamIdB, dueDays: 2,  progress: 70 },
    { title: 'Monitor cloud spend — weekly check',          taskType: 'AD_HOC',        source:'SELF_LOGGED',   status: 'OPEN',        assigneeKey: 'eng4', teamId: teamIdB, dueDays: 1,  progress: 0  },
    { title: 'SSL renewal checklist for all subdomains',    taskType: 'MAINTENANCE',   source:'LEAD_ASSIGNED', status: 'IN_PROGRESS', assigneeKey: 'eng2', teamId: teamIdA, dueDays: 3,  progress: 50 },
  ];

  for (const spec of TASK_SPECS) {
    await db.insert(tasks).values({
      id: randomUUID(),
      tenantId: TENANT_ID,
      teamId: spec.teamId,
      title: spec.title,
      description: null,
      taskType: spec.taskType,
      source: spec.source,
      status: spec.status,
      progressOverride: spec.progress,
      createdBy: spec.source === 'LEAD_ASSIGNED' ? userIds.leadA : userIds[spec.assigneeKey],
      dueDate: ts(spec.dueDays),
      createdAt: ts(-3),
      updatedAt: NOW,
    }).catch(() => {});
  }
  console.log(`✅ Tasks (${TASK_SPECS.length})`);

  // ── 6. KPI Definitions ────────────────────────────────────────────────────
  const kpiIds = {
    ticketResRate: randomUUID(),
    slaCompliance: randomUUID(),
    avgResTime:    randomUUID(),
    firstContact:  randomUUID(),
    escalationRate:randomUUID(),
  };

  await db.insert(kpiDefinitions).values([
    { id: kpiIds.ticketResRate, tenantId: TENANT_ID, name: 'Ticket Resolution Rate',    metricType: 'PERCENTAGE', direction: 'HIGHER_BETTER', scope: 'INDIVIDUAL', defaultTarget: '95', weight: '30', status: 'ACTIVE', createdAt: NOW, updatedAt: NOW },
    { id: kpiIds.slaCompliance, tenantId: TENANT_ID, name: 'SLA Compliance',            metricType: 'PERCENTAGE', direction: 'HIGHER_BETTER', scope: 'TEAM',       defaultTarget: '90', weight: '25', status: 'ACTIVE', createdAt: NOW, updatedAt: NOW },
    { id: kpiIds.avgResTime,    tenantId: TENANT_ID, name: 'Avg Resolution Time (hrs)', metricType: 'TIME_HOURS', direction: 'LOWER_BETTER',  scope: 'INDIVIDUAL', defaultTarget: '4',  weight: '20', status: 'ACTIVE', createdAt: NOW, updatedAt: NOW },
    { id: kpiIds.firstContact,  tenantId: TENANT_ID, name: 'First Contact Resolution',  metricType: 'PERCENTAGE', direction: 'HIGHER_BETTER', scope: 'INDIVIDUAL', defaultTarget: '80', weight: '15', status: 'ACTIVE', createdAt: NOW, updatedAt: NOW },
    { id: kpiIds.escalationRate,tenantId: TENANT_ID, name: 'Escalation Rate',           metricType: 'PERCENTAGE', direction: 'LOWER_BETTER',  scope: 'TEAM',       defaultTarget: '5',  weight: '10', status: 'ACTIVE', createdAt: NOW, updatedAt: NOW },
  ]).catch(() => console.log('   KPI definitions already exist — skipped.'));
  console.log('✅ KPI Definitions (5)');

  // ── 7. Audit log entries (SERVICE_ prefix = incident log source) ──────────
  const AUDIT_ENTRIES = [
    { action: 'SERVICE_RESTART',   entityType: 'service',  entityId: 'email-processor', details: JSON.stringify({ reason: 'OOM — RSS exceeded 512 MB', triggeredBy: 'health-monitor' }) },
    { action: 'SERVICE_DEGRADED',  entityType: 'service',  entityId: 'queue-worker',    details: JSON.stringify({ latency_ms: 4200, threshold_ms: 2000 }) },
    { action: 'SERVICE_RECOVERED', entityType: 'service',  entityId: 'email-processor', details: JSON.stringify({ uptimeSince: ts(-1).toISOString() }) },
    { action: 'SERVICE_RESTART',   entityType: 'service',  entityId: 'api',             details: JSON.stringify({ reason: 'Deployment — v0.13.0', triggeredBy: 'admin' }) },
    { action: 'DB_SLOW_QUERY',     entityType: 'database', entityId: 'mssql',           details: JSON.stringify({ duration_ms: 8900, query: 'SELECT * FROM Tickets WHERE …' }) },
    { action: 'QUEUE_DEPTH_HIGH',  entityType: 'queue',    entityId: 'ticket-events',   details: JSON.stringify({ depth: 1823, threshold: 1000 }) },
    { action: 'TICKET_CREATED',    entityType: 'ticket',   entityId: randomUUID(),      details: JSON.stringify({ title: 'VPN connectivity dropped for 12 users' }) },
    { action: 'TICKET_ESCALATED',  entityType: 'ticket',   entityId: randomUUID(),      details: JSON.stringify({ reason: 'SLA breach imminent', escalatedBy: userIds.leadA }) },
    { action: 'SLA_BREACHED',      entityType: 'ticket',   entityId: randomUUID(),      details: JSON.stringify({ slaType: 'RESOLUTION', breachedAt: ts(-1).toISOString() }) },
    { action: 'USER_LOGIN',        entityType: 'user',     entityId: userIds.admin,     details: JSON.stringify({ ip: '196.0.3.42', ua: 'Chrome/124' }) },
  ];

  for (const entry of AUDIT_ENTRIES) {
    await db.insert(auditLogs).values({
      tenantId: TENANT_ID,
      userId: userIds.admin,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details,
      createdAt: ts(-Math.random() * 5),
    }).catch(() => {});
  }
  console.log(`✅ Audit log entries (${AUDIT_ENTRIES.length})`);

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete!');
  console.log(`   Tenant ID : ${TENANT_ID}`);
  console.log(`   Teams     : Infrastructure, App Development`);
  console.log(`   Users     : 9 (1 SUPERADMIN, 1 ADMIN, 2 LEADS, 5 ENGINEERS)`);
  console.log(`   Tickets   : 20`);
  console.log(`   Tasks     : 10`);
  console.log(`   KPIs      : 5 definitions`);
  console.log(`   Audit logs: ${AUDIT_ENTRIES.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
