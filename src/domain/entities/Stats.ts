/**
 * 统计结果类型（domain 层，N-3：从 repository 上移，UI 不再 type-import 具体实现类）
 */
import type { UUID } from '@/core/types';

/** 月度/年度收支汇总 */
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
