/**
 * 交易展示格式化（纯函数，N-3：从 data 层下沉，UI 可直接依赖）
 */
import { MoneyUtils } from '@/core/types';
import type { Transaction } from '@/domain/entities/Transaction';

export interface TransactionDisplay {
  amountDisplay: string;
  typeLabel: string;
  dateDisplay: string;
  tagsList: string[];
}

const TYPE_LABELS: Record<string, string> = {
  income: '收入',
  expense: '支出',
  transfer: '转账',
};

/** 格式化 Transaction 用于显示 */
export function formatTransaction(tx: Transaction): TransactionDisplay {
  let parsedTags: string[] = [];
  try {
    parsedTags = JSON.parse(tx.tags);
  } catch { /* ignore */ }

  return {
    amountDisplay: MoneyUtils.format(tx.amount),
    typeLabel: TYPE_LABELS[tx.type] ?? tx.type,
    dateDisplay: tx.date,
    tagsList: parsedTags,
  };
}
