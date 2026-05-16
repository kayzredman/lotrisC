#!/usr/bin/env node
/**
 * Lotris MSSQL Migration Runner
 *
 * Reads all *.sql files from migrations/mssql/ in order and applies them to the
 * MSSQL database. Tracks applied migrations in a __migrations table so it is safe
 * to re-run (idempotent). Each SQL file is split on GO statements (T-SQL batch
 * separator) before execution.
 *
 * Usage:
 *   node packages/db/scripts/migrate.mjs
 *   railway run node packages/db/scripts/migrate.mjs
 */

import sql from 'mssql';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── URL parser (handles both mssql:// and sqlserver:// formats) ──────────────
function parseMssqlUrl(urlStr) {
  const withoutScheme = urlStr.replace(/^(mssql|sqlserver):\/\//, '');
  const lastAt = withoutScheme.lastIndexOf('@');
  const credentials = withoutScheme.substring(0, lastAt);
  const hostPart = withoutScheme.substring(lastAt + 1);

  const colonInCreds = credentials.indexOf(':');
  const user = credentials.substring(0, colonInCreds);
  const password = credentials.substring(colonInCreds + 1);

  let server, port, database;

  if (hostPart.includes(';')) {
    // sqlserver://sa:pass@host:1433;database=lotris;trustServerCertificate=true
    const [hostSection, ...params] = hostPart.split(';');
    const colonIdx = hostSection.indexOf(':');
    server = colonIdx >= 0 ? hostSection.substring(0, colonIdx) : hostSection;
    port = colonIdx >= 0 ? parseInt(hostSection.substring(colonIdx + 1), 10) : 1433;
    const dbParam = params.find(p => p.toLowerCase().startsWith('database='));
    database = dbParam ? dbParam.split('=')[1] : 'master';
  } else {
    // mssql://sa:pass@host:1433/lotris
    const slashIdx = hostPart.indexOf('/');
    const hostPortStr = slashIdx >= 0 ? hostPart.substring(0, slashIdx) : hostPart;
    database = slashIdx >= 0 ? hostPart.substring(slashIdx + 1) : 'master';
    const colonIdx = hostPortStr.indexOf(':');
    server = colonIdx >= 0 ? hostPortStr.substring(0, colonIdx) : hostPortStr;
    port = colonIdx >= 0 ? parseInt(hostPortStr.substring(colonIdx + 1), 10) : 1433;
  }

  return {
    server,
    port,
    database,
    user,
    password,
    options: { trustServerCertificate: true, encrypt: false },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const url = process.env.DATABASE_URL_MSSQL;
if (!url) {
  console.error('❌  DATABASE_URL_MSSQL is not set');
  process.exit(1);
}

const config = parseMssqlUrl(url);
console.log(`\n🔌  Connecting to ${config.server}:${config.port}/${config.database} as ${config.user}...\n`);

const pool = await sql.connect(config);

// ─── Ensure migrations tracking table exists ──────────────────────────────────
await pool.request().query(`
  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = '__migrations')
  CREATE TABLE __migrations (
    name       VARCHAR(255) NOT NULL PRIMARY KEY,
    applied_at DATETIME2(3) NOT NULL DEFAULT GETUTCDATE()
  )
`);

// ─── Run migrations in order ──────────────────────────────────────────────────
const migrationsDir = join(__dirname, '../migrations/mssql');
const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

let applied = 0;
let skipped = 0;

for (const file of files) {
  const check = await pool.request()
    .input('name', sql.VarChar(255), file)
    .query('SELECT 1 AS found FROM __migrations WHERE name = @name');

  if (check.recordset.length > 0) {
    console.log(`  ⏭  ${file} (already applied)`);
    skipped++;
    continue;
  }

  console.log(`  ▶  ${file} ...`);
  const sqlContent = readFileSync(join(migrationsDir, file), 'utf-8');

  // Split on GO (T-SQL batch separator) and execute each batch
  const batches = sqlContent.split(/^\s*GO\s*$/im).map(b => b.trim()).filter(Boolean);
  for (const batch of batches) {
    await pool.request().query(batch);
  }

  await pool.request()
    .input('name', sql.VarChar(255), file)
    .query('INSERT INTO __migrations (name) VALUES (@name)');

  console.log(`  ✅  ${file}`);
  applied++;
}

console.log(`\n✅  Done — ${applied} applied, ${skipped} already up to date.\n`);
await pool.close();
