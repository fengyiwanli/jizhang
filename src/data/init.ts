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
const SEED_FLAG_KEY = 'bookkeeping_seeded_v2';

/**
 * 初始化应用数据层
 *
 * 流程:
 * 1. 加载/创建 SQLite 数据库 (支持 localStorage 恢复)
 * 2. 首次启动时安装种子数据 (预设账本/分类/账户)
 * 3. 创建 Repository 实例
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
