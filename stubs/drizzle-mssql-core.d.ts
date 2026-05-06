/**
 * Type stubs for drizzle-orm/mssql-core.
 * drizzle-orm@0.32 has no released MSSQL support.
 * These stubs satisfy TypeScript compilation; runtime DB calls use the
 * mssql package directly through the pool in packages/db/src/client/mssql.ts.
 *
 * Column functions intentionally return `any` so that downstream consumers
 * (eq, and, etc. from drizzle-orm) accept the column values without type errors.
 */
declare module 'drizzle-orm/mssql-core' {
  // All column builders return `any` — this is intentional.
  // The real drizzle-orm query helpers expect Column types; by returning `any`
  // we satisfy every overload without needing a full MSSQL column implementation.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type ColAny = any;

  export function varchar(name: string, opts?: { length?: number }): ColAny;
  export function nvarchar(name: string, opts?: { length?: number | 'max' }): ColAny;
  export function int(name: string): ColAny;
  export function bigint(name: string, opts?: { mode?: string }): ColAny;
  export function bit(name: string): ColAny;
  export function decimal(name: string, opts?: { precision?: number; scale?: number }): ColAny;
  export function datetime2(name: string, opts?: { precision?: number }): ColAny;
  export function uniqueIdentifier(name: string): ColAny;

  interface IndexBuilder {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(...columns: any[]): this;
    unique(): this;
  }
  export function index(name: string): IndexBuilder;
  export function uniqueIndex(name: string): IndexBuilder;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function primaryKey(opts: { columns: any[]; name?: string }): unknown;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function mssqlTable<TColumns extends Record<string, any>>(
    name: string,
    columns: TColumns,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extraConfig?: (self: TColumns) => Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): TColumns & { $inferSelect: any; $inferInsert: any };
}
