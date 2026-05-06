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
