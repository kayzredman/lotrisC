import { mssqlTable, varchar, int, bit, datetime2, nvarchar, index } from 'drizzle-orm/mssql-core';

export const tenants = mssqlTable(
  'Tenants',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    clerkOrgId: varchar('clerk_org_id', { length: 255 }).notNull().unique(),
    name: nvarchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    isActive: bit('is_active').notNull().default(1),
    onboardingCompletedAt: datetime2('onboarding_completed_at', { precision: 3 }),
    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
    updatedAt: datetime2('updated_at', { precision: 3 }).notNull(),
  },
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
