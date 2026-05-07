/**
 * seed-test-users.mjs
 * ───────────────────
 * Migrates all Lotris demo/test users to real Clerk accounts with @notsgate.com emails.
 *
 * Usage:
 *   node scripts/seed-test-users.mjs
 *
 * What it does:
 *   - SEEDED users (clerk_demo_* IDs): creates real Clerk accounts, updates DB rows in-place
 *   - @lotristest.com users: deletes old Clerk account, recreates with @notsgate.com, updates DB
 *   - Tries to add every user to the Clerk org (notsgate Inc.) — skips gracefully on quota
 *   - Safe to re-run (idempotent)
 */

import { execSync } from 'node:child_process';

const CLERK_SECRET_KEY = 'sk_test_bDrDfT8REpslmZq3MQPBiiGBNSBpdnKh9dITv1daH3';
const CLERK_ORG_ID     = 'org_3DP3A9MOEy6MSinGeD7Fw0YO4J6';
const TENANT_ID        = '10000001-0000-0000-0000-000000000001';
const CLERK_ORG_ROLE   = 'org:member';
const DEFAULT_PASSWORD = 'Lotris@Test2024!';

// ── Full user list ────────────────────────────────────────────────────────────
// dbId: existing DB row UUID to UPDATE in-place (null = new row via MERGE)
// oldClerkId: existing Clerk ID to delete before recreating (null = nothing to delete)
const USERS = [
  // ── Originally seeded with fake clerk_demo_* IDs ──────────────────────────
  {
    dbId: '30000001-0000-0000-0000-000000000001',
    fullName: 'Kwame Asante',
    email: 'kwame.asante@notsgate.com',
    role: 'SUPERADMIN',
    oldClerkId: null, // fake ID — nothing to delete in Clerk
  },
  {
    dbId: '30000001-0000-0000-0000-000000000002',
    fullName: 'Abena Mensah',
    email: 'abena.mensah@notsgate.com',
    role: 'ADMIN',
    oldClerkId: null,
  },
  {
    dbId: '30000001-0000-0000-0000-000000000003',
    fullName: 'Kofi Boateng',
    email: 'kofi.boateng@notsgate.com',
    role: 'TEAM_LEAD',
    oldClerkId: null,
  },
  {
    dbId: '30000001-0000-0000-0000-000000000004',
    fullName: 'Ama Darko',
    email: 'ama.darko@notsgate.com',
    role: 'TEAM_LEAD',
    oldClerkId: null,
  },
  {
    dbId: '30000001-0000-0000-0000-000000000005',
    fullName: 'Yaw Owusu',
    email: 'yaw.owusu@notsgate.com',
    role: 'ENGINEER',
    oldClerkId: null,
  },
  {
    dbId: '30000001-0000-0000-0000-000000000006',
    fullName: 'Akosua Appiah',
    email: 'akosua.appiah@notsgate.com',
    role: 'ENGINEER',
    oldClerkId: null,
  },
  {
    dbId: '30000001-0000-0000-0000-000000000007',
    fullName: 'Nana Kusi',
    email: 'nana.kusi@notsgate.com',
    role: 'ENGINEER',
    oldClerkId: null,
  },
  {
    dbId: '30000001-0000-0000-0000-000000000008',
    fullName: 'Efua Amponsah',
    email: 'efua.amponsah@notsgate.com',
    role: 'ENGINEER',
    oldClerkId: null,
  },
  {
    dbId: '30000001-0000-0000-0000-000000000009',
    fullName: 'Fiifi Quansah',
    email: 'fiifi.quansah@notsgate.com',
    role: 'ENGINEER',
    oldClerkId: null,
  },
  // ── Previously created with @lotristest.com — delete + recreate ───────────
  {
    dbId: '1155708d-b4cc-4f49-8a20-d033c4ad46b2',
    fullName: 'James Osei',
    email: 'james.osei@notsgate.com',
    role: 'ENGINEER',
    oldClerkId: 'user_3DP7Sx1GLTO5uWjBerTmR5rFv9g',
  },
  {
    dbId: 'b3f447bb-70d3-439c-a14f-1e3a7f356cf6',
    fullName: 'Priya Nair',
    email: 'priya.nair@notsgate.com',
    role: 'ENGINEER',
    oldClerkId: 'user_3DP7TK38dsMDiLgdKlsVd7UHOeZ',
  },
  {
    dbId: '3d16462b-c081-4cb1-bc65-f9277895b39f',
    fullName: 'Marcus Webb',
    email: 'marcus.webb@notsgate.com',
    role: 'TEAM_LEAD',
    oldClerkId: 'user_3DP7TVzanNK0zlBYztkDVzAgU7T',
  },
  {
    dbId: 'a2577b6b-8fbc-4a80-9333-dd8c7a51b9ac',
    fullName: 'Fatima Al-Hassan',
    email: 'fatima.alhassan@notsgate.com',
    role: 'IT_MANAGER',
    oldClerkId: 'user_3DP7TaC4oZJfxac30Kes33WXwI2',
  },
  {
    dbId: '24df1489-4e4c-47e5-8775-eed5686257d8',
    fullName: 'Lena Becker',
    email: 'lena.becker@notsgate.com',
    role: 'ADMIN',
    oldClerkId: 'user_3DP7To1YWeIkpCM0PIMnz3DWKdN',
  },
  {
    dbId: 'e8b234db-2419-405a-befb-971501f33138',
    fullName: 'Tunde Adeyemi',
    email: 'tunde.adeyemi@notsgate.com',
    role: 'EXECUTIVE',
    oldClerkId: 'user_3DP7TxN5I602U6sVD1DK681Lev4',
  },
  {
    dbId: 'f869697b-1436-4ddd-985a-0360d57db83d',
    fullName: 'Sofia Reyes',
    email: 'sofia.reyes@notsgate.com',
    role: 'ENGINEER',
    oldClerkId: 'user_3DP7U9nlfSoBcKhncWnGuirkqJN',
  },
  {
    dbId: '6ba7b633-3814-4900-9eee-a9f4b606a536',
    fullName: 'David Kim',
    email: 'david.kim@notsgate.com',
    role: 'ENGINEER',
    oldClerkId: 'user_3DP7UDIdcbtHhwTHrz8K0JvwPsq',
  },
];

