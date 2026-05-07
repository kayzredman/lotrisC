/**
 * seed-full.ts — Comprehensive demo data for all Lotris pages.
 *
 * Usage:
 *   cd apps/api
 *   ./node_modules/.bin/tsx --env-file=.env src/scripts/seed-full.ts
 *
 * What this seeds (idempotent — safe to re-run):
 *   MSSQL: Removes duplicate KPI_Definitions, seeds SLA_Configs, Queue_Config,
 *          Task_Assignments, KPI_Engineer_Assignments, KPI_Agreements,
 *          KPI_Agreement_Areas, KPI_Agreement_Metrics, KPI_Actuals, KPI_Results.
 *   PostgreSQL: Updates analytics_ticket_daily & analytics_engineer_perf with
 *               realistic values, seeds analytics_kpi_summary, report_jobs,
 *               report_schedules.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  getMssqlDb,
  getPostgresDb,
  kpiEngineerAssignments,
  kpiAgreements,
  kpiAgreementAreas,
  kpiAgreementMetrics,
  kpiActuals,
  kpiResults,
  slaConfigs,
  queueConfigs,
  taskAssignments,
  analyticsEngineerPerf,
  analyticsKpiSummary,
  analyticsTicketDaily,
  reportJobs,
  reportSchedules,
  eq,
  and,
  sql,
} from '@lotris/db';

// ─── Constants ───────────────────────────────────────────────────────────────

const TENANT_ID  = '10000001-0000-0000-0000-000000000001';
const NOW = new Date();
const DAY = 24 * 60 * 60 * 1000;

function ts(offsetDays = 0): Date {
  return new Date(NOW.getTime() + offsetDays * DAY);
}

function dateStr(offsetDays = 0): string {
  return ts(offsetDays).toISOString().slice(0, 10);
}

const USER_IDS = {
  superadmin: '30000001-0000-0000-0000-000000000001',
  admin:      '30000001-0000-0000-0000-000000000002',
  leadA:      '30000001-0000-0000-0000-000000000003',
  leadB:      '30000001-0000-0000-0000-000000000004',
  eng1:       '30000001-0000-0000-0000-000000000005',
  eng2:       '30000001-0000-0000-0000-000000000006',
  eng3:       '30000001-0000-0000-0000-000000000007',
  eng4:       '30000001-0000-0000-0000-000000000008',
  eng5:       '30000001-0000-0000-0000-000000000009',
};

const TEAM_IDS = {
  infra:  '20000001-0000-0000-0000-000000000001',
  appdev: '20000001-0000-0000-0000-000000000002',
};

// KPI_Definition IDs — first (unique) set from the duplicate seeding
const KPI = {
  ticketResRate:  '3978d17c-177d-4e53-9703-1ee90d3b3eb4',
  slaCompliance:  'ff139469-f4d3-474e-8ed9-606fdf17e854',
  avgResTime:     '7b35af54-fd64-4029-aa91-4d2ac7284107',
  firstContact:   '38cee62e-5433-409f-9a75-f051e093f1f2',
  escalationRate: '2c7bb0b7-bf1a-4ee9-ae41-dd3ccb10bff6',
};

// Duplicate KPI_Definitions to remove (second seeding pass)
const KPI_DUPLICATES = [
  '9c8548b4-348f-454d-bcfe-442a7d89fd44',
  '44f83f8c-b449-49f0-9754-d252bea2612c',
  'f9342a5b-b13d-4b0a-a479-b71c456f25fb',
  '96ab5201-87b5-451a-9e4f-28dfe34852dc',
  'a0dfa130-6bec-4024-ad19-af14ca7996fb',
];

// Task ID → assignee mapping (hardcoded from DB state)
const TASK_ASSIGNMENTS: Record<string, string> = {
  '0d272160-3680-4f8e-bcab-d3640b0eb232': USER_IDS.eng4,  // Code review (B)
  '39c2cf67-804e-46c5-ad10-e4b46f424d10': USER_IDS.eng1,  // Review AD accounts (A)
  '3f2d3f72-5422-44d5-a1ee-649c6054ed40': USER_IDS.eng2,  // Patch Tuesday (A)
  '5db27042-bfca-4c59-aa52-7c2d70060054': USER_IDS.eng5,  // Q2 training (A)
  '6c80c5ec-5e24-425e-a757-29e669f09c2b': USER_IDS.eng2,  // SSL renewal (A)
  '7f7100e4-57f8-4d6b-85cf-38ad384b26c5': USER_IDS.eng3,  // UAT env (B)
  'beb81fc8-5089-4deb-922e-eb33d70ef7c1': USER_IDS.eng3,  // Deployment runbook (B)
  'a3c018ef-2ebe-4a1b-9ed6-f89d443af054': USER_IDS.eng4,  // Cloud spend (B)
  'af26ae9b-aece-409b-8205-eaa616e6a45b': USER_IDS.eng5,  // Firewall (A)
  'ffb3f937-71b8-4af2-b939-52dba7f66d07': USER_IDS.eng1,  // DR/BCP runbook (A)
  'b559c79f-6eb9-4fe8-beb4-3400b819216c': USER_IDS.eng3,  // Deployment runbook dup (B)
  'db27b150-b9e2-45d8-84fc-c6cf366d706f': USER_IDS.eng2,  // SSL renewal dup (A)
  'dc0677d2-40aa-489e-8a11-28610c4674cd': USER_IDS.eng2,  // Patch Tuesday dup (A)
  'f2d9d34e-def6-4201-8c04-ab15a1bc6566': USER_IDS.eng3,  // UAT env dup (B)
  '8a04acd7-57a9-4dff-af77-42de4df861a1': USER_IDS.eng1,  // DR/BCP dup (A)
  '9b44fdd0-791c-45e1-82f5-9d03bf5dfa26': USER_IDS.eng5,  // Firewall dup (A)
  '9fd37c82-7fc8-46af-8702-738e718ede7d': USER_IDS.eng4,  // Cloud spend dup (B)
  '4a29f31c-04d3-4518-b9f7-c5649b388099': USER_IDS.eng1,  // Review AD dup (A)
  '14632e9b-f789-4ad7-92fa-32e9f07115e3': USER_IDS.eng5,  // Q2 training dup (A)
  '261179d0-99f6-416a-bdf5-a7b433161d9b': USER_IDS.eng4,  // Code review dup (B)
};

// Engineer performance profiles for current week
const ENG_PERF = [
  { id: USER_IDS.eng1, tickets: 4, tasks: 3, breaches: 0, avgHrs: '3.80', kpiScore: '87.40' },
  { id: USER_IDS.eng2, tickets: 2, tasks: 2, breaches: 1, avgHrs: '5.10', kpiScore: '76.80' },
  { id: USER_IDS.eng3, tickets: 5, tasks: 3, breaches: 0, avgHrs: '3.20', kpiScore: '91.20' },
  { id: USER_IDS.eng4, tickets: 2, tasks: 2, breaches: 2, avgHrs: '6.50', kpiScore: '69.50' },
  { id: USER_IDS.eng5, tickets: 3, tasks: 2, breaches: 1, avgHrs: '4.20', kpiScore: '82.30' },
];

// KPI scores per engineer [resolution_rate, sla_compliance, escalation_rate, avg_res_time, first_contact]
const ENG_KPI_SCORES: Record<string, [number, number, number, number, number]> = {
  [USER_IDS.eng1]: [92, 88, 3,   3.8, 85],
  [USER_IDS.eng2]: [87, 83, 5,   5.1, 78],
  [USER_IDS.eng3]: [96, 93, 2,   3.2, 91],
  [USER_IDS.eng4]: [80, 75, 8,   6.5, 72],
  [USER_IDS.eng5]: [90, 86, 4,   4.2, 82],
};

// Realistic daily ticket created/resolved distribution over last 30 days
// index 0 = 30 days ago, index 29 = yesterday
const DAILY_CREATED = [0, 1, 2, 1, 2, 0, 1, 2, 1, 3, 0, 2, 1, 2, 1, 2, 3, 1, 2, 1, 2, 3, 2, 1, 2, 3, 1, 2, 1, 0];
const DAILY_RESOLVED = [0, 0, 1, 1, 1, 1, 0, 1, 2, 1, 1, 0, 2, 1, 1, 1, 2, 2, 1, 1, 1, 2, 2, 1, 1, 2, 2, 1, 1, 0];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Lotris Full Data Seed — Ingesting demo data for all pages…\n');

  const mssql = await getMssqlDb();
  const pg    = getPostgresDb();

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION A — MSSQL OPERATIONAL DATA
  // ══════════════════════════════════════════════════════════════════════════

  // ── A1. Remove duplicate KPI_Definitions ─────────────────────────────────
  console.log('🔧 A1. Removing duplicate KPI definitions…');
  try {
    // Use raw SQL to delete duplicates — Drizzle delete via mssql stub
    const dupList = KPI_DUPLICATES.map((id) => `'${id}'`).join(', ');
    await mssql.execute(sql.raw(`DELETE FROM KPI_Definitions WHERE id IN (${dupList})`));
    console.log('   ✅ Removed 5 duplicate KPI definitions');
  } catch {
    console.log('   ⚠️  Delete skipped (may already be removed)');
  }

  // ── A2. SLA_Configs ───────────────────────────────────────────────────────
  console.log('🔧 A2. Seeding SLA_Configs…');
  const slaRows = [
    {
      id: '40000001-0000-0000-0000-000000000001',
      tenantId: TENANT_ID,
      teamId: TEAM_IDS.infra,
      pickupSlaMinutes: 30,
      resolutionSlaMinutes: 240,
      createdAt: ts(-30),
      updatedAt: NOW,
    },
    {
      id: '40000001-0000-0000-0000-000000000002',
      tenantId: TENANT_ID,
      teamId: TEAM_IDS.appdev,
      pickupSlaMinutes: 45,
      resolutionSlaMinutes: 480,
      createdAt: ts(-30),
      updatedAt: NOW,
    },
  ];
  for (const row of slaRows) {
    await mssql.insert(slaConfigs).values(row).catch(() => {});
  }
  console.log('   ✅ SLA_Configs (2)');

  // ── A3. Queue_Config ──────────────────────────────────────────────────────
  console.log('🔧 A3. Seeding Queue_Config…');
  const queueRows = [
    {
      id: '50000001-0000-0000-0000-000000000001',
      tenantId: TENANT_ID,
      teamId: TEAM_IDS.infra,
      maxCapacityPerEngineer: 5,
      pickupSlaMinutes: 30,
      resolutionSlaMinutes: 240,
      autoAssignEnabled: 1,
      createdAt: ts(-30),
      updatedAt: NOW,
    },
    {
      id: '50000001-0000-0000-0000-000000000002',
      tenantId: TENANT_ID,
      teamId: TEAM_IDS.appdev,
      maxCapacityPerEngineer: 4,
      pickupSlaMinutes: 45,
      resolutionSlaMinutes: 480,
      autoAssignEnabled: 1,
      createdAt: ts(-30),
      updatedAt: NOW,
    },
  ];
  for (const row of queueRows) {
    await mssql.insert(queueConfigs).values(row).catch(() => {});
  }
  console.log('   ✅ Queue_Config (2)');

  // ── A4. Task_Assignments ──────────────────────────────────────────────────
  console.log('🔧 A4. Seeding Task_Assignments…');
  let taskAssignCount = 0;
  for (const [taskId, assigneeId] of Object.entries(TASK_ASSIGNMENTS)) {
    await mssql.insert(taskAssignments).values({
      id:          randomUUID(),
      tenantId:    TENANT_ID,
      taskId:      taskId,
      assigneeId:  assigneeId,
      isCompleted: 0,
      assignedAt:  ts(-3),
    }).catch(() => {});
    taskAssignCount++;
  }
  console.log(`   ✅ Task_Assignments (${taskAssignCount})`);

  // ── A5. KPI_Engineer_Assignments ─────────────────────────────────────────
  console.log('🔧 A5. Seeding KPI_Engineer_Assignments…');
  const engineers = [USER_IDS.eng1, USER_IDS.eng2, USER_IDS.eng3, USER_IDS.eng4, USER_IDS.eng5];
  const kpiDefs   = Object.values(KPI);
  let assignCount = 0;
  for (const engId of engineers) {
    for (const defId of kpiDefs) {
      await mssql.insert(kpiEngineerAssignments).values({
        id:                randomUUID(),
        tenantId:          TENANT_ID,
        engineerId:        engId,
        kpiDefinitionId:   defId,
        periodKey:         '2026-Q2',
        measurementPeriod: 'QUARTERLY',
        targetOverride:    null,
        assignedBy:        USER_IDS.admin,
        createdAt:         ts(-30),
      }).catch(() => {});
      assignCount++;
    }
  }
  console.log(`   ✅ KPI_Engineer_Assignments (${assignCount})`);

  // ── A6-A9. KPI_Agreements + Areas + Metrics + Actuals + Results ───────────
  console.log('🔧 A6-A9. Seeding KPI Agreements, Areas, Metrics, Actuals, Results…');

  const engLeadMap: Record<string, string> = {
    [USER_IDS.eng1]: USER_IDS.leadA,
    [USER_IDS.eng2]: USER_IDS.leadA,
    [USER_IDS.eng5]: USER_IDS.leadA,
    [USER_IDS.eng3]: USER_IDS.leadB,
    [USER_IDS.eng4]: USER_IDS.leadB,
  };

  // metric structure: [kpi_def_id, area_name, description, weight_in_area, target, measurementPeriod]
  type MetricSpec = {
    kpiDefId: string;
    desc: string;
    weight: string;
    target: string;
    period: string;
    sortOrder: number;
  };

  const AREA_SPECS: Array<{
    areaName: string;
    areaWeight: string;
    sortOrder: number;
    metrics: MetricSpec[];
  }> = [
    {
      areaName: 'Service Quality',
      areaWeight: '60.00',
      sortOrder: 1,
      metrics: [
        { kpiDefId: KPI.ticketResRate,  desc: 'Tickets resolved vs total assigned',    weight: '40.00', target: '95.00', period: 'MONTHLY', sortOrder: 1 },
        { kpiDefId: KPI.slaCompliance,  desc: 'Tickets resolved within SLA window',    weight: '30.00', target: '90.00', period: 'MONTHLY', sortOrder: 2 },
        { kpiDefId: KPI.escalationRate, desc: 'Percentage of tickets escalated',       weight: '30.00', target: '5.00',  period: 'MONTHLY', sortOrder: 3 },
      ],
    },
    {
      areaName: 'Productivity',
      areaWeight: '40.00',
      sortOrder: 2,
      metrics: [
        { kpiDefId: KPI.avgResTime,   desc: 'Average hours from open to resolved',     weight: '60.00', target: '4.00',  period: 'MONTHLY', sortOrder: 1 },
        { kpiDefId: KPI.firstContact, desc: 'Tickets resolved on first contact',       weight: '40.00', target: '80.00', period: 'MONTHLY', sortOrder: 2 },
      ],
    },
  ];

  let agreementCount = 0;
  let areaCount = 0;
  let metricCount = 0;
  let actualCount = 0;
  let resultCount = 0;

  for (const engId of engineers) {
    const leadId = engLeadMap[engId] ?? USER_IDS.leadA;
    const scores = ENG_KPI_SCORES[engId] ?? ([90, 88, 4, 4.0, 82] as [number, number, number, number, number]);
    // scores: [resolution_rate, sla_compliance, escalation_rate, avg_res_time, first_contact]

    const agreementId = randomUUID();
    await mssql.insert(kpiAgreements).values({
      id:          agreementId,
      tenantId:    TENANT_ID,
      engineerId:  engId,
      leadId:      leadId,
      periodKey:   '2026-Q2',
      status:      'ACTIVE',
      submittedAt: ts(-14),
      acceptedAt:  ts(-12),
      closedAt:    null,
      createdAt:   ts(-14),
      updatedAt:   ts(-12),
    }).catch(() => {});
    agreementCount++;

    // Per-engineer actual values mapped to KPI order
    const actualsByKpiDef: Record<string, number> = {
      [KPI.ticketResRate]:  scores[0],
      [KPI.slaCompliance]:  scores[1],
      [KPI.escalationRate]: scores[2],
      [KPI.avgResTime]:     scores[3],
      [KPI.firstContact]:   scores[4],
    };

    // Compute area/overall scores
    let overallScore = 0;

    for (const areaSpec of AREA_SPECS) {
      const areaId = randomUUID();
      await mssql.insert(kpiAgreementAreas).values({
        id:          areaId,
        tenantId:    TENANT_ID,
        agreementId: agreementId,
        name:        areaSpec.areaName,
        weight:      areaSpec.areaWeight,
        sortOrder:   areaSpec.sortOrder,
      }).catch(() => {});
      areaCount++;

      // Compute area score from metrics
      let areaActualScore = 0;
      const metricIds: string[] = [];

      for (const mspec of areaSpec.metrics) {
        const metricId = randomUUID();
        const actualVal = actualsByKpiDef[mspec.kpiDefId] ?? 0;
        // Score contribution = actual / target * weight (capped at weight)
        const targetNum = parseFloat(mspec.target);
        const rawScore = mspec.kpiDefId === KPI.avgResTime
          ? (targetNum / Math.max(actualVal, 0.1)) * 100          // lower is better
          : (actualVal / targetNum) * 100;                         // higher is better
        const capped = Math.min(rawScore, 100);
        areaActualScore += (capped * parseFloat(mspec.weight)) / 100;

        await mssql.insert(kpiAgreementMetrics).values({
          id:                metricId,
          tenantId:          TENANT_ID,
          areaId:            areaId,
          kpiDefinitionId:   mspec.kpiDefId,
          description:       mspec.desc,
          measurementPeriod: mspec.period,
          weight:            mspec.weight,
          targetScore:       mspec.target,
          actualScore:       actualVal.toFixed(2),
          sortOrder:         mspec.sortOrder,
        }).catch(() => {});
        metricCount++;
        metricIds.push(metricId);

        // Seed KPI_Actuals row
        await mssql.insert(kpiActuals).values({
          id:             randomUUID(),
          tenantId:       TENANT_ID,
          engineerId:     engId,
          metricId:       metricId,
          kpiDefinitionId:mspec.kpiDefId,
          value:          actualVal.toFixed(2),
          source:         'MANUAL',
          sourceRefId:    null,
          note:           null,
          recordedAt:     ts(-1),
        }).catch(() => {});
        actualCount++;
      }

      overallScore += (areaActualScore * parseFloat(areaSpec.areaWeight)) / 100;
    }

    // Seed KPI_Results
    const areaScoresJson = JSON.stringify(
      AREA_SPECS.map((a) => ({ area: a.areaName, weight: a.areaWeight }))
    );
    await mssql.insert(kpiResults).values({
      id:             randomUUID(),
      tenantId:       TENANT_ID,
      engineerId:     engId,
      agreementId:    agreementId,
      periodKey:      '2026-Q2',
      areaScoresJson: areaScoresJson,
      overallScore:   overallScore.toFixed(2),
      computedAt:     ts(-1),
    }).catch(() => {});
    resultCount++;
  }

  console.log(`   ✅ KPI_Agreements (${agreementCount})`);
  console.log(`   ✅ KPI_Agreement_Areas (${areaCount})`);
  console.log(`   ✅ KPI_Agreement_Metrics (${metricCount})`);
  console.log(`   ✅ KPI_Actuals (${actualCount})`);
  console.log(`   ✅ KPI_Results (${resultCount})`);

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION B — POSTGRESQL ANALYTICS DATA
  // ══════════════════════════════════════════════════════════════════════════

  // ── B1. Update analytics_ticket_daily with realistic historical counts ────
  console.log('🔧 B1. Updating analytics_ticket_daily with realistic historical data…');
  let updatedDays = 0;
  for (let i = 0; i < 30; i++) {
    const dayOffset = -(30 - i);   // -30 to -1
    const dStr = dateStr(dayOffset);
    const created = DAILY_CREATED[i] ?? 0;
    const resolved = DAILY_RESOLVED[i] ?? 0;

    try {
      await pg
        .update(analyticsTicketDaily)
        .set({
          totalCreated:  created,
          totalResolved: resolved,
          totalEscalated: created > 0 ? Math.floor(created * 0.15) : 0,
        })
        .where(
          and(
            eq(analyticsTicketDaily.tenantId, TENANT_ID),
            sql`${analyticsTicketDaily.date} = ${dStr}`,
          ),
        );
      updatedDays++;
    } catch {
      // Row may not exist for this date — skip
    }
  }
  console.log(`   ✅ analytics_ticket_daily updated (${updatedDays} rows)`);

  // ── B2. Update analytics_engineer_perf with real values ──────────────────
  console.log('🔧 B2. Updating analytics_engineer_perf…');
  let updatedEngineers = 0;
  for (const perf of ENG_PERF) {
    try {
      await pg
        .update(analyticsEngineerPerf)
        .set({
          ticketsResolved:    perf.tickets,
          tasksCompleted:     perf.tasks,
          slaBreaches:        perf.breaches,
          avgResolutionHours: perf.avgHrs,
          kpiScore:           perf.kpiScore,
          updatedAt:          NOW,
        })
        .where(
          and(
            eq(analyticsEngineerPerf.tenantId, TENANT_ID),
            eq(analyticsEngineerPerf.engineerId, perf.id),
          ),
        );
      updatedEngineers++;
    } catch {
      // May not exist — skip
    }
  }
  console.log(`   ✅ analytics_engineer_perf updated (${updatedEngineers} rows)`);

  // ── B3. Seed analytics_kpi_summary ───────────────────────────────────────
  console.log('🔧 B3. Seeding analytics_kpi_summary…');
  const kpiSummaryData = [
    { engId: USER_IDS.eng1, score: '87.40' },
    { engId: USER_IDS.eng2, score: '76.80' },
    { engId: USER_IDS.eng3, score: '91.20' },
    { engId: USER_IDS.eng4, score: '69.50' },
    { engId: USER_IDS.eng5, score: '82.30' },
  ];
  let kpiSummaryCount = 0;
  for (const row of kpiSummaryData) {
    await pg.insert(analyticsKpiSummary).values({
      id:           randomUUID(),
      tenantId:     TENANT_ID,
      engineerId:   row.engId,
      periodKey:    '2026-Q2',
      overallScore: row.score,
    }).catch(async () => {
      // Upsert: update if already exists
      try {
        await pg
          .update(analyticsKpiSummary)
          .set({ overallScore: row.score })
          .where(
            and(
              eq(analyticsKpiSummary.tenantId, TENANT_ID),
              eq(analyticsKpiSummary.engineerId, row.engId),
              sql`${analyticsKpiSummary.periodKey} = '2026-Q2'`,
            ),
          );
      } catch { /* skip */ }
    });
    kpiSummaryCount++;
  }
  console.log(`   ✅ analytics_kpi_summary (${kpiSummaryCount})`);

  // ── B4. Seed report_jobs (historical completed reports) ───────────────────
  console.log('🔧 B4. Seeding report_jobs…');
  const reportJobData = [
    {
      id:          'a1b2c3d4-0001-0000-0000-000000000001',
      tenantId:    TENANT_ID,
      reportType:  'TICKET_SUMMARY',
      format:      'PDF',
      status:      'DONE',
      filePath:    '/reports/ticket-summary-2026-04.pdf',
      requestedBy: USER_IDS.admin,
      dateFrom:    '2026-04-01',
      dateTo:      '2026-04-30',
      teamId:      null,
      errorMsg:    null,
      completedAt: ts(-7),
    },
    {
      id:          'a1b2c3d4-0002-0000-0000-000000000002',
      tenantId:    TENANT_ID,
      reportType:  'KPI_PERFORMANCE',
      format:      'EXCEL',
      status:      'DONE',
      filePath:    '/reports/kpi-performance-Q1-2026.xlsx',
      requestedBy: USER_IDS.leadA,
      dateFrom:    '2026-01-01',
      dateTo:      '2026-03-31',
      teamId:      TEAM_IDS.infra,
      errorMsg:    null,
      completedAt: ts(-14),
    },
    {
      id:          'a1b2c3d4-0003-0000-0000-000000000003',
      tenantId:    TENANT_ID,
      reportType:  'SLA_COMPLIANCE',
      format:      'PDF',
      status:      'DONE',
      filePath:    '/reports/sla-compliance-2026-W16.pdf',
      requestedBy: USER_IDS.admin,
      dateFrom:    '2026-04-14',
      dateTo:      '2026-04-20',
      teamId:      null,
      errorMsg:    null,
      completedAt: ts(-18),
    },
    {
      id:          'a1b2c3d4-0004-0000-0000-000000000004',
      tenantId:    TENANT_ID,
      reportType:  'ENGINEER_PERFORMANCE',
      format:      'EXCEL',
      status:      'FAILED',
      filePath:    null,
      requestedBy: USER_IDS.leadB,
      dateFrom:    '2026-04-01',
      dateTo:      '2026-04-30',
      teamId:      TEAM_IDS.appdev,
      errorMsg:    'PostgreSQL connection timeout during export',
      completedAt: ts(-3),
    },
  ];
  let reportJobCount = 0;
  for (const row of reportJobData) {
    await pg.insert(reportJobs).values(row).catch(() => {});
    reportJobCount++;
  }
  console.log(`   ✅ report_jobs (${reportJobCount})`);

  // ── B5. Seed report_schedules ─────────────────────────────────────────────
  console.log('🔧 B5. Seeding report_schedules…');
  const scheduleData = [
    {
      id:          'b1c2d3e4-0001-0000-0000-000000000001',
      tenantId:    TENANT_ID,
      reportType:  'TICKET_SUMMARY',
      format:      'PDF',
      frequency:   'WEEKLY',
      recipients:  JSON.stringify(['admin@demo.lotris', 'superadmin@demo.lotris']),
      teamId:      null,
      isActive:    'true',
      createdBy:   USER_IDS.admin,
    },
    {
      id:          'b1c2d3e4-0002-0000-0000-000000000002',
      tenantId:    TENANT_ID,
      reportType:  'KPI_PERFORMANCE',
      format:      'EXCEL',
      frequency:   'MONTHLY',
      recipients:  JSON.stringify(['admin@demo.lotris', 'lead.a@demo.lotris', 'lead.b@demo.lotris']),
      teamId:      null,
      isActive:    'true',
      createdBy:   USER_IDS.admin,
    },
    {
      id:          'b1c2d3e4-0003-0000-0000-000000000003',
      tenantId:    TENANT_ID,
      reportType:  'SLA_COMPLIANCE',
      format:      'PDF',
      frequency:   'WEEKLY',
      recipients:  JSON.stringify(['lead.a@demo.lotris']),
      teamId:      TEAM_IDS.infra,
      isActive:    'false',
      createdBy:   USER_IDS.leadA,
    },
  ];
  let scheduleCount = 0;
  for (const row of scheduleData) {
    await pg.insert(reportSchedules).values(row).catch(() => {});
    scheduleCount++;
  }
  console.log(`   ✅ report_schedules (${scheduleCount})`);

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n🎉 Full seed complete!');
  console.log('   MSSQL  : SLA_Configs(2), Queue_Config(2), Task_Assignments(20),');
  console.log(`            KPI_Engineer_Assignments(${assignCount}), KPI_Agreements(5),`);
  console.log(`            KPI_Agreement_Areas(${areaCount}), KPI_Agreement_Metrics(${metricCount}),`);
  console.log(`            KPI_Actuals(${actualCount}), KPI_Results(${resultCount})`);
  console.log('   PG     : analytics_ticket_daily(30 rows updated),');
  console.log(`            analytics_engineer_perf(${updatedEngineers} rows updated),`);
  console.log(`            analytics_kpi_summary(${kpiSummaryCount}), report_jobs(${reportJobCount}), report_schedules(${scheduleCount})`);

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ seed-full failed:', err);
  process.exit(1);
});
