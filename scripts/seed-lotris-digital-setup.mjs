#!/usr/bin/env node
/**
 * seed-lotris-digital-setup.mjs
 * ─────────────────────────────
 * Loads docs/TEAMLIST.xlsx into local dev under tenant "Lotris Digital Setup".
 *
 * Usage:
 *   node scripts/seed-lotris-digital-setup.mjs
 *   LOTRIS_API_URL=http://localhost:5153 node scripts/seed-lotris-digital-setup.mjs
 *
 * Idempotent: safe to re-run (skips existing teams/users; skips demo tickets if present).
 */

import sql from 'mssql';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const XLSX_PATH = join(ROOT, 'docs/TEAMLIST.xlsx');

const TENANT_NAME = 'Lotris Digital Setup';
const TENANT_SLUG = 'lotris-digital-setup';
const DEFAULT_PASSWORD = process.env.LOTRIS_SEED_PASSWORD ?? 'Lotris@Digital2024!';
const API_BASE = (process.env.LOTRIS_API_URL ?? 'http://localhost:5153').replace(/\/$/, '');

const DB = {
  server: process.env.MSSQL_HOST ?? 'localhost',
  port: Number(process.env.MSSQL_PORT ?? 1433),
  database: process.env.MSSQL_DB ?? 'lotris',
  user: process.env.MSSQL_USER ?? 'sa',
  password: process.env.MSSQL_PASSWORD ?? 'Lotris@Dev2024!',
  options: { encrypt: false, trustServerCertificate: true },
};

const ROLE_MAP = {
  'super admin': 1,
  'team lead': 4,
  engineer: 5,
};

const PARSE_XLSX_PY = `
import zipfile, xml.etree.ElementTree as ET, json, sys
path = sys.argv[1]
with zipfile.ZipFile(path) as z:
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        for si in root.findall('m:si', ns):
            texts = [t.text or '' for t in si.findall('.//m:t', ns)]
            shared.append(''.join(texts))
    sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    rows = []
    for row in sheet.findall('m:sheetData/m:row', ns):
        vals = []
        for c in row.findall('m:c', ns):
            t = c.get('t')
            v = c.find('m:v', ns)
            if v is None:
                vals.append('')
                continue
            val = v.text or ''
            if t == 's':
                val = shared[int(val)]
            vals.append(val)
        if any(str(x).strip() for x in vals):
            rows.append(vals)
    print(json.dumps(rows))
`;

function loadTeamlist() {
  const raw = JSON.parse(execFileSync('python3', ['-c', PARSE_XLSX_PY, XLSX_PATH], { encoding: 'utf8' }));
  const header = raw[0].map((h) => h.trim().toLowerCase());
  const emailIdx = header.findIndex((h) => h.includes('email'));
  const fullNameIdx = header.indexOf('full name');
  const designationIdx = header.indexOf('designation');
  const unitIdx = header.findIndex((h) => h.includes('unit'));

  return raw.slice(1).map((row) => {
    const fullName = titleCase((row[fullNameIdx] ?? '').trim());
    const designation = (row[designationIdx] ?? '').trim().toLowerCase();
    const unit = (row[unitIdx] ?? '').trim().replace(/\s+/g, ' ');
    let email = normalizeEmail(row[emailIdx] ?? '');
    if (!email.includes('@')) {
      email = synthesizeEmail(fullName);
    }
    const roleId = ROLE_MAP[designation] ?? ROLE_MAP.engineer;
    return { fullName, designation, unit, email, roleId };
  });
}