const ROLE_IDS = { SUPERADMIN: 1, ADMIN: 2, IT_MANAGER: 3, TEAM_LEAD: 4, ENGINEER: 5, EXECUTIVE: 6 };

// ── Helpers ───────────────────────────────────────────────────────────────────
async function clerkReq(method, path, body) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw Object.assign(new Error(data.errors?.[0]?.message ?? `Clerk ${res.status}`), { data, status: res.status });
  return data;
}

function sqlExec(query) {
  const escaped = query.replace(/"/g, '\\"');
  execSync(
    `docker exec 53ee834f10e3 /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Lotris@Dev2024!' -C -d lotris -Q "${escaped}"`,
    { stdio: 'pipe' }
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n🔧  Lotris — migrating all users to @notsgate.com`);
  console.log(`   Org: ${CLERK_ORG_ID}  |  Tenant: ${TENANT_ID}\n`);

  for (const user of USERS) {
    const tag = `[${user.fullName}]`;

    // 1. Delete old @lotristest.com Clerk account if present
    if (user.oldClerkId) {
      try {
        await clerkReq('DELETE', `/users/${user.oldClerkId}`);
        console.log(`${tag} 🗑️  Deleted old Clerk account (${user.oldClerkId})`);
      } catch (err) {
        if (err.status === 404) {
          console.log(`${tag} ℹ️  Old account already gone`);
        } else {
          console.error(`${tag} ⚠️  Could not delete old account:`, err.message);
        }
      }
    }

    // 2. Find or create Clerk user with @notsgate.com email
    let clerkUserId;
    try {
      const existing = await clerkReq('GET', `/users?email_address=${encodeURIComponent(user.email)}`);
      if (Array.isArray(existing) && existing.length > 0) {
        clerkUserId = existing[0].id;
        console.log(`${tag} ℹ️  Already in Clerk → ${clerkUserId}`);
      } else {
        const nameParts = user.fullName.split(' ');
        const created = await clerkReq('POST', '/users', {
          email_address: [user.email],
          password: DEFAULT_PASSWORD,
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(' ') || nameParts[0],
          skip_password_checks: true,
        });
        clerkUserId = created.id;
        console.log(`${tag} ✅ Created in Clerk → ${clerkUserId}`);
      }
    } catch (err) {
      console.error(`${tag} ❌ Clerk user creation failed:`, err.message);
      continue;
    }

    // 3. Add to Clerk org (free plan max 5 — skip gracefully on quota)
    try {
      await clerkReq('POST', `/organizations/${CLERK_ORG_ID}/memberships`, {
        user_id: clerkUserId,
        role: CLERK_ORG_ROLE,
      });
      console.log(`${tag} ✅ Added to org`);
    } catch (err) {
      const code = err.data?.errors?.[0]?.code ?? '';
      if (code === 'already_a_member_in_organization' || err.message?.includes('already')) {
        console.log(`${tag} ℹ️  Already in org`);
      } else if (err.message?.includes('quota') || err.message?.includes('exceeded')) {
        console.log(`${tag} ⚠️  Org quota reached — uses personal login path`);
      } else {
        console.error(`${tag} ⚠️  Org membership skipped:`, err.message);
      }
    }

    // 4. Update existing DB row in-place (match by dbId)
    try {
      const roleId = ROLE_IDS[user.role] ?? ROLE_IDS.ENGINEER;
      const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
      const safeName = user.fullName.replace(/'/g, "''");

      sqlExec(
        `UPDATE users SET clerk_user_id = '${clerkUserId}', email = '${user.email}', ` +
        `full_name = '${safeName}', role_id = ${roleId}, is_active = 1, updated_at = '${now}' ` +
        `WHERE id = '${user.dbId}';`
      );
      console.log(`${tag} ✅ DB row updated`);
    } catch (err) {
      console.error(`${tag} ❌ DB update failed:`, err.message);
    }

    console.log('');
  }

  console.log('─'.repeat(60));
  console.log(`Done. All users → @notsgate.com`);
  console.log(`Default password: ${DEFAULT_PASSWORD}`);
  console.log('Sign in at http://localhost:3000\n');
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
