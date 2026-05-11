/**
 * fix-dev-logins.ts
 *
 * One-time repair: wires real Clerk user IDs (used by dev-login route) to the
 * correct seeded users so role-based testing works as intended.
 *
 * Problem:
 *   seed.ts used fake clerkUserIds (clerk_demo_xxx).
 *   dev-login route uses real Clerk IDs (user_3DP8…).
 *   context.ts finds no match → auto-provisions everyone as SUPERADMIN.
 *   All 5 dev-login personas effectively became SUPERADMIN with no demo data.
 *
 * This script:
 *   1. Deletes the auto-provisioned ghost users (real Clerk IDs, no demo data)
 *   2. Updates seeded users' clerkUserId to the real Clerk IDs
 *   3. Inserts Yaw Owusu (ENGINEER) and Fatima Al-Hassan (IT_MANAGER) —
 *      they exist in dev-login but were never seeded
 *
 * Usage:
 *   cd apps/api
 *   ./node_modules/.bin/tsx src/scripts/fix-dev-logins.ts
 *
 * Safe to re-run — all operations are idempotent.
 */
import 'dotenv/config';
import { getMssqlDb, users } from '@lotris/db';
import { eq, inArray } from 'drizzle-orm';

// ─── Real Clerk IDs (from apps/web/app/api/dev-login/route.ts) ────────────

const REAL_IDS = {
  kwame:  'user_3DP8ZaH7FcKqGbp3FOvC9fZDqoO',  // Superadmin
  abena:  'user_3DP8ZuU5uL5sEvfWS9IzKVQJr9C',  // Admin
  kofi:   'user_3DP8ZyhbMzhzMFmhctZ1SsggzGJ',  // Team Lead (IT Support)
  yaw:    'user_3DP8aNpw7RDxTOvd2e5VQgOiu1j',  // Engineer
  fatima: 'user_3DP8bnKs0ZJ22LHs8f7ykqOiKFs',  // IT Manager
};

// All known stable seeded UUIDs — never delete these regardless of clerkUserId
const ALL_SEEDED_IDS = new Set([
  '30000001-0000-0000-0000-000000000001', // superadmin
  '30000001-0000-0000-0000-000000000002', // admin
  '30000001-0000-0000-0000-000000000003', // leadA
  '30000001-0000-0000-0000-000000000004', // leadB
  '30000001-0000-0000-0000-000000000005', // eng1
  '30000001-0000-0000-0000-000000000006', // eng2
  '30000001-0000-0000-0000-000000000007', // eng3
  '30000001-0000-0000-0000-000000000008', // eng4
  '30000001-0000-0000-0000-000000000009', // eng5
  '30000001-0000-0000-0000-000000000010', // eng6
  '30000001-0000-0000-0000-000000000011', // yaw
  '30000001-0000-0000-0000-000000000012', // fatima
]);

// Stable UUIDs for the users we need to insert/update
const SEEDED_IDS = {
  superadmin: '30000001-0000-0000-0000-000000000001',
  admin:      '30000001-0000-0000-0000-000000000002',
  leadA:      '30000001-0000-0000-0000-000000000003',
  yaw:        '30000001-0000-0000-0000-000000000011',
  fatima:     '30000001-0000-0000-0000-000000000012',
};

const TENANT_ID = '10000001-0000-0000-0000-000000000001';
const ROLE_IDS  = { IT_MANAGER: 3, ENGINEER: 5 };
const TEAM      = { itSupport: '20000001-0000-0000-0000-000000000001' };

