/**
 * 应用初始化模块
 *
 * 统一管理数据库初始化、种子数据安装和 Repository 创建
 */
import { getDatabase, persistDatabase } from './database/context';
import { installSeed, isSeedInstalled } from './seed';
import { createTransactionRepository } from './repositories/TransactionRepository';
import { CategoryRepository } from './repositories/CategoryRepository';
import { AccountRepository } from './repositories/AccountRepository';
import { StatsRepository } from './repositories/StatsRepository';
import { RecurringRepository, advanceNextRun } from './repositories/RecurringRepository';
import { BudgetRepository } from './repositories/BudgetRepository';
import { SettingsRepository } from './repositories/SettingsRepository';
import type { TransactionRepository } from './repositories/TransactionRepository';
import type { DatabaseAdapter } from './database/DatabaseAdapter';
import { todayLocal } from '@/core/datetime';

export interface AppContext {
  db: DatabaseAdapter;
  transactionRepo: TransactionRepository;
  categoryRepo: CategoryRepository;
  accountRepo: AccountRepository;
  statsRepo: StatsRepository;
  recurringRepo: RecurringRepository;
  budgetRepo: BudgetRepository;
  settingsRepo: SettingsRepository;
}

let appCtx: AppContext | null = null;
const SEED_FLAG_KEY = 'bookkeeping_seeded_v2';
const TIME_MIGRATED_KEY = 'bookkeeping_time_migrated_v1';
const BUDGET_MIGRATED_KEY = 'bookkeeping_budget_migrated_v1';
const LEGACY_BUDGET_KEY = 'bk_budget';
const LEGACY_ACCOUNT_KEY = 'bk_default_acc';
const SETTINGS_ACCOUNT_KEY = 'default_account_id';

/**
 * 一次性迁移：把历史账单的 UTC 日期/时间纠正为本地时间（+8 小时）
 * 旧版本用 UTC 存 date/time，导致每天 8 点才翻篇
 */
async function migrateTransactionTime(db: DatabaseAdapter): Promise<void> {
  const txs = await db.query<{ id: string; date: string; time: string }>(
    'SELECT id, date, time FROM transactions WHERE deleted_at IS NULL',
  );
  for (const tx of txs) {
    const utc = new Date(`${tx.date}T${tx.time}Z`);
    if (isNaN(utc.getTime())) continue;
    const localDate = `${utc.getFullYear()}-${String(utc.getMonth() + 1).padStart(2, '0')}-${String(utc.getDate()).padStart(2, '0')}`;
    const localTime = `${String(utc.getHours()).padStart(2, '0')}:${String(utc.getMinutes()).padStart(2, '0')}:${String(utc.getSeconds()).padStart(2, '0')}`;
    if (localDate !== tx.date || localTime !== tx.time) {
      await db.execute('UPDATE transactions SET date = ?, time = ? WHERE id = ?', [localDate, localTime, tx.id]);
    }
  }
}

/**
 * 处理到期的周期账单：生成交易并推进下次执行日期
 * 最多补记 12 期，避免长时间未打开导致大量补记
 */
async function processRecurring(transactionRepo: TransactionRepository, recurringRepo: RecurringRepository): Promise<void> {
  const today = todayLocal();
  const due = await recurringRepo.getDueRules(today);
  for (const rule of due) {
    let next = rule.nextRun;
    let count = 0;
    while (next <= today && count < 12) {
      try {
        await transactionRepo.create({
          type: rule.type,
          amountInYuan: rule.amount / 100,
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          note: rule.note,
          date: next,
          time: '00:00:00',
          recurringId: rule.id,
        } as Parameters<TransactionRepository['create']>[0]);
      } catch { /* 忽略单条失败，继续 */ }
      next = advanceNextRun(next, rule.frequency, rule.interval);
      count++;
    }
    await recurringRepo.setNextRun(rule.id, next);
  }
  if (due.length > 0) persistDatabase();
}

/**
 * 初始化应用数据层
 *
 * 流程:
 * 1. 加载/创建 SQLite 数据库 (支持 localStorage 恢复)
 * 2. 首次启动时安装种子数据 (预设账本/分类/账户)
 * 3. 一次性迁移历史时间数据（UTC → 本地）
 * 4. 创建 Repository 实例
 * 5. 处理到期的周期账单
 */
export async function initializeApp(): Promise<AppContext> {
  if (appCtx) return appCtx;

  const db = await getDatabase();

  // 仅首次启动安装种子数据（用 localStorage 标记，避免每次查库）
  const seeded = localStorage.getItem(SEED_FLAG_KEY);
  if (!seeded) {
    const needSeed = !(await isSeedInstalled(db));
    if (needSeed) {
      await installSeed(db);
    }
    localStorage.setItem(SEED_FLAG_KEY, '1');
  }

  // 一次性迁移历史时间数据
  if (!localStorage.getItem(TIME_MIGRATED_KEY)) {
    await migrateTransactionTime(db);
    localStorage.setItem(TIME_MIGRATED_KEY, '1');
    persistDatabase();
  }

  // 创建 Repository
  const transactionRepo = createTransactionRepository(db);
  const categoryRepo = new CategoryRepository(db);
  const accountRepo = new AccountRepository(db);
  const statsRepo = new StatsRepository(db);
  const recurringRepo = new RecurringRepository(db);
  const budgetRepo = new BudgetRepository(db);
  const settingsRepo = new SettingsRepository(db);

  appCtx = { db, transactionRepo, categoryRepo, accountRepo, statsRepo, recurringRepo, budgetRepo, settingsRepo };

  // 迁移旧的 localStorage 预算到 SQLite
  if (!localStorage.getItem(BUDGET_MIGRATED_KEY)) {
    const legacy = localStorage.getItem(LEGACY_BUDGET_KEY);
    if (legacy) {
      const v = parseFloat(legacy);
      if (!isNaN(v) && v > 0) {
        await budgetRepo.setTotalBudget(todayLocal().slice(0, 7), v);
      }
      localStorage.removeItem(LEGACY_BUDGET_KEY);
    }
    localStorage.setItem(BUDGET_MIGRATED_KEY, '1');
  }

  // 迁移旧的 localStorage 默认账户到 settings 表
  const legacyAccount = localStorage.getItem(LEGACY_ACCOUNT_KEY);
  if (legacyAccount) {
    const existing = await settingsRepo.get(SETTINGS_ACCOUNT_KEY);
    if (!existing) await settingsRepo.set(SETTINGS_ACCOUNT_KEY, legacyAccount);
    localStorage.removeItem(LEGACY_ACCOUNT_KEY);
  }

  // 处理到期的周期账单（自动补记）
  await processRecurring(transactionRepo, recurringRepo);

  return appCtx;
}

/** 获取应用上下文 */
export function getAppContext(): AppContext {
  if (!appCtx) throw new Error('App not initialized. Call initializeApp() first.');
  return appCtx;
}

/** 是否已初始化 */
export function isAppInitialized(): boolean {
  return appCtx !== null;
}
