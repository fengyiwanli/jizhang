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

/** SQL 建表语句 — 严格遵循文档 4.2 节 */
const SCHEMA_SQL = `
-- 账本表
CREATE TABLE IF NOT EXISTS ledgers (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    type        TEXT NOT NULL DEFAULT 'personal',
    currency    TEXT DEFAULT 'CNY',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT
);

-- 账户表
CREATE TABLE IF NOT EXISTS accounts (
    id              TEXT PRIMARY KEY,
    ledger_id       TEXT NOT NULL REFERENCES ledgers(id),
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK(type IN ('cash','bank','credit','e-wallet')),
    currency        TEXT DEFAULT 'CNY',
    initial_balance INTEGER DEFAULT 0,
    credit_limit    INTEGER,
    billing_day     INTEGER,
    due_day         INTEGER,
    icon            TEXT,
    sort_order      INTEGER DEFAULT 0,
    is_hidden       INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    deleted_at      TEXT
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    ledger_id   TEXT NOT NULL REFERENCES ledgers(id),
    parent_id   TEXT REFERENCES categories(id),
    name        TEXT NOT NULL,
    type        TEXT NOT NULL CHECK(type IN ('income','expense')),
    icon        TEXT,
    color       TEXT,
    sort_order  INTEGER DEFAULT 0,
    is_system   INTEGER DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT
);

-- 交易表 (核心)
CREATE TABLE IF NOT EXISTS transactions (
    id              TEXT PRIMARY KEY,
    ledger_id       TEXT NOT NULL REFERENCES ledgers(id),
    type            TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
    amount          INTEGER NOT NULL,
    account_id      TEXT NOT NULL REFERENCES accounts(id),
    to_account_id   TEXT REFERENCES accounts(id),
    category_id     TEXT REFERENCES categories(id),
    date            TEXT NOT NULL,
    time            TEXT NOT NULL,
    note            TEXT DEFAULT '',
    tags            TEXT DEFAULT '[]',
    location        TEXT,
    recurring_id    TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    deleted_at      TEXT,
    sync_status     TEXT DEFAULT 'pending',
    client_id       TEXT NOT NULL,
    version         INTEGER DEFAULT 1
);

-- 同步日志表
CREATE TABLE IF NOT EXISTS sync_log (
    id          TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id   TEXT NOT NULL,
    operation   TEXT NOT NULL CHECK(operation IN ('create','update','delete')),
    payload     TEXT NOT NULL,
    client_id   TEXT NOT NULL,
    device_id   TEXT NOT NULL DEFAULT 'web',
    created_at  TEXT NOT NULL,
    synced_at   TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_tx_ledger_date ON transactions(ledger_id, date);
CREATE INDEX IF NOT EXISTS idx_sync_pending ON sync_log(synced_at) WHERE synced_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cat_ledger ON categories(ledger_id, type);
CREATE INDEX IF NOT EXISTS idx_acc_ledger ON accounts(ledger_id);

-- WAL 模式 (更快的并发读写)
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
`;

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
