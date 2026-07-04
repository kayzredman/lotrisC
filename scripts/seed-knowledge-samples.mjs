#!/usr/bin/env node
/**
 * seed-knowledge-samples.mjs
 * Seeds sample knowledge articles + chunks for dev Ask AI testing.
 *
 * Usage:
 *   node scripts/seed-knowledge-samples.mjs
 *   TENANT_ID=<guid> node scripts/seed-knowledge-samples.mjs
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
    title: 'Database connection timeout during peak load',
    body: `# Database connection timeout during peak load

## Incident summary
Application pods exhausted the SQL connection pool during the Monday morning traffic spike, causing 503 errors for ~18 minutes.

## Root cause
The default pool size (100) was insufficient after we doubled API replicas without updating \`Max Pool Size\`. Idle connections were not released quickly under sustained load.

## Workaround
Restart affected API pods to flush stale connections. Scale down traffic via the load balancer health drain if errors persist.

## Permanent fix
- Increased \`Max Pool Size\` to 300 in the connection string
- Added connection pool metrics to Grafana
- Set HPA max replicas to match pool capacity planning

## Lessons learned
Always revisit connection pool sizing when horizontal scaling changes.`,
    tags: 'rca,kedb,database,timeout',
  },
  {
    title: 'Redis cache stampede after deployment',
    body: `# Redis cache stampede after deployment

## Incident summary
Following a blue-green deploy, cache miss rate spiked to 95% and the orders API latency exceeded 8s.

## Root cause
The new build changed cache key prefixes without a warm-up job. All pods cold-missed simultaneously and hammered the database.

## Workaround
Enable read-only mode on the orders API for 10 minutes while running the cache warm-up script.

## Permanent fix
- Added deployment hook to pre-warm critical cache keys
- Implemented single-flight locking for hot keys
- Documented cache key versioning in the runbook`,
    tags: 'rca,kedb,redis,cache',
  },
  {
    title: 'Certificate expiry on internal API gateway',
    body: `# Certificate expiry on internal API gateway

## Incident summary
Internal microservices could not reach the API gateway; mutual TLS handshake failures started at 02:00 UTC.

## Root cause
The gateway TLS certificate expired. Auto-renewal was disabled on the staging cluster template copied to production.

## Workaround
Import the renewed PFX from the vault and reload the gateway listener without restart.

## Permanent fix
- Enabled cert-manager with 30-day renewal window alerts
- Added Datadog synthetic check for TLS expiry < 14 days`,
    tags: 'rca,kedb,tls,certificate',
  },
];

function chunkText(text, maxLen = 1200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxLen));
    i += maxLen;
  }
  return chunks.length ? chunks : [text];
}

async function upsertArticle(pool, sample) {
  const sourceId = randomUUID();
  const existing = await pool.request()
    .input('TenantId', sql.VarChar(36), TENANT_ID)
    .input('Title', sql.NVarChar(500), sample.title)
    .query(`
      SELECT id FROM knowledge.Knowledge_Articles
      WHERE tenant_id = @TenantId AND title = @Title
    `);

  const now = new Date();
  let articleId;

  if (existing.recordset.length > 0) {
    articleId = existing.recordset[0].id;
    await pool.request()
      .input('Id', sql.VarChar(36), articleId)
      .input('Body', sql.NVarChar(sql.MAX), sample.body)
      .input('Tags', sql.NVarChar(500), sample.tags)
      .input('UpdatedAt', sql.DateTime2, now)
      .query(`
        UPDATE knowledge.Knowledge_Articles
        SET body_markdown = @Body, tags = @Tags, updated_at = @UpdatedAt, status = 'ACTIVE'
        WHERE id = @Id
      `);
    console.log(`  updated: ${sample.title}`);
  } else {
    articleId = randomUUID();
    await pool.request()
      .input('Id', sql.VarChar(36), articleId)
      .input('TenantId', sql.VarChar(36), TENANT_ID)
      .input('SourceId', sql.VarChar(36), sourceId)
      .input('Title', sql.NVarChar(500), sample.title)
      .input('Body', sql.NVarChar(sql.MAX), sample.body)
      .input('Tags', sql.NVarChar(500), sample.tags)
      .input('PublishedAt', sql.DateTime2, now)
      .input('UpdatedAt', sql.DateTime2, now)
      .query(`
        INSERT INTO knowledge.Knowledge_Articles
          (id, tenant_id, source_type, source_id, title, body_markdown, tags, status, published_at, updated_at)
        VALUES
          (@Id, @TenantId, 'RCA', @SourceId, @Title, @Body, @Tags, 'ACTIVE', @PublishedAt, @UpdatedAt)
      `);
    console.log(`  inserted: ${sample.title}`);
  }

  await pool.request()
    .input('TenantId', sql.VarChar(36), TENANT_ID)
    .input('ArticleId', sql.VarChar(36), articleId)
    .query('DELETE FROM knowledge.Knowledge_Chunks WHERE tenant_id = @TenantId AND article_id = @ArticleId');

  const chunks = chunkText(sample.body);
  for (let i = 0; i < chunks.length; i++) {
    await pool.request()
      .input('Id', sql.VarChar(36), randomUUID())
      .input('TenantId', sql.VarChar(36), TENANT_ID)
      .input('ArticleId', sql.VarChar(36), articleId)
      .input('ChunkIndex', sql.Int, i)
      .input('ChunkText', sql.NVarChar(sql.MAX), chunks[i])
      .input('TokenCount', sql.Int, Math.ceil(chunks[i].length / 4))
      .input('CreatedAt', sql.DateTime2, now)
      .query(`
        INSERT INTO knowledge.Knowledge_Chunks
          (id, tenant_id, article_id, chunk_index, chunk_text, token_count, embedding_json, vector_id, acl_json, created_at)
        VALUES
          (@Id, @TenantId, @ArticleId, @ChunkIndex, @ChunkText, @TokenCount, NULL, NULL, NULL, @CreatedAt)
      `);
  }
}

async function main() {
  console.log(`Seeding knowledge samples for tenant ${TENANT_ID}…`);
  const pool = await sql.connect(DB);
  for (const sample of SAMPLES) {
    await upsertArticle(pool, sample);
  }
  const counts = await pool.request()
    .input('TenantId', sql.VarChar(36), TENANT_ID)
    .query(`
      SELECT
        (SELECT COUNT(*) FROM knowledge.Knowledge_Articles WHERE tenant_id = @TenantId) AS articles,
        (SELECT COUNT(*) FROM knowledge.Knowledge_Chunks WHERE tenant_id = @TenantId) AS chunks
    `);
  console.log('Done.', counts.recordset[0]);
  await pool.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
