/**
 * 统计查询 Repository
 *
 * 提供聚合统计查询：月度汇总、分类占比、每日趋势
 */
import type { DatabaseAdapter } from '../database/DatabaseAdapter';
import type { UUID, TransactionType } from '@/core/types';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';

/** 月度收支汇总 */
export interface MonthlySummary {
  totalExpense: number;
  totalIncome: number;
  transactionCount: number;
}

/** 分类统计 */
export interface CategoryStat {
  categoryId: UUID;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  percentage: number;
  count: number;
}

/** 每日趋势 */
export interface DailyTrend {
  date: string;
  expense: number;
  income: number;
  count: number;
}

export class StatsRepository {
  constructor(private db: DatabaseAdapter) {}

  /** 月度收支总览 */
  async getMonthlySummary(
    yearMonth: string,
    ledgerId: UUID = DEFAULT_LEDGER_ID,
  ): Promise<MonthlySummary> {
    const rows = await this.db.query<{
      totalExpense: number;
      totalIncome: number;
      transactionCount: number;
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
        COUNT(*) as transactionCount
      FROM transactions
      WHERE ledger_id = ? AND date LIKE ? AND deleted_at IS NULL`,
      [ledgerId, `${yearMonth}%`],
    );
    return rows[0] ?? { totalExpense: 0, totalIncome: 0, transactionCount: 0 };
  }

  /** 分类统计 */
  async getCategoryStats(
    yearMonth: string,
    type: 'expense' | 'income' = 'expense',
    ledgerId: UUID = DEFAULT_LEDGER_ID,
  ): Promise<CategoryStat[]> {
    const rows = await this.db.query<{
      categoryId: UUID;
      categoryName: string;
      categoryIcon: string;
      categoryColor: string;
      amount: number;
      count: number;
    }>(
      `SELECT
        t.category_id as categoryId,
        c.name as categoryName,
        c.icon as categoryIcon,
        c.color as categoryColor,
        SUM(t.amount) as amount,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.ledger_id = ? AND t.date LIKE ? AND t.type = ? AND t.deleted_at IS NULL
        AND t.category_id IS NOT NULL
      GROUP BY t.category_id
      ORDER BY amount DESC`,
      [ledgerId, `${yearMonth}%`, type],
    );

    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    return rows.map((r) => ({
      ...r,
      categoryIcon: r.categoryIcon ?? '📦',
      categoryColor: r.categoryColor ?? '#B0B0B0',
      percentage: total > 0 ? Math.round((r.amount / total) * 1000) / 10 : 0,
    }));
  }

  /** 每日趋势 (折线图) */
  async getDailyTrend(
    yearMonth: string,
    ledgerId: UUID = DEFAULT_LEDGER_ID,
  ): Promise<DailyTrend[]> {
    return this.db.query<DailyTrend>(
      `SELECT
        date,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COUNT(*) as count
      FROM transactions
      WHERE ledger_id = ? AND date LIKE ? AND deleted_at IS NULL
      GROUP BY date
      ORDER BY date ASC`,
      [ledgerId, `${yearMonth}%`],
    );
  }

  /** 年度月度趋势 */
  async getYearlyTrend(
    year: string,
    ledgerId: UUID = DEFAULT_LEDGER_ID,
  ): Promise<Array<{ month: string; totalExpense: number; totalIncome: number }>> {
    const rows = await this.db.query<{
      month: string;
      totalExpense: number;
      totalIncome: number;
    }>(
      `SELECT
        SUBSTR(date, 1, 7) as month,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome
      FROM transactions
      WHERE ledger_id = ? AND date LIKE ? AND deleted_at IS NULL
      GROUP BY month
      ORDER BY month ASC`,
      [ledgerId, `${year}%`],
    );
    return rows;
  }

  /** 获取某日的交易明细 */
  async getDailyTransactions(
    date: string,
    ledgerId: UUID = DEFAULT_LEDGER_ID,
  ) {
    return this.db.query<{
      id: UUID;
      type: TransactionType;
      amount: number;
      categoryId: UUID | null;
      categoryName: string | null;
      categoryIcon: string | null;
      accountId: UUID;
      accountName: string | null;
      accountIcon: string | null;
      note: string;
      time: string;
    }>(
      `SELECT
        t.id, t.type, t.amount, t.note, t.time,
        t.category_id as categoryId,
        c.name as categoryName, c.icon as categoryIcon,
        t.account_id as accountId,
        a.name as accountName, a.icon as accountIcon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.ledger_id = ? AND t.date = ? AND t.deleted_at IS NULL
      ORDER BY t.time DESC`,
      [ledgerId, date],
    );
  }

  /** 年度总览 */
  async getYearlySummary(
    year: string,
    ledgerId: UUID = DEFAULT_LEDGER_ID,
  ): Promise<MonthlySummary> {
    const rows = await this.db.query<{
      totalExpense: number;
      totalIncome: number;
      transactionCount: number;
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
        COUNT(*) as transactionCount
      FROM transactions
      WHERE ledger_id = ? AND date LIKE ? AND deleted_at IS NULL`,
      [ledgerId, `${year}%`],
    );
    return rows[0] ?? { totalExpense: 0, totalIncome: 0, transactionCount: 0 };
  }

  /** 年度分类统计 */
  async getYearlyCategoryStats(
    year: string,
    type: 'expense' | 'income' = 'expense',
    ledgerId: UUID = DEFAULT_LEDGER_ID,
  ): Promise<CategoryStat[]> {
    const rows = await this.db.query<{
      categoryId: UUID;
      categoryName: string;
      categoryIcon: string;
      categoryColor: string;
      amount: number;
      count: number;
    }>(
      `SELECT
        t.category_id as categoryId,
        c.name as categoryName,
        c.icon as categoryIcon,
        c.color as categoryColor,
        SUM(t.amount) as amount,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.ledger_id = ? AND t.date LIKE ? AND t.type = ? AND t.deleted_at IS NULL
        AND t.category_id IS NOT NULL
      GROUP BY t.category_id
      ORDER BY amount DESC`,
      [ledgerId, `${year}%`, type],
    );

    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    return rows.map((r) => ({
      ...r,
      categoryIcon: r.categoryIcon ?? '📦',
      categoryColor: r.categoryColor ?? '#B0B0B0',
      percentage: total > 0 ? Math.round((r.amount / total) * 1000) / 10 : 0,
    }));
  }
}
