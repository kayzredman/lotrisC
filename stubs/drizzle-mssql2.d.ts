/**
 * Type stubs for drizzle-orm/mssql2.
 * drizzle-orm@0.32 has no released MSSQL driver adapter.
 * Stubs satisfy TypeScript compilation only.
 */
declare module 'drizzle-orm/mssql2' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnySchema = Record<string, any>;

  interface MssqlDb {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select(fields?: any): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    insert(table: any): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update(table: any): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete(table: any): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute(query: any): any;
  }

  export function drizzle(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connection: any,
    config?: { schema?: AnySchema; logger?: boolean },
  ): MssqlDb;
}
