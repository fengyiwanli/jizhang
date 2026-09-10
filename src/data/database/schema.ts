/**
 * 数据库建表语句（SQLite / sql.js）
 *
 * 从 SqlJsAdapter 抽出，供测试内存库复用。
 */
export const SCHEMA_SQL = `
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

-- 周期账单规则表 (固定收支)
CREATE TABLE IF NOT EXISTS recurring_rules (
    id          TEXT PRIMARY KEY,
    ledger_id   TEXT NOT NULL REFERENCES ledgers(id),
    type        TEXT NOT NULL CHECK(type IN ('income','expense')),
    amount      INTEGER NOT NULL,
    account_id  TEXT NOT NULL REFERENCES accounts(id),
    category_id TEXT REFERENCES categories(id),
    note        TEXT DEFAULT '',
    frequency   TEXT NOT NULL CHECK(frequency IN ('daily','weekly','monthly','yearly')),
    interval    INTEGER DEFAULT 1,
    next_run    TEXT NOT NULL,
    start_date  TEXT NOT NULL,
    is_active   INTEGER DEFAULT 1,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT
);

-- 预算表 (总预算 + 分类预算)
CREATE TABLE IF NOT EXISTS budgets (
    id          TEXT PRIMARY KEY,
    ledger_id   TEXT NOT NULL REFERENCES ledgers(id),
    year_month  TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id),
    amount      INTEGER NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

-- 设置表 (用户偏好 key-value)
CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT,
    updated_at TEXT NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_tx_ledger_date ON transactions(ledger_id, date);
CREATE INDEX IF NOT EXISTS idx_sync_pending ON sync_log(synced_at) WHERE synced_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cat_ledger ON categories(ledger_id, type);
CREATE INDEX IF NOT EXISTS idx_acc_ledger ON accounts(ledger_id);
CREATE INDEX IF NOT EXISTS idx_recurring_ledger ON recurring_rules(ledger_id);

-- WAL 模式 (更快的并发读写)
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
`;
