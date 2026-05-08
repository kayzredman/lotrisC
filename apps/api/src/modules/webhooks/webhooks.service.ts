import { Injectable, Logger } from '@nestjs/common';
import { getMssqlDb, tenants, users, eq } from '@lotris/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * JIT (Just-In-Time) user provisioning from Clerk webhook events.
 * When a new user authenticates via Clerk for the first time, this handler
 * creates the corresponding record in MSSQL so auth.service.resolveSession works.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  /**
   * Provision a new user in MSSQL on Clerk sign-up.
   *
   * When the user arrived via an admin invite, `public_metadata` carries
   * `{ tenantId, roleId, teamId, fullName }` set at invitation time.
   * Organic sign-ups fall back to org-lookup + ENGINEER default.
   */
  async onUserCreated(data: Record<string, unknown>) {
    const clerkUserId = data['id'] as string;
    const email = (data['email_addresses'] as Array<{ email_address: string }>)[0]?.email_address;
    const firstName = (data['first_name'] as string) ?? '';
    const lastName = (data['last_name'] as string) ?? '';
    const orgId = data['organization_id'] as string | undefined;

    // Invitation metadata set by admin during invite
    const meta = (data['public_metadata'] as Record<string, unknown> | undefined) ?? {};
    const metaTenantId = meta['tenantId'] as string | undefined;
    const metaRoleId = typeof meta['roleId'] === 'number' ? (meta['roleId'] as number) : undefined;
    const metaTeamId = (meta['teamId'] as string | null | undefined) ?? null;
    const metaFullName = (meta['fullName'] as string | undefined);

    if (!email) {
      this.logger.warn(`Skipping user.created — missing email: clerkUserId=${clerkUserId}`);
      return;
    }

    const db = await getMssqlDb();

    // Resolve tenantId — prefer invite metadata, fall back to Clerk org lookup
    let tenantId: string | undefined = metaTenantId;
    if (!tenantId) {
      if (!orgId) {
        this.logger.warn(`Skipping user.created — no tenant metadata and no org: clerkUserId=${clerkUserId}`);
        return;
      }
      const tenantRows = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.clerkOrgId, orgId))
        .limit(1);

      if (!tenantRows[0]) {
        this.logger.warn(`Tenant not found for Clerk org ${orgId} — cannot provision user ${clerkUserId}`);
        return;
      }
      tenantId = tenantRows[0].id;
    }

    // Guard against duplicate provisioning
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (existing[0]) {
      this.logger.warn(`User already provisioned: clerkUserId=${clerkUserId}`);
      return;
    }

    const fullName = metaFullName || `${firstName} ${lastName}`.trim() || email;
    const roleId = metaRoleId ?? 5; // Default: ENGINEER
    const now = new Date();

    await db.insert(users).values({
      id: uuidv4(),
      tenantId,
      clerkUserId,
      email,
      fullName,
      roleId,
      teamId: metaTeamId,
      isActive: 1,
      isUnavailable: 0,
      createdAt: now,
      updatedAt: now,
    });

    this.logger.log(`User provisioned: ${email} | tenant=${tenantId} | role=${roleId} | team=${metaTeamId ?? 'none'}`);
  }

  async onUserUpdated(data: Record<string, unknown>) {
    const clerkUserId = data['id'] as string;
    const email = (data['email_addresses'] as Array<{ email_address: string }>)[0]?.email_address;
    const firstName = (data['first_name'] as string) ?? '';
    const lastName = (data['last_name'] as string) ?? '';

    if (!email) return;

    const db = await getMssqlDb();
    await db
      .update(users)
      .set({
        email,
        fullName: `${firstName} ${lastName}`.trim() || email,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, clerkUserId));
  }

  /**
   * Create a Tenant record when a Clerk org is created.
   */
  async onOrgCreated(data: Record<string, unknown>) {
    const clerkOrgId = data['id'] as string;
    const name = (data['name'] as string) ?? 'Unnamed Org';
    const slug = (data['slug'] as string) ?? clerkOrgId;

    const db = await getMssqlDb();
    const now = new Date();

    await db.insert(tenants).values({
      id: uuidv4(),
      clerkOrgId,
      name,
      slug,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    });

    this.logger.log(`Tenant provisioned: ${name} (${clerkOrgId})`);
  }

  async onMembershipCreated(data: Record<string, unknown>) {
    // When a user is added to an org after initial sign-up, provision them if not already in MSSQL
    const clerkUserId = (data['public_user_data'] as Record<string, string>)?.['user_id'];
    const clerkOrgId = (data['organization'] as Record<string, string>)?.['id'];

    if (!clerkUserId || !clerkOrgId) return;

    const db = await getMssqlDb();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (!existing[0]) {
      this.logger.log(`Membership created for unprovisioned user ${clerkUserId} — will provision on next login`);
    }
  }
}
