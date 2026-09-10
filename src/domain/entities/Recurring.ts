/**
 * 周期规则类型（domain 层实体，N-3：从 repository 上移）
 */
import type { UUID, TransactionType } from '@/core/types';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule {
  id: UUID;
  ledgerId: UUID;
  type: TransactionType;
  /** 金额（分） */
  amount: number;
  accountId: UUID;
  categoryId: UUID | null;
  note: string;
  frequency: Frequency;
  /** 每 N 个周期执行一次 */
  interval: number;
  /** 下次执行日期 (YYYY-MM-DD) */
  nextRun: string;
  startDate: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringInput {
  type: TransactionType;
  amountInYuan: number;
  accountId: UUID;
  categoryId?: UUID | null;
  note?: string;
  frequency: Frequency;
  interval?: number;
  nextRun: string;
}
