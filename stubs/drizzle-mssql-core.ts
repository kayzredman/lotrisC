/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Runtime shim for drizzle-orm/mssql-core.
 * drizzle-orm@0.32 has no released MSSQL support.
 * This provides real runtime column builders for packages/db/src/schemas/mssql/*.ts
 *
 * Column objects expose { columnName, _fieldName, _tableName } so that
 * drizzle-orm's eq/and/asc/sql etc. generate correct queryChunks,
 * and our drizzle-mssql2 serializer can build SQL strings from them.
 */

function makeCol(columnName: string): any {
  const c: any = { columnName };
  c.primaryKey = () => c;
  c.notNull = () => c;
  c.unique = () => c;
  c.default = (_val: any) => c;
  c.identity = () => c;
  c.references = (_fn: any) => c;
  c.$inferSelect = null;
  c.$inferInsert = null;
  return c;
}

export const varchar = (name: string, _opts?: any): any => makeCol(name);
export const nvarchar = (name: string, _opts?: any): any => makeCol(name);
export const int = (name: string): any => makeCol(name);
export const bigint = (name: string, _opts?: any): any => makeCol(name);
export const bit = (name: string): any => makeCol(name);
export const decimal = (name: string, _opts?: any): any => makeCol(name);
export const datetime2 = (name: string, _opts?: any): any => makeCol(name);
export const uniqueIdentifier = (name: string): any => makeCol(name);

export function mssqlTable(tableName: string, columns: Record<string, any>): any {
  const table: any = { _tableName: tableName, _columns: {} };
  for (const [fieldName, col] of Object.entries(columns)) {
    col._fieldName = fieldName;
    col._tableName = tableName;
    table[fieldName] = col;
    table._columns[fieldName] = col;
  }
  table.$inferSelect = null;
  table.$inferInsert = null;
  return table;
}

export function index(_name: string): any {
  return {
    on: (..._cols: any[]) => ({
      unique: () => ({}),
    }),
  };
}
