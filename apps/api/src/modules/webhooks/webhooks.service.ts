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
   * Provision a new user in MSSQL on first Clerk sign-up.
   * Default role: ENGINEER (id=5). Admins assign roles post-provisioning.
   */
  async onUserCreated(data: Record<string, unknown>) {
    const clerkUserId = data['id'] as string;
    const email = (data['email_addresses'] as Array<{ email_address: string }>)[0]?.email_address;
    const firstName = (data['first_name'] as string) ?? '';
    const lastName = (data['last_name'] as string) ?? '';
    const orgId = data['organization_id'] as string | undefined;

    if (!email || !orgId) {
      this.logger.warn(`Skipping user.created — missing email or org: clerkUserId=${clerkUserId}`);
      return;
    }

    const db = await getMssqlDb();

    // Find tenant by Clerk org ID
    const tenantRows = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.clerkOrgId, orgId))
      .limit(1);

    if (!tenantRows[0]) {
      this.logger.warn(`Tenant not found for Clerk org ${orgId} — cannot provision user ${clerkUserId}`);
      return;
    }

    const tenantId = tenantRows[0].id;
    const now = new Date();

    await db.insert(users).values({
      id: uuidv4(),
      tenantId,
      clerkUserId,
      email,
      fullName: `${firstName} ${lastName}`.trim() || email,
      roleId: 5, // ENGINEER — default role; admin assigns correct role post-provisioning
      teamId: null,
      isActive: 1,
      isUnavailable: 0,
      createdAt: now,
      updatedAt: now,
    });

    this.logger.log(`User provisioned: ${email} in tenant ${tenantId}`);
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
