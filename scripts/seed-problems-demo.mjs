#!/usr/bin/env node
/**
 * seed-problems-demo.mjs
 * Seeds sample problems, published RCAs, and known errors for dev demos.
 *
 * Usage:
 *   node scripts/seed-problems-demo.mjs
 *   TENANT_ID=<guid> node scripts/seed-problems-demo.mjs
 */

import sql from 'mssql';
import { randomUUID } from 'node:crypto';

const TENANT_ID = process.env.TENANT_ID ?? '701fc546-342b-4b80-82e1-24b152044161';

const DB = {
  server: process.env.MSSQL_HOST ?? 'localhost',
  port: Number(process.env.MSSQL_PORT ?? 1433),
  database: process.env.MSSQL_DB ?? 'lotris',
  user: process.env.MSSQL_USER ?? 'sa',
  password: process.env.MSSQL_PASSWORD ?? 'Lotris@Dev2024!',
  options: { encrypt: false, trustServerCertificate: true },
};

const SAMPLES = [
  {
    problemRef: 'PRB-0001',
    rcaRef: 'RCA-0001',
    title: 'Recurring database connection timeouts',
    status: 'PUBLISHED',
    incidentSummary: 'Application pods exhausted the SQL connection pool during peak traffic, causing 503 errors for ~18 minutes.',
    rootCause: 'Connection pool size was not updated after horizontal scaling doubled API replicas.',
    workaround: 'Restart affected API pods to flush stale connections.',
    permanentFix: 'Increased Max Pool Size to 300 and added pool metrics to Grafana.',
    lessonsLearned: 'Revisit connection pool sizing whenever replica count changes.',
  },
  {
    problemRef: 'PRB-0002',
    rcaRef: 'RCA-0002',
    title: 'Redis cache stampede after deployment',
    status: 'IN_REVIEW',
    incidentSummary: 'Cache miss rate spiked to 95% after a blue-green deploy; orders API latency exceeded 8s.',
    rootCause: 'New build changed cache key prefixes without a warm-up job.',
    workaround: 'Enable read-only mode while running the cache warm-up script.',
    permanentFix: 'Added deployment hook to pre-warm critical cache keys.',
    lessonsLearned: 'Version cache keys and warm caches before traffic cutover.',
  },
  {
    problemRef: 'PRB-0003',
    rcaRef: 'RCA-0003',
    title: 'TLS certificate expiry on API gateway',
    status: 'PUBLISHED',
    incidentSummary: 'Internal services failed mutual TLS handshake with the API gateway at 02:00 UTC.',
    rootCause: 'Gateway certificate expired; auto-renewal was disabled on the production cluster template.',
    workaround: 'Import renewed PFX from vault and reload the gateway listener.',
    permanentFix: 'Enabled cert-manager with 30-day renewal alerts.',
    lessonsLearned: 'Treat certificate expiry as a first-class operational monitor.',
  },
];

async function getOwnerId(pool) {
  const result = await pool.request()
    .input('TenantId', sql.VarChar(36), TENANT_ID)
    .query(`
      SELECT TOP 1 id FROM dbo.Users
      WHERE tenant_id = @TenantId
      ORDER BY CASE WHEN email LIKE '%admin%' THEN 0 ELSE 1 END, created_at
    `);
  if (!result.recordset.length) throw new Error(`No users found for tenant ${TENANT_ID}`);
  return result.recordset[0].id;
}

