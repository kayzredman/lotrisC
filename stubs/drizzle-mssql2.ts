/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Runtime shim for drizzle-orm/mssql2.
 * Implements a thin query builder that serializes drizzle-orm SQL chunks
 * into parameterized MSSQL queries and executes them via the 'mssql' pool.
 *
 * Supported operations:
 *   db.select([fields]).from(table).where(...).orderBy(...).limit(n).offset(n)
 *   db.select([fields]).from(table).innerJoin / .leftJoin
 *   db.insert(table).values({...} | [...])
 *   db.update(table).set({...}).where(...)
 *   db.delete(table).where(...)
 *   db.execute(sql`...`)
 */

import sql_pkg from 'mssql';

// ── SQL Serializer ────────────────────────────────────────────────────────────

/**
 * Recursively serialize drizzle-orm SQL queryChunks to a SQL string.
 * Parameters are collected into `params[]` and referenced as @p1, @p2, ...
 */
function serializeChunks(chunks: any[], params: any[]): string {
  if (!chunks || !Array.isArray(chunks)) return '';
  let result = '';

  for (const chunk of chunks) {
    if (chunk === undefined) {
      continue;
    } else if (chunk === null) {
      // NULL literal — use a typed NULL parameter
      params.push(null);
      result += `@p${params.length}`;
    } else if (Array.isArray(chunk)) {
      // inArray value list: [a, b, c] → (@p1, @p2, @p3)
      const parts = chunk.map((v: any) => {
        params.push(v);
        return `@p${params.length}`;
      });
      result += `(${parts.join(', ')})`;
    } else if (typeof chunk === 'object' && chunk.value !== undefined) {
      // Raw SQL string fragment
      result += chunk.value[0] ?? '';
    } else if (typeof chunk === 'object' && chunk.columnName !== undefined) {
      // Column reference — qualify with table name if present
      if (chunk._tableName) {
        result += `[${chunk._tableName}].[${chunk.columnName}]`;
      } else {
        result += `[${chunk.columnName}]`;
      }
    } else if (typeof chunk === 'object' && chunk.queryChunks !== undefined) {
      // Nested SQL object — recurse
      result += serializeChunks(chunk.queryChunks, params);
    } else if (
      typeof chunk === 'string' ||
      typeof chunk === 'number' ||
      typeof chunk === 'boolean' ||
      chunk instanceof Date
    ) {
      params.push(chunk);
      result += `@p${params.length}`;
    }
  }

  return result;
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

/** SQL column name → JS field name */
function buildFieldMap(table: any): Record<string, string> {
  const map: Record<string, string> = {};
  if (table?._columns) {
    for (const [fieldName, col] of Object.entries<any>(table._columns)) {
      map[(col as any).columnName] = fieldName;
    }
  }
  return map;
}

/** JS field name → SQL column name */
function buildColMap(table: any): Record<string, string> {
  const map: Record<string, string> = {};
  if (table?._columns) {
    for (const [fieldName, col] of Object.entries<any>(table._columns)) {
      map[fieldName] = (col as any).columnName;
    }
  }
  return map;
}

function mapRow(row: Record<string, any>, fieldMap: Record<string, string>): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    mapped[fieldMap[k] ?? k] = v;
  }
  return mapped;
}

// ── Query executor ────────────────────────────────────────────────────────────

async function runQuery(pool: sql_pkg.ConnectionPool, sqlStr: string, params: any[]): Promise<any[]> {
  const req = pool.request();
  for (let i = 0; i < params.length; i++) {
    const v = params[i];
    const key = `p${i + 1}`;
    if (v === null || v === undefined) {
      req.input(key, sql_pkg.NVarChar, null);
    } else if (v instanceof Date) {
      req.input(key, sql_pkg.DateTime2, v);
    } else if (typeof v === 'boolean') {
      req.input(key, sql_pkg.Bit, v ? 1 : 0);
    } else if (typeof v === 'number' && Number.isInteger(v)) {
      req.input(key, sql_pkg.Int, v);
    } else if (typeof v === 'number') {
      req.input(key, sql_pkg.Decimal, v);
    } else {
      req.input(key, v);
    }
  }
  const result = await req.query(sqlStr);
  return result.recordset;
}

// ── SELECT fields builder ─────────────────────────────────────────────────────

function buildSelectCols(fields?: any): string {
  if (!fields) return '*';
  const parts: string[] = [];
  for (const [alias, expr] of Object.entries<any>(fields)) {
    if (expr?.queryChunks) {
      // Aggregate or expression (e.g. count())
      // These don't use parameters, just serialize directly
      const p: any[] = [];
      parts.push(`${serializeChunks(expr.queryChunks, p)} AS [${alias}]`);
    } else if (expr?.columnName) {
      parts.push(`[${expr.columnName}] AS [${alias}]`);
    }
  }
  return parts.length > 0 ? parts.join(', ') : '*';
}

// ── drizzle() factory ─────────────────────────────────────────────────────────

