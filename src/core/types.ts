/**
 * 核心类型定义
 * 严格遵循文档第 13 节约束条件
 */

/** UUID v7 字符串 (时间有序) */
export type UUID = string;

/**
 * 金额 - 以「分」为单位的整数存储，避免浮点精度问题
 * 约束: 使用 decimal 类型，不可用 float (13.2 第5条)
 */
export type Money = number; // 单位: 分 (整数)

/** ISO 8601 UTC 日期时间字符串 (约束 13.2 第6条: 所有时间存储 UTC) */
export type UTCDateTime = string;

/** 交易类型 */
export type TransactionType = 'income' | 'expense' | 'transfer';

/** 账户类型 */
export type AccountType = 'cash' | 'bank' | 'credit' | 'e-wallet';

/** 同步状态 */
export type SyncStatus = 'pending' | 'synced' | 'conflict';

/** 操作类型 */
export type OperationType = 'create' | 'update' | 'delete';

/**
 * 金额工具函数
 */
export const MoneyUtils = {
  /** 从元转分 */
  fromYuan(yuan: number): Money {
    return Math.round(yuan * 100);
  },

  /** 从分转元 */
  toYuan(cents: Money): number {
    return cents / 100;
  },

  /** 格式化金额显示 (¥1,234.56) */
  format(cents: Money): string {
    const yuan = Math.abs(cents) / 100;
    const sign = cents < 0 ? '-' : '';
    return `${sign}¥${yuan.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  /** 加法 (分) */
  add(a: Money, b: Money): Money {
    return a + b;
  },

  /** 减法 (分) */
  subtract(a: Money, b: Money): Money {
    return a - b;
  },

  /** 零值 */
  ZERO: 0 as Money,
};
