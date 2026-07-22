/**
 * 应用初始化模块
 *
 * 统一管理数据库初始化、种子数据安装和 Repository 创建
 */
import { getDatabase } from './database/context';
import { installSeed, isSeedInstalled } from './seed';
import { createTransactionRepository } from './repositories/TransactionRepository';
import { CategoryRepository } from './repositories/CategoryRepository';
import { AccountRepository } from './repositories/AccountRepository';
import { StatsRepository } from './repositories/StatsRepository';
import type { TransactionRepository } from './repositories/TransactionRepository';
import type { DatabaseAdapter } from './database/DatabaseAdapter';

export interface AppContext {
  db: DatabaseAdapter;
  transactionRepo: TransactionRepository;
  categoryRepo: CategoryRepository;
  accountRepo: AccountRepository;
  statsRepo: StatsRepository;
}

let appCtx: AppContext | null = null;

/**
 * 初始化应用数据层
 *
 * 流程:
 * 1. 加载/创建 SQLite 数据库 (支持 localStorage 恢复)
 * 2. 检查并安装种子数据 (预设账本/分类/账户)
 * 3. 创建 Repository 实例
 */
export async function initializeApp(): Promise<AppContext> {
  if (appCtx) return appCtx;

  const db = await getDatabase();

  // 检查是否需要安装种子数据
  const seeded = await isSeedInstalled(db);
  if (!seeded) {
    await installSeed(db);
  }

  // 创建 Repository
  const transactionRepo = createTransactionRepository(db);
  const categoryRepo = new CategoryRepository(db);
  const accountRepo = new AccountRepository(db);
  const statsRepo = new StatsRepository(db);

  appCtx = { db, transactionRepo, categoryRepo, accountRepo, statsRepo };
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