export function drizzle(pool: sql_pkg.ConnectionPool, _config?: { schema?: any }): any {
  return {
    // ── SELECT ────────────────────────────────────────────────────────────
    select(fields?: any) {
      const state: any = {
        fields,
        table: null as any,
        wheres: [] as any[],
        orders: [] as any[],
        limitN: null as number | null,
        offsetN: null as number | null,
        joins: [] as any[],
        groupByCols: [] as any[],
      };

      const builder: any = {
        from(table: any) { state.table = table; return builder; },
        where(condition: any) { state.wheres.push(condition); return builder; },
        orderBy(...orders: any[]) { state.orders.push(...orders); return builder; },
        limit(n: number) { state.limitN = n; return builder; },
        offset(n: number) { state.offsetN = n; return builder; },
        innerJoin(table: any, condition: any) {
          state.joins.push({ type: 'INNER', table, condition });
          return builder;
        },
        leftJoin(table: any, condition: any) {
          state.joins.push({ type: 'LEFT', table, condition });
          return builder;
        },
        groupBy(...cols: any[]) { state.groupByCols.push(...cols); return builder; },
        then(resolve: any, reject: any) { return _exec().then(resolve, reject); },
      };

      async function _exec(): Promise<any[]> {
        const table = state.table;
        const tableName = table._tableName;
        const params: any[] = [];
        const colsSql = buildSelectCols(state.fields);

        let q = `SELECT ${colsSql} FROM [${tableName}]`;

        for (const join of state.joins) {
          const cond = serializeChunks(join.condition?.queryChunks ?? [], params);
          q += ` ${join.type} JOIN [${join.table._tableName}] ON ${cond}`;
        }

        if (state.wheres.length > 0) {
          const parts = state.wheres.map((w: any) =>
            w?.queryChunks ? serializeChunks(w.queryChunks, params) : '1=1'
          );
          q += ` WHERE ${parts.join(' AND ')}`;
        }

        if (state.groupByCols.length > 0) {
          const gParts = state.groupByCols
            .map((c: any) =>
              c?.queryChunks ? serializeChunks(c.queryChunks, params) :
              c?.columnName ? `[${c.columnName}]` : ''
            )
            .filter(Boolean);
          if (gParts.length > 0) q += ` GROUP BY ${gParts.join(', ')}`;
        }

        if (state.orders.length > 0) {
          const oParts = state.orders
            .map((o: any) => o?.queryChunks ? serializeChunks(o.queryChunks, params) : '')
            .filter(Boolean);
          if (oParts.length > 0) q += ` ORDER BY ${oParts.join(', ')}`;
        }

        if (state.limitN !== null) {
          // MSSQL pagination requires ORDER BY
          if (state.orders.length === 0 && state.groupByCols.length === 0) {
            q += ` ORDER BY (SELECT NULL)`;
          }
          q += ` OFFSET ${state.offsetN ?? 0} ROWS FETCH NEXT ${state.limitN} ROWS ONLY`;
        }

        const rows = await runQuery(pool, q, params);
        const fieldMap = buildFieldMap(table);

        if (state.fields) {
          // Named select fields — alias is already set by AS clause
          // Map SQL aliases (lowercased by MSSQL) back to the JS keys
          return rows.map((row: any) => {
            const mapped: Record<string, any> = {};
            for (const [k, v] of Object.entries(row)) {
              // Alias keys match the drizzle field names (case-insensitive)
              const found = Object.keys(state.fields).find(
                (alias) => alias.toLowerCase() === k.toLowerCase()
              );
              mapped[found ?? k] = v;
            }
            return mapped;
          });
        }

        return rows.map((row: any) => mapRow(row, fieldMap));
      }

      return builder;
    },

    // ── INSERT ────────────────────────────────────────────────────────────
    insert(table: any) {
      const tableName = table._tableName;
      const colMap = buildColMap(table);

      return {
        values(vals: any | any[]) {
          const rows = Array.isArray(vals) ? vals : [vals];

          async function _exec() {
            for (const row of rows) {
              const entries = Object.entries(row).filter(([, v]) => v !== undefined);
              const colNames = entries.map(([k]) => `[${colMap[k] ?? k}]`);
              const params = entries.map(([, v]) => v as any);
              const placeholders = params.map((_, i) => `@p${i + 1}`);
              const q = `INSERT INTO [${tableName}] (${colNames.join(', ')}) VALUES (${placeholders.join(', ')})`;
              await runQuery(pool, q, params);
            }
          }

          return {
            then(resolve: any, reject: any) {
              return _exec().then(resolve, reject);
            },
          };
        },
      };
    },

    // ── UPDATE ────────────────────────────────────────────────────────────
    update(table: any) {
      const tableName = table._tableName;
      const colMap = buildColMap(table);
      const state: any = { setVals: {}, whereCondition: null };

      const builder: any = {
        set(vals: any) { state.setVals = vals; return builder; },
        where(condition: any) { state.whereCondition = condition; return builder; },
        then(resolve: any, reject: any) { return _exec().then(resolve, reject); },
      };

      async function _exec() {
        const params: any[] = [];
        const setClauses = Object.entries(state.setVals)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => {
            params.push(v as any);
            return `[${colMap[k] ?? k}] = @p${params.length}`;
          });

        if (setClauses.length === 0) return;

        let q = `UPDATE [${tableName}] SET ${setClauses.join(', ')}`;
        if (state.whereCondition?.queryChunks) {
          q += ` WHERE ${serializeChunks(state.whereCondition.queryChunks, params)}`;
        }
        await runQuery(pool, q, params);
      }

      return builder;
    },

    // ── DELETE ────────────────────────────────────────────────────────────
    delete(table: any) {
      const tableName = table._tableName;
      const state: any = { whereCondition: null };

      const builder: any = {
        where(condition: any) { state.whereCondition = condition; return builder; },
        then(resolve: any, reject: any) { return _exec().then(resolve, reject); },
      };

      async function _exec() {
        const params: any[] = [];
        let q = `DELETE FROM [${tableName}]`;
        if (state.whereCondition?.queryChunks) {
          q += ` WHERE ${serializeChunks(state.whereCondition.queryChunks, params)}`;
        }
        await runQuery(pool, q, params);
      }

      return builder;
    },

    // ── RAW EXECUTE ───────────────────────────────────────────────────────
    execute(query: any) {
      const params: any[] = [];
      const sqlStr = serializeChunks(query?.queryChunks ?? [], params);
      return runQuery(pool, sqlStr, params);
    },
  };
}