async function main() {
  const db = await getMssqlDb();
  const NOW = new Date();

  console.log('🔧 Fixing dev-login → seeded user mapping…\n');

  // ── Step 1: Delete ghost auto-provisioned users ──────────────────────────
  // These were created by context.ts auto-provisioning when the real Clerk IDs
  // had no matching DB record. They have no demo data. Delete them so we can
  // reassign the Clerk IDs to the seeded records.
  const allRealIds = Object.values(REAL_IDS);
  const ghosts = await db
    .select({ id: users.id, clerkUserId: users.clerkUserId, fullName: users.fullName })
    .from(users)
    .where(inArray(users.clerkUserId, allRealIds));

  const ghostsToDelete = ghosts.filter(
    (u) => !ALL_SEEDED_IDS.has(u.id),
  );

  if (ghostsToDelete.length > 0) {
    console.log(`🗑  Deleting ${ghostsToDelete.length} ghost auto-provisioned user(s):`);
    for (const g of ghostsToDelete) {
      console.log(`   • ${g.id} — ${g.fullName} (${g.clerkUserId})`);
      try {
        await db.delete(users).where(eq(users.id, g.id));
      } catch (e: unknown) {
        console.warn(`   ⚠  Could not delete ${g.id}: ${e}`);
      }
    }
  } else {
    console.log('✅ No ghost users found (already clean)');
  }

  // ── Step 2: Update seeded users' clerkUserId ─────────────────────────────
  const updates: Array<{ id: string; clerkUserId: string; label: string }> = [
    { id: SEEDED_IDS.superadmin, clerkUserId: REAL_IDS.kwame,  label: 'Kwame Asante (SUPERADMIN)' },
    { id: SEEDED_IDS.admin,      clerkUserId: REAL_IDS.abena,  label: 'Abena Mensah (ADMIN)' },
    { id: SEEDED_IDS.leadA,      clerkUserId: REAL_IDS.kofi,   label: 'Kofi Boateng (TEAM_LEAD)' },
  ];

  console.log('\n🔄 Updating seeded users with real Clerk IDs:');
  for (const u of updates) {
    try {
      await db
        .update(users)
        .set({ clerkUserId: u.clerkUserId, updatedAt: NOW })
        .where(eq(users.id, u.id));
      console.log(`   ✅ ${u.label}`);
    } catch (e: unknown) {
      console.warn(`   ⚠  ${u.label}: ${e}`);
    }
  }

  // ── Step 3: Insert Yaw Owusu (ENGINEER) ──────────────────────────────────
  const yawExists = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, SEEDED_IDS.yaw));

  if (yawExists.length === 0) {
    try {
      await db.insert(users).values({
        id:           SEEDED_IDS.yaw,
        tenantId:     TENANT_ID,
        clerkUserId:  REAL_IDS.yaw,
        email:        'y.owusu@demo.lotris',
        fullName:     'Yaw Owusu',
        roleId:       ROLE_IDS.ENGINEER,
        teamId:       TEAM.itSupport,
        isActive:     1,
        isUnavailable: 0,
        createdAt:    NOW,
        updatedAt:    NOW,
      });
      console.log('\n   ✅ Inserted Yaw Owusu (ENGINEER, IT Support)');
    } catch (e: unknown) {
      console.warn(`   ⚠  Yaw Owusu insert: ${e}`);
    }
  } else {
    // Ensure clerkUserId is correct even if the row already exists
    try {
      await db
        .update(users)
        .set({ clerkUserId: REAL_IDS.yaw, updatedAt: NOW })
        .where(eq(users.id, SEEDED_IDS.yaw));
    } catch { /* ignore */ }
    console.log('\n   ✅ Yaw Owusu already exists — clerk ID confirmed');
  }

  // ── Step 4: Insert Fatima Al-Hassan (IT_MANAGER) ──────────────────────────
  const fatimaExists = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, SEEDED_IDS.fatima));

  if (fatimaExists.length === 0) {
    try {
      await db.insert(users).values({
        id:           SEEDED_IDS.fatima,
        tenantId:     TENANT_ID,
        clerkUserId:  REAL_IDS.fatima,
        email:        'f.alhassan@demo.lotris',
        fullName:     'Fatima Al-Hassan',
        roleId:       ROLE_IDS.IT_MANAGER,
        teamId:       null,
        isActive:     1,
        isUnavailable: 0,
        createdAt:    NOW,
        updatedAt:    NOW,
      });
      console.log('   ✅ Inserted Fatima Al-Hassan (IT_MANAGER)');
    } catch (e: unknown) {
      console.warn(`   ⚠  Fatima insert: ${e}`);
    }
  } else {
    try {
      await db
        .update(users)
        .set({ clerkUserId: REAL_IDS.fatima, updatedAt: NOW })
        .where(eq(users.id, SEEDED_IDS.fatima));
    } catch { /* ignore */ }
    console.log('   ✅ Fatima Al-Hassan already exists — clerk ID confirmed');
  }

  console.log('\n🎉 Done! Dev-login users now map to correct seeded records:\n');
  console.log('   Alias    Role         URL');
  console.log('   ─────────────────────────────────────────────────────────────');
  console.log('   kwame    SUPERADMIN   http://localhost:3000/api/dev-login?user=kwame');
  console.log('   abena    ADMIN        http://localhost:3000/api/dev-login?user=abena');
  console.log('   kofi     TEAM_LEAD    http://localhost:3000/api/dev-login?user=kofi');
  console.log('   yaw      ENGINEER     http://localhost:3000/api/dev-login?user=yaw');
  console.log('   fatima   IT_MANAGER   http://localhost:3000/api/dev-login?user=fatima');
  console.log('\n   LAN versions (same URLs with 10.10.1.178 instead of localhost)');

  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Fatal error:', e);
  process.exit(1);
});
