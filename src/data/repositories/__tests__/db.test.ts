/**
 * 数据库层集成测试（N-4，CI 上跑 vitest）
 *
 * 用 sql.js 内存库 + 线上同款 SCHEMA_SQL 建表，直接测真实 Repository 的 SQL 口径。
 */
import { describe, test, expect, beforeEach } from 'vitest';
import initSqlJs, { type Database } from 'sql.js';
import type { DatabaseAdapter } from '@/data/database/DatabaseAdapter';
import { SCHEMA_SQL } from '@/data/database/schema';
import { TransactionRepository } from '@/data/repositories/TransactionRepository';
import { AccountRepository } from '@/data/repositories/AccountRepository';
import { CategoryRepository } from '@/data/repositories/CategoryRepository';
import { StatsRepository } from '@/data/repositories/StatsRepository';
import { BudgetRepository } from '@/data/repositories/BudgetRepository';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';
import { nowUTC } from '@/core/datetime';

/** 内存适配器：接口与 SqlJsAdapter 一致，行转驼峰，供仓库直接使用 */
class MemoryAdapter implements DatabaseAdapter {
  constructor(private db: Database) {}

  async initialize(): Promise<void> { this.db.run(SCHEMA_SQL); }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params as never);
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) rows.push(this.toCamel(stmt.getAsObject() as Record<string, unknown>));
      return rows as T[];
    } finally {
      stmt.free();
    }
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    this.db.run(sql, params as never);
  }

  async executeReturning(sql: string, params: unknown[] = []): Promise<number> {
    this.db.run(sql, params as never);
    const r = this.db.exec('SELECT last_insert_rowid() as id');
    return Number(r[0]?.values?.[0]?.[0] ?? 0);
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> { return fn(); }

  async close(): Promise<void> { this.db.close(); }

  private toCamel(row: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) out[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
    return out;
  }
}

let db: DatabaseAdapter;
let txRepo: TransactionRepository;
let accRepo: AccountRepository;
let catRepo: CategoryRepository;
let statsRepo: StatsRepository;
let budgetRepo: BudgetRepository;

beforeEach(async () => {
  const SQL = await initSqlJs();
  const raw = new SQL.Database();
  db = new MemoryAdapter(raw);
  await db.initialize();
  // 账本主记录（外键约束需要）
  const now = nowUTC();
  await db.execute(
    'INSERT INTO ledgers (id, name, type, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [DEFAULT_LEDGER_ID, '默认账本', 'personal', 'CNY', now, now],
  );
  txRepo = new TransactionRepository(db);
  accRepo = new AccountRepository(db);
  catRepo = new CategoryRepository(db);
  statsRepo = new StatsRepository(db);
  budgetRepo = new BudgetRepository(db);
});

describe('AccountRepository.getBalance', () => {
  test('期初 + 收入 - 支出 ± 转账双向', async () => {
    const a = await accRepo.create({ ledgerId: DEFAULT_LEDGER_ID, name: '现金', type: 'cash', initialBalanceInYuan: 100 });
    const b = await accRepo.create({ ledgerId: DEFAULT_LEDGER_ID, name: '银行卡', type: 'bank', initialBalanceInYuan: 0 });

    await txRepo.create({ ledgerId: DEFAULT_LEDGER_ID, type: 'income', amountInYuan: 50, accountId: a.id, date: '2026-09-01' });
    await txRepo.create({ ledgerId: DEFAULT_LEDGER_ID, type: 'expense', amountInYuan: 20, accountId: a.id, date: '2026-09-02' });
    await txRepo.create({ ledgerId: DEFAULT_LEDGER_ID, type: 'transfer', amountInYuan: 30, accountId: a.id, toAccountId: b.id, date: '2026-09-03' });

    expect(await accRepo.getBalance(a.id)).toBe(10000 + 5000 - 2000 - 3000);
    expect(await accRepo.getBalance(b.id)).toBe(3000);
  });

  test('信用卡可为负余额', async () => {
    const c = await accRepo.create({ ledgerId: DEFAULT_LEDGER_ID, name: '信用卡', type: 'credit', initialBalanceInYuan: 0 });
    await txRepo.create({ ledgerId: DEFAULT_LEDGER_ID, type: 'expense', amountInYuan: 88, accountId: c.id, date: '2026-09-05' });
    expect(await accRepo.getBalance(c.id)).toBe(-8800);
  });

  test('软删除的交易不计入余额', async () => {
    const a = await accRepo.create({ ledgerId: DEFAULT_LEDGER_ID, name: '现金', type: 'cash', initialBalanceInYuan: 0 });
    const tx = await txRepo.create({ ledgerId: DEFAULT_LEDGER_ID, type: 'expense', amountInYuan: 10, accountId: a.id, date: '2026-09-01' });
    expect(await accRepo.getBalance(a.id)).toBe(-1000);
    await txRepo.delete(tx.id);
    expect(await accRepo.getBalance(a.id)).toBe(0);
    await txRepo.restore(tx.id);
    expect(await accRepo.getBalance(a.id)).toBe(-1000);
  });
});