async function upsertSample(pool, sample, ownerId) {
  const existing = await pool.request()
    .input('TenantId', sql.VarChar(36), TENANT_ID)
    .input('ProblemRef', sql.VarChar(20), sample.problemRef)
    .query('SELECT id FROM dbo.Problem_Records WHERE tenant_id = @TenantId AND problem_ref = @ProblemRef');

  const now = new Date();
  let problemId;
  let rcaId;

  if (existing.recordset.length > 0) {
    problemId = existing.recordset[0].id;
    const rca = await pool.request()
      .input('ProblemId', sql.VarChar(36), problemId)
      .query('SELECT id FROM dbo.RCA_Records WHERE problem_id = @ProblemId');
    rcaId = rca.recordset[0]?.id;
    console.log(`  exists: ${sample.problemRef}`);
  } else {
    problemId = randomUUID();
    rcaId = randomUUID();
    await pool.request()
      .input('Id', sql.VarChar(36), problemId)
      .input('TenantId', sql.VarChar(36), TENANT_ID)
      .input('ProblemRef', sql.VarChar(20), sample.problemRef)
      .input('Title', sql.NVarChar(500), sample.title)
      .input('Status', sql.VarChar(30), sample.status === 'PUBLISHED' ? 'CLOSED' : 'INVESTIGATING')
      .input('CreatedAt', sql.DateTime2, now)
      .input('UpdatedAt', sql.DateTime2, now)
      .query(`
        INSERT INTO dbo.Problem_Records
          (id, tenant_id, problem_ref, title, status, priority, recurrence_count, created_at, updated_at)
        VALUES
          (@Id, @TenantId, @ProblemRef, @Title, @Status, 1, 1, @CreatedAt, @UpdatedAt)
      `);

    await pool.request()
      .input('Id', sql.VarChar(36), rcaId)
      .input('TenantId', sql.VarChar(36), TENANT_ID)
      .input('RcaRef', sql.VarChar(20), sample.rcaRef)
      .input('ProblemId', sql.VarChar(36), problemId)
      .input('Status', sql.VarChar(30), sample.status)
      .input('IncidentSummary', sql.NVarChar(4000), sample.incidentSummary)
      .input('RootCause', sql.NVarChar(2000), sample.rootCause)
      .input('Workaround', sql.NVarChar(2000), sample.workaround)
      .input('PermanentFix', sql.NVarChar(2000), sample.permanentFix)
      .input('Lessons', sql.NVarChar(2000), sample.lessonsLearned)
      .input('OwnerId', sql.VarChar(36), ownerId)
      .input('PublishedAt', sql.DateTime2, sample.status === 'PUBLISHED' ? now : null)
      .input('CreatedAt', sql.DateTime2, now)
      .input('UpdatedAt', sql.DateTime2, now)
      .query(`
        INSERT INTO dbo.RCA_Records
          (id, tenant_id, rca_ref, problem_id, status, incident_summary, root_cause_statement,
           resolution_summary, lessons_learned, process_owner_id, technical_owner_id,
           published_at, created_at, updated_at)
        VALUES
          (@Id, @TenantId, @RcaRef, @ProblemId, @Status, @IncidentSummary, @RootCause,
           @PermanentFix, @Lessons, @OwnerId, @OwnerId, @PublishedAt, @CreatedAt, @UpdatedAt)
      `);
    console.log(`  inserted: ${sample.problemRef} / ${sample.rcaRef} (${sample.status})`);
  }

  if (sample.status === 'PUBLISHED' && rcaId) {
    const ke = await pool.request()
      .input('RcaId', sql.VarChar(36), rcaId)
      .query('SELECT id FROM dbo.Known_Errors WHERE rca_id = @RcaId');
    if (!ke.recordset.length) {
      await pool.request()
        .input('Id', sql.VarChar(36), randomUUID())
        .input('TenantId', sql.VarChar(36), TENANT_ID)
        .input('RcaId', sql.VarChar(36), rcaId)
        .input('Title', sql.NVarChar(500), sample.title)
        .input('ErrorDescription', sql.NVarChar(2000), sample.incidentSummary)
        .input('Workaround', sql.NVarChar(2000), sample.workaround)
        .input('PermanentFix', sql.NVarChar(2000), sample.permanentFix)
        .input('PublishedAt', sql.DateTime2, now)
        .query(`
          INSERT INTO dbo.Known_Errors
            (id, tenant_id, rca_id, title, error_description, workaround, permanent_fix, status, published_at)
          VALUES
            (@Id, @TenantId, @RcaId, @Title, @ErrorDescription, @Workaround, @PermanentFix, 'ACTIVE', @PublishedAt)
        `);
      console.log(`    + known error: ${sample.title}`);
    }
  }
}

async function main() {
  console.log(`Seeding problems/RCAs for tenant ${TENANT_ID}…`);
  const pool = await sql.connect(DB);
  const ownerId = await getOwnerId(pool);
  console.log(`Using owner ${ownerId}`);

  for (const sample of SAMPLES) {
    await upsertSample(pool, sample, ownerId);
  }

  const counts = await pool.request()
    .input('TenantId', sql.VarChar(36), TENANT_ID)
    .query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.Problem_Records WHERE tenant_id = @TenantId) AS problems,
        (SELECT COUNT(*) FROM dbo.RCA_Records WHERE tenant_id = @TenantId) AS rcas,
        (SELECT COUNT(*) FROM dbo.Known_Errors WHERE tenant_id = @TenantId) AS knownErrors
    `);
  console.log('Done.', counts.recordset[0]);
  await pool.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
