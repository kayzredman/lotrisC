import type { Config } from 'drizzle-kit';

export default {
  dialect: 'mssql',
  schema: './src/schemas/mssql',
  out: './migrations/mssql',
} satisfies Config;