describe('StatsRepository.getCategoryStats', () => {
  test('二级分类归并到父分类', async () => {
    const parent = await catRepo.create({ ledgerId: DEFAULT_LEDGER_ID, name: '餐饮', type: 'expense' });
    const child1 = await catRepo.create({ ledgerId: DEFAULT_LEDGER_ID, name: '夜宵', type: 'expense', parentId: parent.id });
    const child2 = await catRepo.create({ ledgerId: DEFAULT_LEDGER_ID, name: '外卖', type: 'expense', parentId: parent.id });
    const acc = await accRepo.create({ ledgerId: DEFAULT_LEDGER_ID, name: '现金', type: 'cash' });

    await txRepo.create({ ledgerId: DEFAULT_LEDGER_ID, type: 'expense', amountInYuan: 30, accountId: acc.id, categoryId: child1.id, date: '2026-09-06' });
    await txRepo.create({ ledgerId: DEFAULT_LEDGER_ID, type: 'expense', amountInYuan: 20, accountId: acc.id, categoryId: child2.id, date: '2026-09-07' });

    const stats = await statsRepo.getCategoryStats('2026-09', 'expense');
    const merged = stats.find((s) => s.categoryId === parent.id);
    expect(merged).toBeTruthy();
    expect(merged!.amount).toBe(5000);
    // 子分类不单独出现
    expect(stats.some((s) => s.categoryId === child1.id || s.categoryId === child2.id)).toBe(false);
  });
});

describe('BudgetRepository.getMonthSpent', () => {
  test('只统计支出且按月过滤', async () => {
    const acc = await accRepo.create({ ledgerId: DEFAULT_LEDGER_ID, name: '现金', type: 'cash' });
    await txRepo.create({ ledgerId: DEFAULT_LEDGER_ID, type: 'expense', amountInYuan: 12, accountId: acc.id, date: '2026-09-10' });
    await txRepo.create({ ledgerId: DEFAULT_LEDGER_ID, type: 'income', amountInYuan: 99, accountId: acc.id, date: '2026-09-11' });
    await txRepo.create({ ledgerId: DEFAULT_LEDGER_ID, type: 'expense', amountInYuan: 77, accountId: acc.id, date: '2026-08-31' });

    expect(await budgetRepo.getMonthSpent('2026-09')).toBe(1200);
  });
});

describe('TransactionRepository.list 筛选', () => {
  test('type / keyword / tags / 日期区间', async () => {
    const acc = await accRepo.create({ ledgerId: DEFAULT_LEDGER_ID, name: '现金', type: 'cash' });
    const cat = await catRepo.create({ ledgerId: DEFAULT_LEDGER_ID, name: '交通', type: 'expense' });

    await txRepo.create({ ledgerId: DEFAULT_LEDGER_ID, type: 'expense', amountInYuan: 3, accountId: acc.id, categoryId: cat.id, note: '地铁', tags: ['通勤'], date: '2026-09-01' });
    await txRepo.create({ ledgerId: DEFAULT_LEDGER_ID, type: 'income', amountInYuan: 1000, accountId: acc.id, note: '工资', date: '2026-09-05' });
    await txRepo.create({ ledgerId: DEFAULT_LEDGER_ID, type: 'expense', amountInYuan: 8, accountId: acc.id, categoryId: cat.id, note: '打车', date: '2026-10-02' });

    const expenses = await txRepo.list({ ledgerId: DEFAULT_LEDGER_ID, type: 'expense' });
    expect(expenses).toHaveLength(2);

    const keyword = await txRepo.list({ ledgerId: DEFAULT_LEDGER_ID, keyword: '地铁' });
    expect(keyword).toHaveLength(1);

    const tag = await txRepo.list({ ledgerId: DEFAULT_LEDGER_ID, tags: ['通勤'] });
    expect(tag).toHaveLength(1);

    const range = await txRepo.list({ ledgerId: DEFAULT_LEDGER_ID, dateFrom: '2026-09-01', dateTo: '2026-09-30' });
    expect(range).toHaveLength(2);
  });
});
