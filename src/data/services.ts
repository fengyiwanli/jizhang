/**
 * 数据服务层（A-1）
 *
 * UI 一律通过 services 访问数据，不再直接调用 getAppContext：
 * - 写操作自动 emit 对应 topic → 其它页面用 useDataVersion(topic) 自动刷新
 * - 同时提供「语义名」(services.transaction) 与「仓库同名别名」(services.transactionRepo)，
 *   迁移时只需把取 context 的调用换成 services，方法名与参数完全不变，零行为改动
 * - db 也借此透出（导出/备份等场景）
 *
 * 注意：只有本文件允许访问 AppContext。
 */
import { getAppContext } from './init';
import { dataEvents, type DataTopic } from './dataEvents';
import type { TransactionRepository } from './repositories/TransactionRepository';
import type { CategoryRepository } from './repositories/CategoryRepository';
import type { AccountRepository } from './repositories/AccountRepository';
import type { BudgetRepository } from './repositories/BudgetRepository';
import type { RecurringRepository } from './repositories/RecurringRepository';
import type { SettingsRepository } from './repositories/SettingsRepository';
import type { StatsRepository } from './repositories/StatsRepository';

const REGISTRY: Record<string, { ctxKey: string; topic: DataTopic; writes: string[] }> = {
  transactionRepo: { ctxKey: 'transactionRepo', topic: 'transactions', writes: ['create', 'update', 'delete', 'restore', 'clearAll'] },
  categoryRepo: { ctxKey: 'categoryRepo', topic: 'categories', writes: ['create', 'update', 'delete', 'restore', 'clearAll'] },
  accountRepo: { ctxKey: 'accountRepo', topic: 'accounts', writes: ['create', 'update', 'delete', 'restore', 'clearAll'] },
  budgetRepo: { ctxKey: 'budgetRepo', topic: 'budgets', writes: ['setTotalBudget', 'removeTotalBudget', 'setCategoryBudget', 'removeCategoryBudget', 'clearAll'] },
  recurringRepo: { ctxKey: 'recurringRepo', topic: 'recurring', writes: ['create', 'update', 'delete', 'toggle', 'setNextRun'] },
  settingsRepo: { ctxKey: 'settingsRepo', topic: 'settings', writes: ['set', 'remove', 'clearAll'] },
  statsRepo: { ctxKey: 'statsRepo', topic: 'transactions', writes: [] },
};

type AnyRepo = Record<string, unknown>;

const cache = new Map<string, AnyRepo>();

function build(name: string): AnyRepo {
  const reg = REGISTRY[name]!;
  const repo = (getAppContext() as unknown as Record<string, AnyRepo>)[reg.ctxKey];
  const out: AnyRepo = {};
  for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(repo))) {
    if (key === 'constructor') continue;
    const fn = repo[key];
    if (typeof fn !== 'function') continue;
    if (reg.writes.includes(key)) {
      out[key] = async (...args: unknown[]) => {
        const result = await (fn as (...a: unknown[]) => Promise<unknown>).apply(repo, args);
        dataEvents.emit(reg.topic);
        return result;
      };
    } else {
      out[key] = (...args: unknown[]) => (fn as (...a: unknown[]) => unknown).apply(repo, args);
    }
  }
  return out;
}

function svc(name: string): AnyRepo {
  let inst = cache.get(name);
  if (!inst) { inst = build(name); cache.set(name, inst); }
  return inst;
}

export const services = {
  /* 语义名（强类型，方法签名与仓库一致） */
  get transaction(): TransactionRepository { return svc('transactionRepo') as unknown as TransactionRepository; },
  get category(): CategoryRepository { return svc('categoryRepo') as unknown as CategoryRepository; },
  get account(): AccountRepository { return svc('accountRepo') as unknown as AccountRepository; },
  get budget(): BudgetRepository { return svc('budgetRepo') as unknown as BudgetRepository; },
  get recurring(): RecurringRepository { return svc('recurringRepo') as unknown as RecurringRepository; },
  get settings(): SettingsRepository { return svc('settingsRepo') as unknown as SettingsRepository; },
  get stats(): StatsRepository { return svc('statsRepo') as unknown as StatsRepository; },

  /* 仓库同名别名（迁移过渡用，方法签名与仓库一致） */
  get transactionRepo(): TransactionRepository { return svc('transactionRepo') as unknown as TransactionRepository; },
  get categoryRepo(): CategoryRepository { return svc('categoryRepo') as unknown as CategoryRepository; },
  get accountRepo(): AccountRepository { return svc('accountRepo') as unknown as AccountRepository; },
  get budgetRepo(): BudgetRepository { return svc('budgetRepo') as unknown as BudgetRepository; },
  get recurringRepo(): RecurringRepository { return svc('recurringRepo') as unknown as RecurringRepository; },
  get settingsRepo(): SettingsRepository { return svc('settingsRepo') as unknown as SettingsRepository; },
  get statsRepo(): StatsRepository { return svc('statsRepo') as unknown as StatsRepository; },

  /* 数据库适配器（导出/备份/清数据用） */
  get db() { return getAppContext().db; },
};

/** 测试或清数据后 context 重建时调用 */
export function resetServicesCache(): void {
  cache.clear();
}