function titleCase(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function normalizeEmail(email) {
  return email.trim().toLowerCase().replace(/\s+/g, '');
}

function synthesizeEmail(fullName) {
  const parts = fullName.toLowerCase().split(' ').filter(Boolean);
  const local = parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
  return `${local.replace(/[^a-z0-9.]/g, '')}@lotris.com`;
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    const msg = json?.message ?? text ?? res.statusText;
    const err = new Error(`${method} ${path} → ${res.status}: ${msg}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function findTenant(pool) {
  const result = await pool.request().query(`
    SELECT TOP 1 id, name, slug
    FROM dbo.Tenants
    WHERE slug IN ('${TENANT_SLUG}', 'lotris-digital')
       OR name LIKE '%Lotris Digital%'
    ORDER BY CASE WHEN slug = '${TENANT_SLUG}' THEN 0 WHEN slug = 'lotris-digital' THEN 1 ELSE 2 END
  `);
  return result.recordset[0] ?? null;
}

async function renameTenant(pool, tenantId) {
  await pool.request()
    .input('id', sql.VarChar(36), tenantId)
    .input('name', sql.NVarChar(255), TENANT_NAME)
    .input('slug', sql.VarChar(100), TENANT_SLUG)
    .query(`
      UPDATE dbo.Tenants
      SET name = @name, slug = @slug, updated_at = SYSUTCDATETIME()
      WHERE id = @id
    `);
}

async function findBootstrapCandidates(pool, tenantId) {
  if (!tenantId) return [];
  const result = await pool.request()
    .input('tenantId', sql.VarChar(36), tenantId)
    .query(`
      SELECT email, role_id
      FROM dbo.Users
      WHERE tenant_id = @tenantId AND is_active = 1
      ORDER BY role_id ASC, email ASC
    `);
  return result.recordset.map((r) => r.email);
}

async function ensureBootstrapAdmin(pool, people, tenant) {
  const primary = people.find((p) => p.roleId === 1) ?? people[0];
  const passwords = [...new Set([DEFAULT_PASSWORD, 'Test1234!', process.env.LOTRIS_DEV_PASSWORD].filter(Boolean))];
  const candidates = [
    primary.email,
    ...(tenant ? await findBootstrapCandidates(pool, tenant.id) : []),
  ];
  const uniqueCandidates = [...new Set(candidates)];

  for (const email of uniqueCandidates) {
    for (const password of passwords) {
      try {
        const auth = await api('POST', '/api/v1/auth/login', {
          body: { email, password },
        });
        console.log(`✓ Logged in as ${email}`);
        return auth.accessToken;
      } catch (err) {
        if (err.status !== 401) throw err;
      }
    }
  }

  if (tenant) {
    try {
      const auth = await api('POST', '/api/v1/auth/register', {
        body: {
          email: primary.email,
          password: DEFAULT_PASSWORD,
          fullName: primary.fullName,
          tenantId: tenant.id,
          role: 1,
        },
      });
      console.log(`✓ Added bootstrap admin ${primary.email} to existing tenant`);
      return auth.accessToken;
    } catch (err) {
      if (err.status !== 400) throw err;
    }
  }

  const auth = await api('POST', '/api/v1/auth/register', {
    body: {
      email: primary.email,
      password: DEFAULT_PASSWORD,
      fullName: primary.fullName,
      tenantName: TENANT_NAME,
      tenantSlug: TENANT_SLUG,
      role: 1,
    },
  });
  console.log(`✓ Registered tenant "${TENANT_NAME}" with ${primary.email}`);
  return auth.accessToken;
}

async function completeOnboarding(token) {
  await api('POST', '/api/v1/onboarding/org', {
    token,
    body: { name: TENANT_NAME, slug: TENANT_SLUG },
  }).catch(() => {});
  await api('POST', '/api/v1/onboarding/sla', {
    token,
    body: { pickupSlaMinutes: 30, resolutionSlaMinutes: 240 },
  }).catch(() => {});
  await api('POST', '/api/v1/onboarding/complete', { token }).catch(() => {});
}

async function ensureTeams(token, units) {
  const existing = await api('GET', '/api/v1/admin/teams', { token });
  const byName = new Map(existing.map((t) => [t.name.toLowerCase(), t]));
  const teamIds = {};

  for (const unit of units) {
    const key = unit.toLowerCase();
    if (byName.has(key)) {
      teamIds[unit] = byName.get(key).id;
      continue;
    }
    const created = await api('POST', '/api/v1/admin/teams', {
      token,
      body: { name: unit, maxTicketsPerEngineer: 8, pickupSlaMinutes: 30 },
    });
    teamIds[unit] = created.id;
    console.log(`  + team: ${unit}`);
  }
  return teamIds;
}

async function ensureUsers(token, people, teamIds) {
  const existing = await api('GET', '/api/v1/admin/users', { token });
  const byEmail = new Map(existing.map((u) => [u.email.toLowerCase(), u]));
  const userIds = {};

  for (const person of people) {
    if (byEmail.has(person.email)) {
      userIds[person.email] = byEmail.get(person.email).id;
      continue;
    }
    const teamId = person.unit ? teamIds[person.unit] ?? null : null;
    try {
      const created = await api('POST', '/api/v1/admin/users', {
        token,
        body: {
          email: person.email,
          fullName: person.fullName,
          roleId: person.roleId,
          teamId,
          temporaryPassword: DEFAULT_PASSWORD,
        },
      });
      userIds[person.email] = created.id;
      console.log(`  + user: ${person.fullName} <${person.email}>`);
    } catch (err) {
      if (err.status === 400 && String(err.message).includes('already exists')) {
        const refreshed = await api('GET', '/api/v1/admin/users', { token });
        const hit = refreshed.find((u) => u.email.toLowerCase() === person.email);
        if (hit) userIds[person.email] = hit.id;
        continue;
      }
      throw err;
    }
  }
  return userIds;
}

async function seedDemoData(pool, tenantId, teamIds, userIds, people) {
  const countRes = await pool.request()
    .input('tenantId', sql.VarChar(36), tenantId)
    .query('SELECT COUNT(*) AS c FROM dbo.Tickets WHERE tenant_id = @tenantId');
  if (countRes.recordset[0].c > 0) {
    console.log(`ℹ Tenant already has ${countRes.recordset[0].c} tickets — skipping demo ticket seed`);
    return;
  }

  const now = new Date();
  const iso = (d) => d.toISOString().replace('T', ' ').replace('Z', '');

  const ticketTemplates = [
    { title: 'Core banking API timeout on peak load', priority: 1, status: 'CLOSED', team: 'Application Support', assigneeRole: 'engineer' },
    { title: 'VPN concentrator failover delay', priority: 1, status: 'CLOSED', team: 'Networks', assigneeRole: 'engineer' },
    { title: 'Active Directory replication warning', priority: 2, status: 'IN_PROGRESS', team: 'IT Infustructure', assigneeRole: 'engineer' },
    { title: 'Service desk queue threshold exceeded', priority: 2, status: 'ASSIGNED', team: 'Service Desk & Incident Management', assigneeRole: 'engineer' },
    { title: 'SSL certificate expiry on portal', priority: 2, status: 'NEW', team: 'IT Security', assigneeRole: 'lead' },
    { title: 'SQL Server blocking on reporting DB', priority: 1, status: 'RESOLVED', team: 'Database Admin', assigneeRole: 'engineer' },
    { title: 'Mobile channel login failures', priority: 1, status: 'IN_PROGRESS', team: 'FEP and Channels Support', assigneeRole: 'engineer' },
    { title: 'Project RAID log update overdue', priority: 3, status: 'TEAM_ASSIGNED', team: 'IT Project Management', assigneeRole: 'lead' },
    { title: 'SharePoint site permission drift', priority: 3, status: 'UNASSIGNED', team: 'Domain and Collaboration', assigneeRole: 'engineer' },
    { title: 'Incident bridge audio drop', priority: 2, status: 'ESCALATED', team: 'Incident Manager', assigneeRole: 'lead' },
    { title: 'Patch compliance below target', priority: 2, status: 'IN_PROGRESS', team: 'IT Security', assigneeRole: 'engineer' },
    { title: 'Batch job missed SLA window', priority: 2, status: 'ASSIGNED', team: 'Application Development', assigneeRole: 'engineer' },
    { title: 'CIO dashboard data stale', priority: 3, status: 'NEW', team: 'CIO', assigneeRole: 'lead' },
    { title: 'Printer fleet driver conflict', priority: 4, status: 'NEW', team: 'Service Desk & Incident Management', assigneeRole: 'engineer' },
    { title: 'Firewall rule review backlog', priority: 3, status: 'IN_PROGRESS', team: 'IT Security', assigneeRole: 'engineer' },
    { title: 'Knowledge article publish request', priority: 4, status: 'RESOLVED', team: 'Application Support', assigneeRole: 'engineer' },
    { title: 'Governance policy attestation due', priority: 3, status: 'ASSIGNED', team: 'IT Governance', assigneeRole: 'lead' },
    { title: 'Network latency spike — branch offices', priority: 2, status: 'IN_PROGRESS', team: 'Networks', assigneeRole: 'engineer' },
    { title: 'DR failover test scheduling', priority: 3, status: 'NEW', team: 'Database Admin', assigneeRole: 'lead' },
    { title: 'Legacy middleware memory leak', priority: 1, status: 'CLOSED', team: 'Application Development', assigneeRole: 'engineer' },
  ];

  const pickUser = (team, role) => {
    const poolPeople = people.filter((p) => p.unit === team);
    const subset = role === 'lead'
      ? poolPeople.filter((p) => p.roleId === 4)
      : poolPeople.filter((p) => p.roleId === 5);
    const pick = (subset[0] ?? poolPeople[0] ?? people[0]).email;
    return userIds[pick];
  };

  const creator = userIds[people.find((p) => p.roleId === 1)?.email ?? people[0].email];

  for (const tmpl of ticketTemplates) {
    const id = randomUUID();
    const teamId = teamIds[tmpl.team] ?? null;
    const assigneeId = pickUser(tmpl.team, tmpl.assigneeRole);
    const createdAt = new Date(now.getTime() - Math.random() * 14 * 86400000);
    const updatedAt = new Date(createdAt.getTime() + 3600000);
    const closedAt = tmpl.status === 'CLOSED' ? iso(new Date(updatedAt.getTime() + 7200000)) : null;
    const resolvedAt = ['RESOLVED', 'CLOSED'].includes(tmpl.status)
      ? iso(new Date(updatedAt.getTime() + 3600000))
      : null;

    await pool.request()
      .input('id', sql.VarChar(36), id)
      .input('tenantId', sql.VarChar(36), tenantId)
      .input('title', sql.NVarChar(500), tmpl.title)
      .input('description', sql.NVarChar(4000), `${tmpl.title} — seeded for Lotris Digital Setup UAT.`)
      .input('priority', sql.Int, tmpl.priority)
      .input('status', sql.VarChar(50), tmpl.status)
      .input('teamId', sql.VarChar(36), teamId)
      .input('assigneeId', sql.VarChar(36), assigneeId)
      .input('createdBy', sql.VarChar(36), creator)
      .input('createdAt', sql.DateTime2, iso(createdAt))
      .input('updatedAt', sql.DateTime2, iso(updatedAt))
      .input('closedAt', sql.DateTime2, closedAt)
      .input('resolvedAt', sql.DateTime2, resolvedAt)
      .query(`
        INSERT INTO dbo.Tickets (
          id, tenant_id, title, description, priority, status, team_id, assignee_id,
          created_by, created_at, updated_at, closed_at, resolved_at,
          sla_pickup_breached, sla_resolution_breached
        ) VALUES (
          @id, @tenantId, @title, @description, @priority, @status, @teamId, @assigneeId,
          @createdBy, @createdAt, @updatedAt, @closedAt, @resolvedAt, 0, 0
        )
      `);
  }

  const taskTemplates = [
    { title: 'Quarterly access review — privileged accounts', team: 'IT Security', type: 'MAINTENANCE' },
    { title: 'Update network topology diagram', team: 'Networks', type: 'DOCUMENTATION' },
    { title: 'DR restore drill — core DB', team: 'Database Admin', type: 'DR_BCP' },
    { title: 'Service desk shift handover checklist', team: 'Service Desk & Incident Management', type: 'AD_HOC' },
    { title: 'Release CAB pre-read pack', team: 'IT Project Management', type: 'CHANGE_REQUEST' },
    { title: 'Engineer shadowing — incident bridge', team: 'Incident Manager', type: 'TRAINING' },
    { title: 'KB article: VPN client rollout', team: 'Application Support', type: 'DOCUMENTATION' },
    { title: 'Patch Tuesday validation window', team: 'IT Infustructure', type: 'MAINTENANCE' },
  ];

  for (const tmpl of taskTemplates) {
    const id = randomUUID();
    const teamId = teamIds[tmpl.team] ?? null;
    const createdBy = pickUser(tmpl.team, 'lead') ?? creator;
    const createdAt = iso(new Date(now.getTime() - Math.random() * 7 * 86400000));
    await pool.request()
      .input('id', sql.VarChar(36), id)
      .input('tenantId', sql.VarChar(36), tenantId)
      .input('teamId', sql.VarChar(36), teamId)
      .input('title', sql.NVarChar(500), tmpl.title)
      .input('description', sql.NVarChar(4000), `${tmpl.title} (seed task)`)
      .input('taskType', sql.VarChar(50), tmpl.type)
      .input('createdBy', sql.VarChar(36), createdBy)
      .input('createdAt', sql.DateTime2, createdAt)
      .input('updatedAt', sql.DateTime2, createdAt)
      .query(`
        INSERT INTO dbo.Tasks (
          id, tenant_id, team_id, title, description, task_type, source, status, created_by, created_at, updated_at
        ) VALUES (
          @id, @tenantId, @teamId, @title, @description, @taskType, 'LEAD_ASSIGNED', 'OPEN', @createdBy, @createdAt, @updatedAt
        )
      `);
  }

  console.log(`✓ Seeded ${ticketTemplates.length} tickets and ${taskTemplates.length} tasks`);
}

async function main() {
  console.log('\n📋 Lotris Digital Setup — TEAMLIST.xlsx ingest');
  console.log(`   API: ${API_BASE}`);
  console.log(`   Source: ${XLSX_PATH}\n`);

  const people = loadTeamlist();
  const units = [...new Set(people.map((p) => p.unit).filter(Boolean))].sort();
  console.log(`Parsed ${people.length} people across ${units.length} units\n`);

  const pool = await sql.connect(DB);
  let tenant = await findTenant(pool);
  if (tenant) {
    await renameTenant(pool, tenant.id);
    console.log(`✓ Using tenant ${tenant.id} → "${TENANT_NAME}"`);
  }

  const token = await ensureBootstrapAdmin(pool, people, tenant);
  tenant = await findTenant(pool);
  if (!tenant) throw new Error('Tenant not found after bootstrap');

  await completeOnboarding(token);
  console.log('✓ Onboarding complete');

  console.log('\nTeams:');
  const teamIds = await ensureTeams(token, units);

  console.log('\nUsers:');
  const userIds = await ensureUsers(token, people, teamIds);

  console.log('\nDemo data:');
  await seedDemoData(pool, tenant.id, teamIds, userIds, people);

  await pool.close();

  console.log('\n' + '─'.repeat(60));
  console.log('Done — Lotris Digital Setup is ready for local testing');
  console.log(`Tenant:   ${TENANT_NAME} (${TENANT_SLUG})`);
  console.log(`Teams:    ${units.length}`);
  console.log(`Users:    ${people.length}`);
  console.log(`Login:    david.quagrain@lotris.com`);
  console.log(`Password: ${DEFAULT_PASSWORD}`);
  console.log(`Web:      http://localhost:3000/login\n`);
}

main().catch((err) => {
  console.error('\n✗ Seed failed:', err.message);
  process.exit(1);
});
