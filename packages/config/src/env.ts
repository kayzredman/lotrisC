import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Databases
  DATABASE_URL_MSSQL: z.string().min(1, 'DATABASE_URL_MSSQL is required'),
  DATABASE_URL_POSTGRES: z.string().min(1, 'DATABASE_URL_POSTGRES is required'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // Clerk
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_WEBHOOK_SECRET: z.string().min(1, 'CLERK_WEBHOOK_SECRET is required'),

  // Internal JWT — must be ≥ 32 chars
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // API
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  // Public app URL (used in notification email links)
  APP_BASE_URL: z.string().url().optional().default('http://localhost:3000'),

  // Outbound email (Nodemailer)
  EMAIL_FROM: z.string().optional().default('it-support@lotris.io'),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().int().optional().default(587),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_SECURE: z.string().optional().default('false'),

  // Email intake — IMAP polling (optional; intake disabled if not set)
  INTAKE_EMAIL_HOST: z.string().optional(),
  INTAKE_EMAIL_PORT: z.coerce.number().int().optional().default(993),
  INTAKE_EMAIL_USER: z.string().optional(),
  INTAKE_EMAIL_PASS: z.string().optional(),
  INTAKE_EMAIL_TLS: z.string().optional().default('true'),

  // Triage team for email intake (UUID of team that receives emailed tickets)
  TRIAGE_TENANT_ID: z.string().optional(),
  TRIAGE_TEAM_ID: z.string().optional(),

  // System user ID — used as createdBy for externally-sourced tickets
  INTAKE_SYSTEM_USER_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

/**
 * Returns validated environment variables. Exits the process if validation fails.
 * Call once at startup; subsequent calls return the cached result.
 */
export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('❌  Invalid environment variables:\n');
      for (const [field, errors] of Object.entries(result.error.flatten().fieldErrors)) {
        console.error(`  ${field}: ${(errors as string[]).join(', ')}`);
      }
      process.exit(1);
    }
    _env = result.data;
  }
  return _env;
}
