/**
 * 预算 Repository
 *
 * 支持总预算 + 分类预算，按年月存储
 */
import type { DatabaseAdapter } from '../database/DatabaseAdapter';
import { persistDatabase } from '../database/context';
import type { UUID } from '@/core/types';
import { generateUUID } from '@/core/uuid';
import { nowUTC } from '@/core/datetime';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';

export interface Budget {
  id: UUID;
  ledgerId: UUID;
  yearMonth: string;
  categoryId: UUID | null;
  amount: number; // 分
  createdAt: string;
  updatedAt: string;
}

export interface CategoryBudget {
  categoryId: UUID;
  amount: number; // 分
}

export class BudgetRepository {
  constructor(private db: DatabaseAdapter) {}

  /** 获取总预算（分），未设置返回 null */
  async getTotalBudget(yearMonth: string, ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<number | null> {
    const rows = await this.db.query<{ amount: number }>(
      'SELECT amount FROM budgets WHERE ledger_id = ? AND year_month = ? AND category_id IS NULL LIMIT 1',
      [ledgerId, yearMonth],
    );
    return rows[0]?.amount ?? null;
  }

  /** 获取某月支出总额（分），SQL 聚合 */
  async getMonthSpent(yearMonth: string, ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<number> {
    const rows = await this.db.query<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE type = 'expense' AND date LIKE ? AND deleted_at IS NULL AND ledger_id = ?`,
      [`${yearMonth}%`, ledgerId],
    );
    return rows[0]?.total ?? 0;
  }

  /** 设置总预算 */
  async setTotalBudget(yearMonth: string, amountInYuan: number, ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<void> {
    const amount = Math.round(amountInYuan * 100);
    const existing = await this.db.query<{ id: UUID }>(
      'SELECT id FROM budgets WHERE ledger_id = ? AND year_month = ? AND category_id IS NULL',
      [ledgerId, yearMonth],
    );
    if (existing[0]) {
      await this.db.execute(
        'UPDATE budgets SET amount = ?, updated_at = ? WHERE id = ?',
        [amount, nowUTC(), existing[0].id],
      );
    } else {
      await this.db.execute(
        'INSERT INTO budgets (id, ledger_id, year_month, category_id, amount, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?)',
        [generateUUID(), ledgerId, yearMonth, amount, nowUTC(), nowUTC()],
      );
    }
    persistDatabase();
  }

  /** 删除总预算 */
  async removeTotalBudget(yearMonth: string, ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<void> {
    await this.db.execute(
      'DELETE FROM budgets WHERE ledger_id = ? AND year_month = ? AND category_id IS NULL',
      [ledgerId, yearMonth],
    );
    persistDatabase();
  }

  /** 获取所有分类预算 */
  async listCategoryBudgets(yearMonth: string, ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<CategoryBudget[]> {
    return this.db.query<CategoryBudget>(
      'SELECT category_id as categoryId, amount FROM budgets WHERE ledger_id = ? AND year_month = ? AND category_id IS NOT NULL',
      [ledgerId, yearMonth],
    );
  }

  /** 设置分类预算 */
  async setCategoryBudget(yearMonth: string, categoryId: UUID, amountInYuan: number, ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<void> {
    const amount = Math.round(amountInYuan * 100);
    const existing = await this.db.query<{ id: UUID }>(
      'SELECT id FROM budgets WHERE ledger_id = ? AND year_month = ? AND category_id = ?',
      [ledgerId, yearMonth, categoryId],
    );
    if (existing[0]) {
      await this.db.execute(
        'UPDATE budgets SET amount = ?, updated_at = ? WHERE id = ?',
        [amount, nowUTC(), existing[0].id],
      );
    } else {
      await this.db.execute(
        'INSERT INTO budgets (id, ledger_id, year_month, category_id, amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [generateUUID(), ledgerId, yearMonth, categoryId, amount, nowUTC(), nowUTC()],
      );
    }
    persistDatabase();
  }

  /** 删除分类预算 */
  async removeCategoryBudget(yearMonth: string, categoryId: UUID, ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<void> {
    await this.db.execute(
      'DELETE FROM budgets WHERE ledger_id = ? AND year_month = ? AND category_id = ?',
      [ledgerId, yearMonth, categoryId],
    );
    persistDatabase();
  }

  async clearAll(): Promise<void> {
    await this.db.execute('DELETE FROM budgets');
  }
}
