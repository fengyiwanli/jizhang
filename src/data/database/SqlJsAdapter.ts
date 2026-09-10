/**
 * SQL.js 适配器 (Web 端实现)
 *
 * 使用 sql.js (SQLite WASM) 在浏览器中运行完整 SQLite
 * sql.js 通过 <script> 标签加载 (window.initSqlJs)
 * 遵循文档第 4.2 节表结构定义
 *
 * 约束:
 * - 13.2 第5条: 金额 INTEGER (分)，不可用 float
 * - 13.2 第7条: 软删除 (deleted_at)
 */
import type { DatabaseAdapter } from './DatabaseAdapter';
import { SCHEMA_SQL } from './schema';

/** SQL 建表语句 — 严格遵循文档 4.2 节 */


export class SqlJsAdapter implements DatabaseAdapter {
  private db: SqlJsDatabase | null = null;
  private sqlJs: SqlJsStatic | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;

    // 加载 sql.js (全局 initSqlJs, WASM 从 public/ 加载)
    this.sqlJs = await initSqlJs({
      locateFile: () => '/sql-wasm.wasm',
    });

    this.db = new this.sqlJs.Database();
    this.db.run(SCHEMA_SQL);
  }

  /**
   * 从 ArrayBuffer 加载已有数据库
   */
  async loadFromBuffer(buffer: ArrayBuffer): Promise<void> {
    this.sqlJs = await initSqlJs({
      locateFile: () => '/sql-wasm.wasm',
    });
    this.db = new this.sqlJs.Database(new Uint8Array(buffer));
    // 补齐缺失的表/索引（CREATE IF NOT EXISTS 幂等，不影响已有数据）
    // 旧版本数据库缺 recurring_rules 表，这里补建
    this.db.run(SCHEMA_SQL);
  }

  /**
   * 导出数据库为 ArrayBuffer (用于持久化)
   */
  export(): Uint8Array | null {
    return this.db?.export() ?? null;
  }

  private ensureDb(): SqlJsDatabase {
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    return this.db;
  }

  /** 将行数据转驼峰 */
  private toCamelCase(row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  }

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    const db = this.ensureDb();
    let stmt: SqlJsStatement | null = null;
    try {
      stmt = db.prepare(sql);
      if (params && params.length > 0) {
        stmt.bind(params as unknown[]);
      }
      const results: T[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(this.toCamelCase(row) as unknown as T);
      }
      return results;
    } finally {
      stmt?.free();
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<void> {
    const db = this.ensureDb();
    if (params && params.length > 0) {
      db.run(sql, params as unknown[]);
    } else {
      db.run(sql);
    }
  }

  async executeReturning(sql: string, params?: unknown[]): Promise<number> {
    const db = this.ensureDb();
    if (params && params.length > 0) {
      db.run(sql, params as unknown[]);
    } else {
      db.run(sql);
    }
    // sql.js uses db.exec + lastInsertRowId; run doesn't expose it directly
    // We use a query to get it instead
    const [row] = await this.query<{ lastInsertRowid: number }>(
      'SELECT last_insert_rowid() as "lastInsertRowid"',
    );
    return row?.lastInsertRowid ?? 0;
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const db = this.ensureDb();
    try {
      db.run('BEGIN TRANSACTION');
      const result = await fn();
      db.run('COMMIT');
      return result;
    } catch (e) {
      db.run('ROLLBACK');
      throw e;
    }
  }

  async close(): Promise<void> {
    this.db?.close();
    this.db = null;
  }
}
